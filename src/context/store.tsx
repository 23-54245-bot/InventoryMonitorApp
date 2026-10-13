import * as Crypto from "expo-crypto";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { AppLanguage } from "../lib/i18n";
import { showAlert } from "../lib/alert";

import {
    AuditLog,
    CartItem,
    CashShift,
    Customer,
    Debt,
    DebtPayment,
    findProductBySku,
    FreshMartState,
    getCategoryBreakdown,
    getDashboardSummary,
    getNotifications,
    getRecentActivity,
    getWeeklyActivitySeries,
    NotificationItem,
    PaymentMethod,
    Product,
    ProductBatch,
    SaleItem,
    SaleTransaction,
    StockMovement,
    StorePaymentQRs,
    TeamMember,
} from "../data/freshmart";
import { readStoredString, writeStoredString } from "../lib/storage";
import { supabase } from "../lib/supabase";
import {
    closeCashShift,
    fetchAuditLogs,
    fetchBatches,
    fetchCashShifts,
    fetchCustomers,
    fetchDebtPayments,
    fetchDebts,
    fetchMovements,
    fetchNotifications,
    fetchProducts,
    fetchSales,
    insertAuditLog,
    insertCashShift,
    insertNotification,
    removeBatch,
    removeCustomer,
    removeNotification,
    removeProduct,
    resolveStoreMediaUri,
    updateAllNotificationsRead,
    updateNotificationRead,
    updateStoreQRs,
    upsertBatch,
    upsertCustomer
} from "../lib/supabase-store";
import {
    clearLegacyOfflineCache,
    enqueueSyncOp,
    getOfflineCacheScope,
    loadOfflineCache,
    processSyncQueue,
    saveOfflineCache,
    setOfflineCacheScope,
    setSyncQueueStoreId,
    type SyncOpType,
} from "../lib/sync-queue";
import { useAuth, type AuthSession } from "./auth";

type StoreContextValue = {
  isStoreReady: boolean;
  state: FreshMartState;
  summary: ReturnType<typeof getDashboardSummary>;
  categoryBreakdown: ReturnType<typeof getCategoryBreakdown>;
  weeklyActivity: ReturnType<typeof getWeeklyActivitySeries>;
  notifications: NotificationItem[];
  recentActivity: ReturnType<typeof getRecentActivity>;
  teamMembers: TeamMember[];
  sales: SaleTransaction[];
  customers: Customer[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  auditLogs: AuditLog[];
  batches: ProductBatch[];
  shifts: CashShift[];
  currentShift: CashShift | null;
  processCheckout: (checkoutData: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    amountTendered: number;
    discount?: number;
    tax?: number;
    note?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    dueDate?: string;
    referenceNumber?: string;
    splitCashAmount?: number;
    splitOtherAmount?: number;
    splitOtherMethod?: "e_wallet" | "credit";
    redeemedPoints?: number;
  }) => Promise<{ success: boolean; sale?: SaleTransaction; error?: string }>;
  voidSale: (saleId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  loadSales: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  getProductBySku: (sku: string) => Product | undefined;
  stockIn: (productId: string, quantity: number, performedBy?: string, note?: string, timestamp?: string) => void;
  stockOut: (productId: string, quantity: number, performedBy?: string, note?: string, timestamp?: string, reason?: "sale" | "damaged" | "expired" | "adjustment") => void;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, patch: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  addBatch: (batch: Omit<ProductBatch, "id" | "createdAt">) => Promise<boolean>;
  deleteBatch: (batchId: string) => Promise<boolean>;
  openShift: (openingFloat: number) => Promise<boolean>;
  closeShift: (countedCash: number, notes?: string) => Promise<boolean>;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  toggleNotificationPreference: () => void;
  toggleBiometricPreference: () => void;
  toggleDarkMode: () => void;
  setLanguage: (language: AppLanguage) => void;
  updateUserProfile: (patch: Partial<Pick<FreshMartState["user"], "name" | "username" | "email" | "storeEmail" | "phone" | "address" | "storeName" | "businessHours" | "permitNumber" | "avatarUri" | "avatarInitials" | "storeQRs">>) => void;
  updateTeamMemberAccess: (memberId: string, accessLevel: "Admin" | "Staff" | "Viewer") => void;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "updatedAt" | "totalDebt" | "loyaltyPoints">) => Promise<Customer>;
  updateCustomer: (customerId: string, patch: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (customerId: string) => Promise<boolean>;
  addDebt: (debt: Omit<Debt, "id" | "amountPaid" | "balance" | "status" | "createdAt" | "updatedAt">) => Promise<Debt>;
  recordDebtPayment: (paymentData: {
    debtId: string;
    customerId: string;
    amount: number;
    paymentMethod: "cash" | "gcash" | "maya" | "other";
    referenceNumber?: string;
    note?: string;
  }) => Promise<boolean>;
  updateStorePaymentQRs: (qrs: StorePaymentQRs) => Promise<boolean>;
  logAuditAction: (action: string, entityType: string, entityId?: string, details?: string) => void;
};

const STORAGE_KEY = "stocktrack.store.v2";
const LEGACY_STORAGE_KEY = "freshmartims.store";

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function createState(next?: Partial<FreshMartState>, account?: { email: string; name: string; role: "Admin" | "Manager" | "Staff"; storeId?: string }): FreshMartState {
  const storedUser = next?.user && typeof next.user === "object" ? (next.user as Partial<FreshMartState["user"]>) : undefined;
  const isLegacySeed = storedUser?.id === "user-1";
  const ownsStoredData = !account || !isLegacySeed;
  const userOverride = account
    ? {
        id: `account-${account.email.toLowerCase()}`,
        name: account.name,
        username: account.email.split("@")[0],
        email: account.email,
        storeEmail: storedUser?.storeEmail ?? storedUser?.email ?? account.email,
        storeId: storedUser?.storeId ?? account.storeId,
        phone: undefined,
        address: undefined,
        role: account.role === "Admin" ? "Store Owner" as const : "Staff" as const,
        avatarInitials: account.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        storeName: "",
        businessHours: undefined,
        permitNumber: undefined,
        accessLevel: account.role === "Admin" ? "Admin" as const : "Staff" as const,
        ...(storedUser && !isLegacySeed && ownsStoredData ? storedUser : {}),
      }
    : storedUser ?? {};
  const preferencesOverride = userOverride.preferences && typeof userOverride.preferences === "object" ? userOverride.preferences : {};
  return {
    ownerEmail: account?.email.toLowerCase(),
    user: {
      id: account ? `account-${account.email.toLowerCase()}` : "",
      name: account?.name ?? "",
      username: account?.email.split("@")[0] ?? "",
      email: account?.email ?? "",
      storeEmail: storedUser?.storeEmail ?? storedUser?.email ?? account?.email ?? "",
      storeId: storedUser?.storeId ?? account?.storeId,
      role: account?.role === "Admin" ? "Store Owner" : "Staff",
      avatarInitials: account?.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "",
      storeName: "",
      accessLevel: account?.role === "Admin" ? "Admin" : "Staff",
      ...userOverride,
      preferences: {
        notificationsEnabled: true,
        biometricEnabled: false,
        darkMode: false,
        language: "English",
        ...preferencesOverride,
      },
    },
    products: ownsStoredData ? next?.products ?? [] : [],
    movements: ownsStoredData ? next?.movements ?? [] : [],
    notifications: ownsStoredData ? next?.notifications ?? [] : [],
    teamMembers: ownsStoredData ? next?.teamMembers ?? [] : [],
  };
}

function createNotification(type: NotificationItem["type"], message: string, title: string, relatedProductId?: string): NotificationItem {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    message,
    relatedProductId,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}

async function queueAndSync(type: SyncOpType, payload: unknown): Promise<void> {
  try {
    await enqueueSyncOp(type, payload);
    await processSyncQueue();
  } catch (error) {
    showAlert(
      "Offline changes could not be saved",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function reportSyncSetupError(error: unknown): void {
  showAlert("Offline changes could not be saved", error instanceof Error ? error.message : String(error));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, isReady: authReady } = useAuth();
  const sessionKey = session ? `session:${session.email.toLowerCase()}` : "signed-out";

  return (
    <SessionStoreProvider key={sessionKey} session={session} authReady={authReady}>
      {children}
    </SessionStoreProvider>
  );
}

function SessionStoreProvider({ children, session, authReady }: {
  children: ReactNode;
  session: AuthSession | null;
  authReady: boolean;
}) {
  const [state, setState] = useState<FreshMartState>(() => createState());
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [isStoreReady, setIsStoreReady] = useState(false);
  const customersRef = useRef<Customer[]>([]);
  const loadedStorageKey = useRef<string | null>(null);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  const prefsStorageKey = session
    ? `${STORAGE_KEY}.prefs.${encodeURIComponent(session.email.toLowerCase())}`
    : null;

  // ── Auto-sync on app foreground ────────────────────────────────────────────
  useEffect(() => {
    setSyncQueueStoreId(state.user.storeId ?? "");
    setOfflineCacheScope(state.user.storeId ? `store:${state.user.storeId}` : session?.email ? `user:${session.email.toLowerCase()}` : "");
  }, [state.user.storeId, session?.email]);

  useEffect(() => {
    void clearLegacyOfflineCache();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void processSyncQueue().catch(reportSyncSetupError);
      }
    });
    return () => subscription.remove();
  }, []);

  // ── Load on login ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authReady) return;

    void writeStoredString(LEGACY_STORAGE_KEY, null);
    loadedStorageKey.current = null;
    const accountSession = session;

    if (!accountSession) {
      loadedStorageKey.current = STORAGE_KEY;
      queueMicrotask(() => setIsStoreReady(true));
      return;
    }

    let active = true;

    void (async () => {
      let savedPrefs: Partial<FreshMartState> = {};
      let accountWithStoreId = accountSession as typeof accountSession & { storeId?: string };
      let cacheScope = `user:${accountSession.email.toLowerCase()}`;

      try {
        let accountStoreId: string | undefined;
        let userId: string | undefined;
        const { data: currentUser } = await supabase.auth.getUser();
        if (currentUser.user) {
          userId = currentUser.user.id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("store_id")
            .eq("id", currentUser.user.id)
            .maybeSingle();
          accountStoreId = profile?.store_id ?? undefined;
        }

        accountWithStoreId = { ...accountSession, storeId: accountStoreId };
        cacheScope = accountStoreId
          ? `store:${accountStoreId}`
          : `user:${userId ?? accountSession.email.toLowerCase()}`;
        if (active) setOfflineCacheScope(cacheScope);

        if (prefsStorageKey) {
          const stored = await readStoredString(prefsStorageKey);
          if (stored) {
            try { savedPrefs = JSON.parse(stored) as Partial<FreshMartState>; } catch { /* ignore */ }
          }
        }

        const [
          products,
          movements,
          notifications,
          loadedSales,
          loadedCustomers,
          loadedDebts,
          loadedDebtPayments,
          loadedAuditLogs,
          loadedBatches,
          loadedShifts,
          storeRes,
        ] = accountStoreId
          ? await Promise.all([
              fetchProducts(accountStoreId),
              fetchMovements(accountStoreId),
              fetchNotifications(accountStoreId),
              fetchSales(accountStoreId),
              fetchCustomers(accountStoreId),
              fetchDebts(accountStoreId),
              fetchDebtPayments(accountStoreId),
              fetchAuditLogs(accountStoreId),
              fetchBatches(accountStoreId),
              fetchCashShifts(accountStoreId),
              supabase
                .from("stores")
                .select("name, phone, address, gcash_name, gcash_number, gcash_qr_url, maya_name, maya_number, maya_qr_url")
                .eq("id", accountStoreId)
                .maybeSingle(),
            ])
          : [[], [], [], [], [], [], [], [], [], [], null] as any;

        const storeData = storeRes?.data;
        const [gcashQrUri, mayaQrUri] = await Promise.all([
          resolveStoreMediaUri(storeData?.gcash_qr_url),
          resolveStoreMediaUri(storeData?.maya_qr_url),
        ]);
        const storeQRs: StorePaymentQRs = {
          gcashName: storeData?.gcash_name ?? undefined,
          gcashNumber: storeData?.gcash_number ?? undefined,
          gcashQrUri,
          mayaName: storeData?.maya_name ?? undefined,
          mayaNumber: storeData?.maya_number ?? undefined,
          mayaQrUri,
        };

        if (active) {
          setSales(loadedSales);
          setCustomers(loadedCustomers);
          setDebts(loadedDebts);
          setDebtPayments(loadedDebtPayments);
          setAuditLogs(loadedAuditLogs);
          setBatches(loadedBatches ?? []);
          setShifts(loadedShifts ?? []);
          setState(createState(
            {
              ...savedPrefs,
              products,
              movements,
              notifications,
              user: {
                ...(savedPrefs.user ?? {}),
                storeQRs,
                storeName: storeData?.name ?? savedPrefs.user?.storeName ?? "",
                phone: storeData?.phone ?? savedPrefs.user?.phone ?? undefined,
                address: storeData?.address ?? savedPrefs.user?.address ?? undefined,
              } as any,
            },
            accountWithStoreId,
          ));
          loadedStorageKey.current = prefsStorageKey ?? STORAGE_KEY;
          setIsStoreReady(true);

          void saveOfflineCache(cacheScope, "products", products);
          void saveOfflineCache(cacheScope, "movements", movements);
          void saveOfflineCache(cacheScope, "notifications", notifications);
          void saveOfflineCache(cacheScope, "sales", loadedSales);
          void saveOfflineCache(cacheScope, "customers", loadedCustomers);
          void saveOfflineCache(cacheScope, "debts", loadedDebts);
          void saveOfflineCache(cacheScope, "debtPayments", loadedDebtPayments);
        }
      } catch {
        if (active) {
          const [cachedProducts, cachedMovements, cachedNotifications, cachedSales, cachedCustomers, cachedDebts, cachedDebtPayments] =
            await Promise.all([
              loadOfflineCache<Product[]>(cacheScope, "products"),
              loadOfflineCache<StockMovement[]>(cacheScope, "movements"),
              loadOfflineCache<NotificationItem[]>(cacheScope, "notifications"),
              loadOfflineCache<SaleTransaction[]>(cacheScope, "sales"),
              loadOfflineCache<Customer[]>(cacheScope, "customers"),
              loadOfflineCache<Debt[]>(cacheScope, "debts"),
              loadOfflineCache<DebtPayment[]>(cacheScope, "debtPayments"),
            ]);
          setSales(cachedSales ?? []);
          setCustomers(cachedCustomers ?? []);
          setDebts(cachedDebts ?? []);
          setDebtPayments(cachedDebtPayments ?? []);
          setAuditLogs([]);
          setBatches([]);
          setShifts([]);
          setState(createState(
            {
              ...savedPrefs,
              products: cachedProducts ?? [],
              movements: cachedMovements ?? [],
              notifications: cachedNotifications ?? [],
            },
            accountWithStoreId,
          ));
          loadedStorageKey.current = prefsStorageKey ?? STORAGE_KEY;
          setIsStoreReady(true);
        }
      }
    })();

    return () => { active = false; };
  }, [authReady, prefsStorageKey, session]);

  // ── Persist user preferences to AsyncStorage ───────────────────────────────
  useEffect(() => {
    if (!prefsStorageKey || loadedStorageKey.current !== prefsStorageKey) return;
    const prefsOnly: Partial<FreshMartState> = {
      user: { ...state.user, storeQRs: undefined },
      teamMembers: state.teamMembers,
    };
    void writeStoredString(prefsStorageKey, JSON.stringify(prefsOnly));
  }, [state.user, state.teamMembers, prefsStorageKey]);

  useEffect(() => {
    const cacheScope = getOfflineCacheScope();
    if (cacheScope) void saveOfflineCache(cacheScope, "debtPayments", debtPayments);
  }, [debtPayments]);

  const mutate = (updater: (current: FreshMartState) => FreshMartState) => {
    setState((current) => updater(current));
  };

  const getStoreId = () => state.user.storeId;
  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? "";
  };

  const getProduct = (id: string) => state.products.find((product) => product.id === id);
  const getProductBySku = (sku: string) => findProductBySku(sku, state.products);

  const applyMovement = (
    productId: string,
    type: "in" | "out",
    quantity: number,
    performedBy = state.user.name,
    note?: string,
    timestamp = new Date().toISOString(),
    reason?: "sale" | "damaged" | "expired" | "adjustment",
  ) => {
    let newMovement: StockMovement | null = null;
    let newNotifications: NotificationItem[] = [];

    mutate((current) => {
      const products = current.products.map((product) => {
        if (product.id !== productId) return product;
        const nextStock = type === "in"
          ? product.currentStock + quantity
          : Math.max(product.currentStock - quantity, 0);
        return { ...product, currentStock: nextStock, updatedAt: new Date().toISOString() };
      });

      const movement: StockMovement = {
        id: Crypto.randomUUID(),
        productId,
        type,
        reason: type === "out" ? reason ?? "adjustment" : undefined,
        quantity,
        performedBy,
        timestamp,
        note,
      };
      newMovement = movement;

      const product = products.find((item) => item.id === productId);
      const notifications = [...current.notifications];

      if (product) {
        if (product.currentStock <= product.lowStockThreshold) {
          const lowStockNote = createNotification(
            "low_stock",
            `${product.name} has only ${product.currentStock} ${product.unitType} left. Minimum is ${product.lowStockThreshold}.`,
            "Low Stock Alert",
            product.id,
          );
          notifications.unshift(lowStockNote);
          newNotifications.push(lowStockNote);
        }
        const movementNote = createNotification(
          type === "in" ? "stock_received" : "stock_out",
          `${quantity} ${product.unitType} of ${product.name} ${type === "in" ? "added" : "removed"} by ${performedBy}.`,
          type === "in" ? "Stock Received" : "Stock Out",
          product.id,
        );
        notifications.unshift(movementNote);
        newNotifications.push(movementNote);

        const storeId = current.user.storeId;
        if (storeId) {
          void getUserId().then((uid) => {
            void queueAndSync("MOVEMENT", {
              storeId,
              userId: uid,
              movement: newMovement,
            });
          }).catch(reportSyncSetupError);
          for (const n of newNotifications) {
            void insertNotification(storeId, n);
          }
        }
      }

      return { ...current, products, movements: [movement, ...current.movements], notifications };
    });
  };

  const loadSales = async () => {
    const storeId = state.user.storeId;
    if (storeId) {
      const data = await fetchSales(storeId);
      setSales(data);
    }
  };

  const processCheckout = async (checkoutData: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    amountTendered: number;
    discount?: number;
    tax?: number;
    note?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    dueDate?: string;
    referenceNumber?: string;
    splitCashAmount?: number;
    splitOtherAmount?: number;
    splitOtherMethod?: "e_wallet" | "credit";
    redeemedPoints?: number;
  }): Promise<{ success: boolean; sale?: SaleTransaction; error?: string }> => {
    const {
      items,
      paymentMethod,
      amountTendered,
      discount = 0,
      tax = 0,
      note,
      customerId,
      customerName,
      customerPhone,
      dueDate,
      referenceNumber,
      splitCashAmount,
      splitOtherAmount,
      splitOtherMethod,
      redeemedPoints = 0,
    } = checkoutData;

    if (!items || items.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    for (const item of items) {
      const liveProduct = state.products.find((p) => p.id === item.product.id);
      if (!liveProduct || liveProduct.currentStock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${item.product.name}. Available: ${liveProduct ? liveProduct.currentStock : 0}`,
        };
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount = Math.max(0, subtotal - discount + tax);
    const changeAmount = paymentMethod === "cash" ? Math.max(0, amountTendered - totalAmount) : 0;
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();
    const cashierName = state.user.name || "Cashier";

    const saleItems: SaleItem[] = items.map((item) => ({
      id: Crypto.randomUUID(),
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
      unitCost: item.product.unitPrice,
    }));

    const sale: SaleTransaction = {
      id: Crypto.randomUUID(),
      receiptNumber,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discount,
      tax,
      totalAmount,
      paymentMethod,
      amountTendered: paymentMethod === "cash" ? amountTendered : totalAmount,
      changeAmount,
      cashierName,
      note,
      timestamp,
      status: "completed",
      items: saleItems,
      customerId,
      customerName,
      referenceNumber,
      splitCashAmount,
      splitOtherAmount,
      splitOtherMethod,
    };

    const newMovements: StockMovement[] = [];
    const newNotifications: NotificationItem[] = [];
    mutate((current) => {
      const itemMap = new Map(items.map((i) => [i.product.id, i.quantity]));
      const nextProducts = current.products.map((prod) => {
        const qtyToDeduct = itemMap.get(prod.id);
        if (!qtyToDeduct) return prod;
        const nextStock = Math.max(0, prod.currentStock - qtyToDeduct);
        const updated = { ...prod, currentStock: nextStock, updatedAt: timestamp };
        return updated;
      });

      const nextMovements = [...current.movements];
      const nextNotifications = [...current.notifications];

      for (const item of items) {
        const m: StockMovement = {
          id: Crypto.randomUUID(),
          productId: item.product.id,
          type: "out",
          reason: "sale",
          quantity: item.quantity,
          performedBy: cashierName,
          timestamp,
          note: `POS Sale ${receiptNumber}`,
        };
        newMovements.push(m);
        nextMovements.unshift(m);

        const updated = nextProducts.find((p) => p.id === item.product.id);
        if (updated && updated.currentStock <= updated.lowStockThreshold) {
          const lowStockNote = createNotification(
            "low_stock",
            `${updated.name} has only ${updated.currentStock} ${updated.unitType} left after sale. Minimum is ${updated.lowStockThreshold}.`,
            "Low Stock Alert",
            updated.id,
          );
          newNotifications.push(lowStockNote);
          nextNotifications.unshift(lowStockNote);
        }
      }

      return {
        ...current,
        products: nextProducts,
        movements: nextMovements,
        notifications: nextNotifications,
      };
    });

    // FEFO: Deduct sold items from soonest expiring batches
    setBatches((prevBatches) => {
      let currentBatches = [...prevBatches];
      for (const item of items) {
        let remainingToDeduct = item.quantity;
        currentBatches = currentBatches.map((b) => {
          if (b.productId !== item.product.id || remainingToDeduct <= 0) return b;
          const deductFromBatch = Math.min(b.quantity, remainingToDeduct);
          remainingToDeduct -= deductFromBatch;
          return { ...b, quantity: Math.max(0, b.quantity - deductFromBatch) };
        });
      }
      return currentBatches;
    });

    setSales((prev) => [sale, ...prev]);

    // Handle Utang / Customer Debt creation
    const isCredit = paymentMethod === "credit";
    const isSplitCredit = paymentMethod === "split" && splitOtherMethod === "credit";
    const debtAmount = isCredit ? totalAmount : isSplitCredit ? (splitOtherAmount ?? Math.max(0, totalAmount - (splitCashAmount ?? 0))) : 0;

    if (debtAmount > 0 && customerId && customerName) {
      const debt: Debt = {
        id: Crypto.randomUUID(),
        storeId: state.user.storeId,
        customerId,
        customerName,
        customerPhone,
        saleId: sale.id,
        amount: debtAmount,
        amountPaid: 0,
        balance: debtAmount,
        status: "unpaid",
        dueDate,
        note: `POS Sale ${receiptNumber}`,
        itemsSummary: items.map((i) => `${i.quantity}x ${i.product.name}`).join(", "),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      setDebts((prev) => [debt, ...prev]);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? { ...c, totalDebt: c.totalDebt + debtAmount, updatedAt: timestamp }
            : c
        )
      );

      const storeId = state.user.storeId;
      if (storeId) {
        const cust = customersRef.current.find((c) => c.id === customerId);
        void queueAndSync("DEBT", {
          storeId,
          debt,
          customer: cust ? { ...cust, totalDebt: cust.totalDebt + debtAmount } : null,
        });
      }
    }

    // Customer Loyalty Points: 1 pt per ₱100 paid non-credit, minus redeemedPoints
    if (customerId) {
      const paidPortion = isCredit ? 0 : isSplitCredit ? (splitCashAmount ?? 0) : totalAmount;
      const earnedPts = Math.floor(paidPortion / 100);
      const pointsDelta = earnedPts - (redeemedPoints ?? 0);
      if (pointsDelta !== 0) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === customerId
              ? { ...c, loyaltyPoints: Math.max(0, c.loyaltyPoints + pointsDelta), updatedAt: timestamp }
              : c
          )
        );
        const storeId = state.user.storeId;
        if (storeId) {
          const cust = customersRef.current.find((c) => c.id === customerId);
          if (cust) {
            void upsertCustomer(storeId, {
              ...cust,
              loyaltyPoints: Math.max(0, cust.loyaltyPoints + pointsDelta),
            });
          }
        }
      }
    }

    const storeId = state.user.storeId;
    if (storeId) {
      void getUserId().then((uid) => {
        void queueAndSync("SALE", {
          storeId,
          userId: uid,
          sale,
          movements: newMovements,
        });
      }).catch(reportSyncSetupError);
      for (const notif of newNotifications) {
        void insertNotification(storeId, notif);
      }
    }

    return { success: true, sale };
  };

  const voidSale = async (saleId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: "Transaction not found" };
    if (sale.status === "voided") return { success: false, error: "Transaction already voided" };

    const storeId = getStoreId();
    const cashierName = state.user.name || "Manager";
    const timestamp = new Date().toISOString();

    // 1. Mark sale as voided locally
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: "voided",
              voidReason: reason,
              voidedAt: timestamp,
              voidedBy: cashierName,
            }
          : s
      )
    );

    // 2. Restock products and add reversal movements
    const restockMovements: StockMovement[] = [];
    const itemMap = new Map(sale.items.map((i) => [i.productId, i.quantity]));

    mutate((current) => {
      const nextProducts = current.products.map((prod) => {
        const qtyToReturn = itemMap.get(prod.id);
        if (!qtyToReturn) return prod;
        const nextStock = prod.currentStock + qtyToReturn;
        const updated = { ...prod, currentStock: nextStock, updatedAt: timestamp };
        return updated;
      });

      const nextMovements = [...current.movements];
      for (const item of sale.items) {
        const m: StockMovement = {
          id: Crypto.randomUUID(),
          productId: item.productId,
          type: "in",
          reason: "adjustment",
          quantity: item.quantity,
          performedBy: cashierName,
          timestamp,
          note: `Restocked from Void Sale ${sale.receiptNumber} (${reason})`,
        };
        restockMovements.push(m);
        nextMovements.unshift(m);
      }

      return {
        ...current,
        products: nextProducts,
        movements: nextMovements,
      };
    });

    // 3. If sale was credit, revert debt and customer balance
    if (sale.customerId && (sale.paymentMethod === "credit" || (sale.paymentMethod === "split" && sale.splitOtherMethod === "credit"))) {
      const debtToCancel = debts.find((d) => d.saleId === saleId && d.customerId === sale.customerId);
      if (debtToCancel) {
        const unreversedDebt = debtToCancel.balance;
        setDebts((prev) => prev.filter((d) => d.id !== debtToCancel.id));
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === sale.customerId
              ? { ...c, totalDebt: Math.max(0, c.totalDebt - unreversedDebt), updatedAt: timestamp }
              : c
          )
        );
      }
    }

    // 4. Offline sync op
    if (storeId) {
      void getUserId().then((uid) => {
        void queueAndSync("VOID_SALE", {
          storeId,
          userId: uid,
          saleId,
          reason,
          voidedBy: cashierName,
          movements: restockMovements,
        });
      }).catch(reportSyncSetupError);
    }

    logAuditAction("Voided Sale", "sale", sale.receiptNumber, `Voided for ₱${sale.totalAmount}. Reason: ${reason}`);
    return { success: true };
  };

  const addCustomer = async (cust: Omit<Customer, "id" | "createdAt" | "updatedAt" | "totalDebt" | "loyaltyPoints">) => {
    const storeId = getStoreId();
    const newCust: Customer = {
      ...cust,
      id: Crypto.randomUUID(),
      storeId,
      totalDebt: 0,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    customersRef.current = [newCust, ...customersRef.current.filter((customer) => customer.id !== newCust.id)];
    setCustomers((prev) => [newCust, ...prev]);
    if (storeId) void upsertCustomer(storeId, newCust);
    logAuditAction("Created Customer", "customer", newCust.id, `Created ${newCust.name} (${newCust.phone})`);
    return newCust;
  };

  const updateCustomer = async (customerId: string, patch: Partial<Customer>) => {
    const storeId = getStoreId();
    let updatedCustomer: Customer | undefined;
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          updatedCustomer = { ...c, ...patch, updatedAt: new Date().toISOString() };
          return updatedCustomer;
        }
        return c;
      })
    );
    if (storeId && updatedCustomer) {
      void upsertCustomer(storeId, updatedCustomer);
    }
    logAuditAction("Updated Customer", "customer", customerId, `Updated details for ${patch.name ?? customerId}`);
    return true;
  };

  const deleteCustomer = async (customerId: string) => {
    const storeId = getStoreId();
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (storeId) void removeCustomer(customerId);
    logAuditAction("Deleted Customer", "customer", customerId);
    return true;
  };

  const addDebt = async (debtData: Omit<Debt, "id" | "amountPaid" | "balance" | "status" | "createdAt" | "updatedAt">) => {
    const storeId = getStoreId();
    const now = new Date().toISOString();
    const newDebt: Debt = {
      ...debtData,
      id: Crypto.randomUUID(),
      storeId,
      amountPaid: 0,
      balance: debtData.amount,
      status: "unpaid",
      createdAt: now,
      updatedAt: now,
    };
    setDebts((prev) => [newDebt, ...prev]);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === debtData.customerId
          ? { ...c, totalDebt: c.totalDebt + debtData.amount, updatedAt: now }
          : c
      )
    );
    if (storeId) {
      const cust = customersRef.current.find((c) => c.id === debtData.customerId);
      void queueAndSync("DEBT", {
        storeId,
        debt: newDebt,
        customer: cust ? { ...cust, totalDebt: cust.totalDebt + debtData.amount } : null,
      });
    }
    logAuditAction("Recorded Utang", "debt", newDebt.id, `${debtData.customerName}: ₱${debtData.amount}`);
    return newDebt;
  };

  const recordDebtPayment = async (paymentData: {
    debtId: string;
    customerId: string;
    amount: number;
    paymentMethod: "cash" | "gcash" | "maya" | "other";
    referenceNumber?: string;
    note?: string;
  }) => {
    const storeId = getStoreId();
    const now = new Date().toISOString();
    const debt = debts.find((d) => d.id === paymentData.debtId);
    if (!debt) return false;

    const newAmountPaid = debt.amountPaid + paymentData.amount;
    const newBalance = Math.max(0, debt.amount - newAmountPaid);
    const newStatus = newBalance <= 0 ? ("paid" as const) : ("partial" as const);
    const payment: DebtPayment = {
      id: Crypto.randomUUID(),
      storeId,
      debtId: paymentData.debtId,
      customerId: paymentData.customerId,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      referenceNumber: paymentData.referenceNumber,
      recordedBy: state.user.name || "Cashier",
      note: paymentData.note,
      createdAt: now,
    };

    setDebtPayments((current) => [payment, ...current]);

    setDebts((prev) =>
      prev.map((d) =>
        d.id === paymentData.debtId
          ? { ...d, amountPaid: newAmountPaid, balance: newBalance, status: newStatus, updatedAt: now }
          : d
      )
    );

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === paymentData.customerId
          ? { ...c, totalDebt: Math.max(0, c.totalDebt - paymentData.amount), updatedAt: now }
          : c
      )
    );

    if (storeId) {
      void queueAndSync("DEBT_PAYMENT", {
        storeId,
        debtId: paymentData.debtId,
        customerId: paymentData.customerId,
        payment,
        newAmountPaid,
        newBalance,
        newStatus,
      });
    }

    logAuditAction(
      "Debt Payment",
      "debt_payment",
      paymentData.debtId,
      `Settled ₱${paymentData.amount} via ${paymentData.paymentMethod.toUpperCase()} (Ref: ${paymentData.referenceNumber || "None"})`,
    );
    return true;
  };

  const updateStorePaymentQRs = async (qrs: StorePaymentQRs) => {
    const storeId = getStoreId();
    let savedQrs = qrs;
    if (storeId) {
      const result = await updateStoreQRs(storeId, qrs);
      if (!result) {
        return false;
      }
      savedQrs = result;
    }

    mutate((current) => ({
      ...current,
      user: {
        ...current.user,
        storeQRs: savedQrs,
      },
    }));
    return true;
  };

  const logAuditAction = (action: string, entityType: string, entityId?: string, details?: string) => {
    const storeId = getStoreId();
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      storeId,
      actorId: state.user.id,
      actorName: state.user.name || "Staff",
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
    if (storeId) void insertAuditLog(storeId, log);
  };

  // Batches (FEFO)
  const addBatch = async (batchData: Omit<ProductBatch, "id" | "createdAt">): Promise<boolean> => {
    const storeId = getStoreId();
    const newBatch: ProductBatch = {
      ...batchData,
      id: `batch-${Date.now()}`,
      storeId,
      createdAt: new Date().toISOString(),
    };
    setBatches((prev) =>
      [...prev, newBatch].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      )
    );
    if (storeId) {
      void upsertBatch(storeId, newBatch);
    }
    logAuditAction("Added Batch", "batch", newBatch.id, `Batch ${newBatch.batchNumber} (Qty: ${newBatch.quantity})`);
    return true;
  };

  const deleteBatch = async (batchId: string): Promise<boolean> => {
    setBatches((prev) => prev.filter((b) => b.id !== batchId));
    if (!batchId.startsWith("batch-")) {
      void removeBatch(batchId);
    }
    logAuditAction("Deleted Batch", "batch", batchId);
    return true;
  };

  // Cash Shifts
  const currentShift = useMemo(() => shifts.find((s) => s.status === "open") ?? null, [shifts]);

  const openShift = async (openingFloat: number): Promise<boolean> => {
    const storeId = getStoreId();
    const cashierName = state.user.name || "Cashier";
    const userId = await getUserId();
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      storeId,
      cashierId: userId,
      cashierName,
      openingFloat,
      expectedCash: openingFloat,
      status: "open",
      openedAt: new Date().toISOString(),
    };
    setShifts((prev) => [newShift, ...prev]);
    if (storeId) {
      void insertCashShift(storeId, newShift);
    }
    logAuditAction("Opened Cash Shift", "shift", newShift.id, `Float: ₱${openingFloat}`);
    return true;
  };

  const closeShift = async (countedCash: number, notes?: string): Promise<boolean> => {
    if (!currentShift) return false;
    const storeId = getStoreId();
    const shiftSales = sales.filter(
      (s) => s.status !== "voided" && new Date(s.timestamp) >= new Date(currentShift.openedAt)
    );
    const cashSalesTotal = shiftSales.reduce((sum, s) => {
      if (s.paymentMethod === "cash") return sum + s.totalAmount;
      if (s.paymentMethod === "split") return sum + (s.splitCashAmount ?? 0);
      return sum;
    }, 0);
    const expectedCash = currentShift.openingFloat + cashSalesTotal;
    const variance = countedCash - expectedCash;
    const closedAt = new Date().toISOString();

    setShifts((prev) =>
      prev.map((s) =>
        s.id === currentShift.id
          ? { ...s, countedCash, expectedCash, variance, status: "closed", notes, closedAt }
          : s
      )
    );

    if (storeId && !currentShift.id.startsWith("shift-")) {
      void closeCashShift(currentShift.id, countedCash, expectedCash, variance, notes);
    }
    logAuditAction("Closed Cash Shift", "shift", currentShift.id, `Counted: ₱${countedCash}, Expected: ₱${expectedCash}, Variance: ₱${variance}`);
    return true;
  };

  const summary = useMemo(
    () => getDashboardSummary(state.products, state.movements, state.notifications),
    [state.products, state.movements, state.notifications],
  );
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(state.products), [state.products]);
  const weeklyActivity = useMemo(() => getWeeklyActivitySeries(state.movements), [state.movements]);
  const notifications = useMemo(() => getNotifications(state.notifications), [state.notifications]);
  const recentActivity = useMemo(() => getRecentActivity(state.products, state.movements), [state.products, state.movements]);

  const value: StoreContextValue = {
      isStoreReady,
      state,
      summary,
      categoryBreakdown,
      weeklyActivity,
      notifications,
      recentActivity,
      teamMembers: state.teamMembers,
      sales,
      customers,
      debts,
      debtPayments,
      auditLogs,
      batches,
      shifts,
      currentShift,
      processCheckout,
      voidSale,
      loadSales,
      getProduct,
      getProductBySku,
      stockIn: (productId, quantity, performedBy, note, timestamp) =>
        applyMovement(productId, "in", quantity, performedBy, note, timestamp),
      stockOut: (productId, quantity, performedBy, note, timestamp, reason) =>
        applyMovement(productId, "out", quantity, performedBy, note, timestamp, reason),

      addProduct: (product) => {
        const storeId = getStoreId();
        const notification = createNotification("info", `${product.name} was added to inventory.`, "Product Added", product.id);
        mutate((current) => ({
          ...current,
          products: [product, ...current.products],
          notifications: [notification, ...current.notifications],
        }));
        if (storeId) {
          void queueAndSync("PRODUCT", { storeId, product, deleted: false, stockDelta: 0, createIfMissing: true });
          void insertNotification(storeId, notification);
        }
      },

      updateProduct: (productId, patch) => {
        const storeId = getStoreId();
        let updatedProduct: Product | undefined;
        let stockDelta = 0;
        mutate((current) => {
          const products = current.products.map((product) => {
            if (product.id !== productId) return product;
            updatedProduct = { ...product, ...patch, updatedAt: new Date().toISOString() };
            stockDelta = updatedProduct.currentStock - product.currentStock;
            return updatedProduct;
          });
          return { ...current, products };
        });
        if (storeId && updatedProduct) {
          const snap = updatedProduct;
          void queueAndSync("PRODUCT", { storeId, product: snap, deleted: false, stockDelta, createIfMissing: false });
        }
      },

      deleteProduct: (productId) => {
        const storeId = getStoreId();
        mutate((current) => ({
          ...current,
          products: current.products.filter((product) => product.id !== productId),
        }));
        if (storeId) {
          void queueAndSync("PRODUCT", { storeId, product: { id: productId }, deleted: true });
        } else {
          void removeProduct(productId);
        }
        logAuditAction("Deleted Product", "product", productId);
      },

      addBatch,
      deleteBatch,
      openShift,
      closeShift,

      markNotificationRead: (notificationId) => {
        mutate((current) => ({
          ...current,
          notifications: current.notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
        }));
        void updateNotificationRead(notificationId, true);
      },

      markAllNotificationsRead: () => {
        const storeId = getStoreId();
        mutate((current) => ({
          ...current,
          notifications: current.notifications.map((n) => ({ ...n, isRead: true })),
        }));
        if (storeId) void updateAllNotificationsRead(storeId);
      },

      deleteNotification: (notificationId) => {
        mutate((current) => ({
          ...current,
          notifications: current.notifications.filter((n) => n.id !== notificationId),
        }));
        void removeNotification(notificationId);
      },

      toggleNotificationPreference: () =>
        mutate((current) => ({
          ...current,
          user: {
            ...current.user,
            preferences: {
              ...current.user.preferences,
              notificationsEnabled: !current.user.preferences.notificationsEnabled,
            },
          },
        })),

      toggleBiometricPreference: () =>
        mutate((current) => ({
          ...current,
          user: {
            ...current.user,
            preferences: {
              ...current.user.preferences,
              biometricEnabled: !current.user.preferences.biometricEnabled,
            },
          },
        })),

      toggleDarkMode: () =>
        mutate((current) => ({
          ...current,
          user: {
            ...current.user,
            preferences: {
              ...current.user.preferences,
              darkMode: !current.user.preferences.darkMode,
            },
          },
        })),

      setLanguage: (language) =>
        mutate((current) => ({
          ...current,
          user: {
            ...current.user,
            preferences: { ...current.user.preferences, language },
          },
        })),

      updateUserProfile: (patch) =>
        mutate((current) => ({ ...current, user: { ...current.user, ...patch } })),

      updateTeamMemberAccess: (memberId, accessLevel) =>
        mutate((current) => ({
          ...current,
          teamMembers: current.teamMembers.map((member) =>
            member.id === memberId ? { ...member, accessLevel } : member,
          ),
        })),

      addCustomer,
      updateCustomer,
      deleteCustomer,
      addDebt,
      recordDebtPayment,
      updateStorePaymentQRs,
      logAuditAction,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }

  return context;
}
