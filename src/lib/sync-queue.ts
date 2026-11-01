import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    applyStockMovement,
    insertDebt,
    insertSale,
    removeProduct,
    syncProductChange,
    upsertPurchaseOrder,
    updateDebtPayment,
    upsertCustomer,
    voidSale,
} from "./supabase-store";

export type SyncOpType = "SALE" | "MOVEMENT" | "PRODUCT" | "DEBT" | "DEBT_PAYMENT" | "VOID_SALE" | "PURCHASE_ORDER";

export interface SyncQueueItem {
  id: string;
  type: SyncOpType;
  payload: any;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}

function stableSaleItemId(saleId: string, index: number): string {
  const hex = saleId.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    throw new Error("Queued sale has an invalid ID; cannot safely retry its line items.");
  }

  const itemIndex = index.toString(16).padStart(12, "0").slice(-12);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${itemIndex}`;
}

const SYNC_QUEUE_KEY = "@stocktrack_sync_queue";
const SYNC_CACHE_KEY_PREFIX = "@stocktrack_cache_v2_";
const LEGACY_CACHE_KEYS = ["products", "movements", "notifications", "sales", "customers", "debts"]
  .map((key) => `@stocktrack_cache_${key}`);
let activeStoreId = "";
let activeCacheScope = "";
let queueLock: Promise<void> = Promise.resolve();

type Listener = { storeId: string; callback: (count: number) => void };
const listeners = new Set<Listener>();

async function withQueueLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = queueLock;
  let release!: () => void;
  queueLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

function notify(storeId: string) {
  void getPendingSyncCount(storeId).then((count) => listeners.forEach(({ storeId: listenerStoreId, callback }) => {
    if (listenerStoreId !== storeId) return;
    try {
      callback(count);
    } catch {
      /* ignore */
    }
  })).catch((error) => console.error("Could not refresh offline sync queue count:", error));
}

export function subscribeSyncQueue(callback: (count: number) => void, storeId = activeStoreId): () => void {
  const listener = { storeId, callback };
  listeners.add(listener);
  void getPendingSyncCount(storeId).then(callback)
    .catch((error) => console.error("Could not load offline sync queue count:", error));
  return () => {
    listeners.delete(listener);
  };
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`The offline sync queue is unreadable and was preserved: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("The offline sync queue has an invalid format and was preserved.");
  }
  return parsed as SyncQueueItem[];
}

export function setSyncQueueStoreId(storeId: string): void {
  activeStoreId = storeId;
}

export function setOfflineCacheScope(scope: string): void {
  activeCacheScope = scope;
}

export function getOfflineCacheScope(): string {
  return activeCacheScope;
}

export async function getPendingSyncCount(storeId = activeStoreId): Promise<number> {
  const queue = await getSyncQueue();
  return storeId ? queue.filter((item) => item.payload?.storeId === storeId).length : queue.length;
}

export async function enqueueSyncOp(type: SyncOpType, payload: any): Promise<void> {
  const storeId = typeof payload?.storeId === "string" ? payload.storeId : "";
  if (!storeId) throw new Error("Cannot queue an offline operation without a store ID.");

  await withQueueLock(async () => {
    const queue = await getSyncQueue();
    const item: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    queue.push(item);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  });
  notify(storeId);
}

export async function clearSyncQueue(storeId = activeStoreId): Promise<void> {
  await withQueueLock(async () => {
    const queue = await getSyncQueue();
    const remaining = queue.filter((item) => item.payload?.storeId !== storeId);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  });
  notify(storeId);
}

export async function processSyncQueue(storeId = activeStoreId): Promise<{
  successCount: number;
  failedCount: number;
  remainingCount: number;
  failedItems: { type: SyncOpType; error: string }[];
}> {
  if (!storeId) {
    return { successCount: 0, failedCount: 0, remainingCount: await getPendingSyncCount(), failedItems: [] };
  }

  return withQueueLock(async () => {
    const allItems = await getSyncQueue();
      const queue = allItems.filter((item) => item.payload?.storeId === storeId);
      let successCount = 0;
      let failedCount = 0;
      const nextQueue: SyncQueueItem[] = allItems.filter((item) => item.payload?.storeId !== storeId);

      for (const item of queue) {
    item.attempts += 1;
    item.lastAttemptAt = new Date().toISOString();

    let success = false;
    try {
      switch (item.type) {
        case "SALE": {
          const { storeId, userId, sale, movements } = item.payload;
          sale.items = sale.items.map((saleItem: { id?: string }, index: number) => ({
            ...saleItem,
            id: saleItem.id ?? stableSaleItemId(sale.id, index),
          }));
          const res = await insertSale(storeId, userId, sale);
          if (res.success) {
            let relatedWritesSucceeded = true;
            if (movements && Array.isArray(movements)) {
              for (const m of movements) {
                const result = await applyStockMovement(storeId, m);
                relatedWritesSucceeded = result.success && relatedWritesSucceeded;
                if (!result.success) item.lastError = result.error;
              }
            }
            success = relatedWritesSucceeded;
          } else {
            item.lastError = res.error ?? "The sale or its line items could not be saved.";
          }
          break;
        }

        case "MOVEMENT": {
          const { storeId, movement } = item.payload;
          const result = await applyStockMovement(storeId, movement);
          success = result.success;
          if (!result.success) item.lastError = result.error;
          break;
        }

        case "PRODUCT": {
          const { storeId, product, deleted, stockDelta = 0, createIfMissing = false } = item.payload;
          if (deleted) {
            success = await removeProduct(product.id);
          } else {
            const result = await syncProductChange(storeId, product, stockDelta, item.id, createIfMissing);
            success = result.success;
            if (!result.success) item.lastError = result.error;
          }
          break;
        }

        case "DEBT": {
          const { storeId, debt, customer } = item.payload;
          const okCustomer = customer ? await upsertCustomer(storeId, customer) : true;
          success = okCustomer && await insertDebt(storeId, debt);
          break;
        }

        case "DEBT_PAYMENT": {
          const { storeId, debtId, customerId, payment, newAmountPaid, newBalance, newStatus } =
            item.payload;
          success = await updateDebtPayment(
            storeId,
            debtId,
            customerId,
            payment,
            newAmountPaid,
            newBalance,
            newStatus,
          );
          break;
        }

        case "PURCHASE_ORDER": {
          const { order } = item.payload;
          success = await upsertPurchaseOrder(order);
          break;
        }

        case "VOID_SALE": {
          const { storeId, saleId, reason, voidedBy, movements } = item.payload;
          const okVoid = await voidSale(storeId, saleId, reason, voidedBy);
          if (okVoid) {
            let relatedWritesSucceeded = true;
            if (movements && Array.isArray(movements)) {
              for (const m of movements) {
                const result = await applyStockMovement(storeId, m);
                relatedWritesSucceeded = result.success && relatedWritesSucceeded;
                if (!result.success) item.lastError = result.error;
              }
            }
            success = relatedWritesSucceeded;
          } else {
            item.lastError = "voidSale returned false";
          }
          break;
        }
      }
    } catch (err: any) {
      item.lastError = err?.message || String(err);
      success = false;
    }

        if (success) {
          successCount++;
        } else {
          item.lastError ??= `${item.type} could not be saved. Check your connection and store access, then try again.`;
          failedCount++;
          nextQueue.push(item);
        }
      }

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(nextQueue));
      notify(storeId);

    return {
      successCount,
      failedCount,
      remainingCount: nextQueue.filter((item) => item.payload?.storeId === storeId).length,
      failedItems: nextQueue
        .filter((item) => item.payload?.storeId === storeId)
        .map((item) => ({ type: item.type, error: item.lastError ?? "Unknown sync error" })),
    };
  });
}

// ─── Offline Local Cache Helpers ─────────────────────────────────────────────

export async function saveOfflineCache<T>(scope: string, key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`${SYNC_CACHE_KEY_PREFIX}${encodeURIComponent(scope)}_${key}`, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export async function loadOfflineCache<T>(scope: string, key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${SYNC_CACHE_KEY_PREFIX}${encodeURIComponent(scope)}_${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearLegacyOfflineCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(LEGACY_CACHE_KEYS);
  } catch {
    /* ignore */
  }
}

export async function clearOfflineCache(scope = activeCacheScope): Promise<void> {
  if (!scope) return;
  try {
    const prefix = `${SYNC_CACHE_KEY_PREFIX}${encodeURIComponent(scope)}_`;
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(prefix)));
  } catch {
    /* ignore */
  }
}
