/**
 * supabase-store.ts
 * All Supabase queries for the StoreProvider.
 * Each function maps between the app's camelCase Product/StockMovement/NotificationItem
 * types and the database's snake_case column names.
 */

import { File } from "expo-file-system";
import type { CashShift, DebtPayment, NotificationItem, Product, ProductBatch, PurchaseOrder, PurchaseOrderStatus, SaleTransaction, StockMovement, StorePaymentQRs } from "../data/freshmart";
import { supabase } from "./supabase";

// ─── Products ────────────────────────────────────────────────────────────────

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    sku: row.sku as string,
    name: row.name as string,
    category: row.category as string,
    unitType: row.unit_type as string,
    currentStock: Number(row.current_stock),
    maxStock: Number(row.max_stock),
    lowStockThreshold: Number(row.low_stock_threshold),
    unitPrice: Number(row.unit_price),
    srpPrice: row.srp_price != null ? Number(row.srp_price) : undefined,
    expiryDate: (row.expiry_date as string | null) ?? undefined,
    manufacturingDate: (row.manufacturing_date as string | null) ?? undefined,
    hasTingi: Boolean(row.has_tingi ?? false),
    tingiUnit: (row.tingi_unit as string | null) ?? undefined,
    tingiConversionRate: row.tingi_conversion_rate != null ? Number(row.tingi_conversion_rate) : undefined,
    tingiPrice: row.tingi_price != null ? Number(row.tingi_price) : undefined,
    icon: (row.icon as string | null) ?? "📦",
    imageUri: (row.image_uri as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function productToRow(storeId: string, product: Product) {
  return {
    id: product.id,
    store_id: storeId,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit_type: product.unitType,
    current_stock: product.currentStock,
    max_stock: product.maxStock,
    low_stock_threshold: product.lowStockThreshold,
    unit_price: product.unitPrice,
    srp_price: product.srpPrice ?? null,
    expiry_date: product.expiryDate ?? null,
    manufacturing_date: product.manufacturingDate ?? null,
    has_tingi: Boolean(product.hasTingi),
    tingi_unit: product.tingiUnit ?? null,
    tingi_conversion_rate: product.tingiConversionRate ?? null,
    tingi_price: product.tingiPrice ?? null,
    icon: product.icon,
    image_uri: product.imageUri ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToProduct);
}

export async function syncProductChange(
  storeId: string,
  product: Product,
  stockDelta: number,
  operationId: string,
  createIfMissing: boolean,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("sync_product_change", {
    p_product: productToRow(storeId, product),
    p_stock_delta: stockDelta,
    p_operation_id: operationId,
    p_create_if_missing: createIfMissing,
  });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function removeProduct(productId: string): Promise<boolean> {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);
  return !error;
}

// ─── Stock Movements ─────────────────────────────────────────────────────────

function rowToMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    type: row.type as "in" | "out",
    reason: (row.reason as StockMovement["reason"]) ?? undefined,
    quantity: Number(row.quantity),
    performedBy: (row.performed_by as string | null) ?? "",
    timestamp: row.created_at as string,
    note: (row.note as string | null) ?? undefined,
  };
}

export async function fetchMovements(storeId: string): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToMovement);
}

export async function applyStockMovement(
  storeId: string,
  movement: StockMovement,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("apply_stock_movement", {
    p_store_id: storeId,
    p_product_id: movement.productId,
    p_client_id: movement.id,
    p_type: movement.type,
    p_reason: movement.reason ?? null,
    p_quantity: movement.quantity,
    p_performed_by: movement.performedBy,
    p_note: movement.note ?? null,
    p_created_at: movement.timestamp,
  });
  return error ? { success: false, error: error.message } : { success: true };
}

// ─── Purchase Orders ─────────────────────────────────────────────────────────

function rowToPurchaseOrder(row: Record<string, unknown>): PurchaseOrder {
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    supplierName: row.supplier_name as string,
    invoiceNumber: (row.invoice_number as string | null) ?? undefined,
    status: row.status as PurchaseOrderStatus,
    items: items.map((item) => {
      const orderItem = item as Record<string, unknown>;
      return {
        productId: orderItem.productId as string,
        productName: orderItem.productName as string,
        sku: orderItem.sku as string,
        quantity: Number(orderItem.quantity),
        unitCost: Number(orderItem.unitCost),
        receivedQuantity: Number(orderItem.receivedQuantity ?? 0),
      };
    }),
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchPurchaseOrders(storeId: string): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToPurchaseOrder(row as Record<string, unknown>));
}

export async function upsertPurchaseOrder(order: PurchaseOrder): Promise<boolean> {
  const { error } = await supabase.from("purchase_orders").upsert({
    id: order.id,
    store_id: order.storeId,
    supplier_name: order.supplierName,
    invoice_number: order.invoiceNumber ?? null,
    status: order.status,
    items: order.items,
    created_by: order.createdBy,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  }, { onConflict: "id" });
  return !error;
}

// ─── Notifications ────────────────────────────────────────────────────────────

function rowToNotification(row: Record<string, unknown>): NotificationItem {
  return {
    id: row.id as string,
    type: row.type as NotificationItem["type"],
    title: row.title as string,
    message: row.message as string,
    relatedProductId: (row.product_id as string | null) ?? undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at as string,
  };
}

export async function fetchNotifications(storeId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToNotification);
}

export async function insertNotification(
  storeId: string,
  notification: NotificationItem,
): Promise<boolean> {
  const { error } = await supabase.from("notifications").insert({
    store_id: storeId,
    product_id: notification.relatedProductId ?? null,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.isRead,
  });
  return !error;
}

export async function updateNotificationRead(
  notificationId: string,
  isRead: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: isRead })
    .eq("id", notificationId);
  return !error;
}

export async function updateAllNotificationsRead(storeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("store_id", storeId)
    .eq("is_read", false);
  return !error;
}

export async function removeNotification(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);
  return !error;
}

// ─── Sales & Transactions ───────────────────────────────────────────────────

export async function fetchSales(storeId: string): Promise<SaleTransaction[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!data) return [];

  return (data as any[]).map((row) => ({
    id: row.id,
    receiptNumber: row.receipt_number,
    totalItems: Number(row.total_items),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount ?? 0),
    tax: Number(row.tax ?? 0),
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    amountTendered: Number(row.amount_tendered ?? 0),
    changeAmount: Number(row.change_amount ?? 0),
    cashierName: row.cashier_name ?? "",
    note: row.note ?? undefined,
    timestamp: row.created_at,
    status: row.status ?? "completed",
    voidReason: row.void_reason ?? undefined,
    voidedAt: row.voided_at ?? undefined,
    voidedBy: row.voided_by ?? undefined,
    items: (row.sale_items ?? []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku ?? "",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
      unitCost: item.unit_cost != null ? Number(item.unit_cost) : undefined,
    })),
  }));
}

export async function insertSale(
  storeId: string,
  userId: string,
  sale: SaleTransaction,
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  const { data: saleRow, error: saleError } = await supabase
    .from("sales")
    .upsert({
      id: sale.id,
      store_id: storeId,
      receipt_number: sale.receiptNumber,
      cashier_id: userId || null,
      cashier_name: sale.cashierName,
      total_items: sale.totalItems,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total_amount: sale.totalAmount,
      payment_method: sale.paymentMethod,
      amount_tendered: sale.amountTendered,
      change_amount: sale.changeAmount,
      note: sale.note ?? null,
      status: sale.status ?? "completed",
      created_at: sale.timestamp,
    }, { onConflict: "id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();

  if (saleError) {
    return { success: false, error: saleError.message };
  }

  const saleId = saleRow?.id ?? sale.id;

  if (sale.items.length > 0) {
    const itemsToInsert = sale.items.map((item) => ({
      id: item.id,
      sale_id: saleId,
      product_id: item.productId || null,
      product_name: item.productName,
      sku: item.sku ?? "",
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      unit_cost: item.unitCost ?? null,
      created_at: sale.timestamp,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .upsert(itemsToInsert, { onConflict: "id", ignoreDuplicates: true });
    if (itemsError) {
      return { success: false, saleId, error: itemsError.message };
    }
  }

  return { success: true, saleId };
}

export async function voidSale(
  storeId: string,
  saleId: string,
  reason: string,
  voidedBy: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("sales")
    .update({
      status: "voided",
      void_reason: reason,
      voided_at: new Date().toISOString(),
      voided_by: voidedBy,
    })
    .eq("id", saleId)
    .eq("store_id", storeId);

  return !error;
}

// ─── Customers ──────────────────────────────────────────────────────────────

export async function fetchCustomers(storeId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    phone: row.phone,
    address: row.address ?? undefined,
    creditLimit: Number(row.credit_limit ?? 1000),
    totalDebt: Number(row.total_debt ?? 0),
    loyaltyPoints: Number(row.loyalty_points ?? 0),
    riskStatus: row.risk_status ?? "good",
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertCustomer(storeId: string, customer: any): Promise<boolean> {
  const { error } = await supabase.from("customers").upsert(
    {
      id: customer.id,
      store_id: storeId,
      name: customer.name,
      phone: customer.phone,
      address: customer.address ?? null,
      credit_limit: customer.creditLimit,
      total_debt: customer.totalDebt,
      loyalty_points: customer.loyaltyPoints,
      risk_status: customer.riskStatus,
      notes: customer.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  return !error;
}

export async function removeCustomer(customerId: string): Promise<boolean> {
  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  return !error;
}

// ─── Debts (Utang) ──────────────────────────────────────────────────────────

export async function fetchDebts(storeId: string) {
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];
  return (data as any[]).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? undefined,
    saleId: row.sale_id ?? undefined,
    amount: Number(row.amount),
    amountPaid: Number(row.amount_paid ?? 0),
    balance: Number(row.balance ?? 0),
    status: row.status ?? "unpaid",
    dueDate: row.due_date ?? undefined,
    note: row.note ?? undefined,
    itemsSummary: row.items_summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function fetchDebtPayments(storeId: string): Promise<DebtPayment[]> {
  const { data, error } = await supabase
    .from("debt_payments")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    storeId: row.store_id,
    debtId: row.debt_id,
    customerId: row.customer_id,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    referenceNumber: row.reference_number ?? undefined,
    recordedBy: row.recorded_by ?? "",
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function insertDebt(storeId: string, debt: any): Promise<boolean> {
  const { error } = await supabase.from("debts").upsert({
    id: debt.id,
    store_id: storeId,
    customer_id: debt.customerId,
    customer_name: debt.customerName,
    customer_phone: debt.customerPhone ?? null,
    sale_id: debt.saleId ?? null,
    amount: debt.amount,
    amount_paid: debt.amountPaid ?? 0,
    balance: debt.balance,
    status: debt.status,
    due_date: debt.dueDate ?? null,
    note: debt.note ?? null,
    items_summary: debt.itemsSummary ?? null,
    created_at: debt.createdAt,
    updated_at: debt.updatedAt,
  }, { onConflict: "id", ignoreDuplicates: true });
  return !error;
}

export async function updateDebtPayment(
  storeId: string,
  debtId: string,
  customerId: string,
  payment: DebtPayment,
  newAmountPaid: number,
  newBalance: number,
  newStatus: string,
): Promise<boolean> {
  // Update debt
  const { error: debtErr } = await supabase
    .from("debts")
    .update({
      amount_paid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", debtId);

  if (debtErr) return false;

  const { error: paymentError } = await supabase.from("debt_payments").upsert({
    id: payment.id,
    store_id: storeId,
    debt_id: debtId,
    customer_id: customerId,
    amount: payment.amount,
    payment_method: payment.paymentMethod,
    reference_number: payment.referenceNumber ?? null,
    recorded_by: payment.recordedBy,
    note: payment.note ?? null,
    created_at: payment.createdAt,
  }, { onConflict: "id" });

  if (paymentError) return false;

  const { data: outstandingDebts, error: debtsError } = await supabase
    .from("debts")
    .select("balance, status")
    .eq("store_id", storeId)
    .eq("customer_id", customerId);

  if (debtsError) return false;

  const totalDebt = (outstandingDebts ?? []).reduce(
    (total, outstandingDebt) =>
      outstandingDebt.status === "paid"
        ? total
        : total + Math.max(0, Number(outstandingDebt.balance ?? 0)),
    0,
  );
  const { error: customerError } = await supabase
    .from("customers")
    .update({ total_debt: totalDebt, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("id", customerId);

  return !customerError;
}

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export async function fetchAuditLogs(storeId: string) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? undefined,
    details: row.details ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function insertAuditLog(storeId: string, log: any): Promise<boolean> {
  const { error } = await supabase.from("audit_logs").insert({
    store_id: storeId,
    actor_id: log.actorId ?? null,
    actor_name: log.actorName,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId ?? null,
    details: log.details ?? null,
  });
  return !error;
}

// ─── Store QR Codes ─────────────────────────────────────────────────────────

function getStoreMediaPath(uri: string): string | undefined {
  try {
    const pathname = new URL(uri).pathname;
    const match = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/store-media\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export async function resolveStoreMediaUri(uri?: string | null): Promise<string | undefined> {
  if (!uri) return undefined;
  const path = getStoreMediaPath(uri) ?? (/^[a-z][a-z0-9+.-]*:/i.test(uri) ? undefined : uri);
  if (!path) return uri;

  const { data, error } = await supabase.storage.from("store-media").createSignedUrl(path, 86400);
  return error ? undefined : data.signedUrl;
}

export async function updateStoreQRs(
  storeId: string,
  qrs: StorePaymentQRs,
): Promise<StorePaymentQRs | null> {
  const { data: existing } = await supabase
    .from("stores")
    .select("gcash_qr_url, maya_qr_url")
    .eq("id", storeId)
    .maybeSingle();

  const uploadedPaths: string[] = [];
  const uploadQr = async (uri: string | undefined, kind: "gcash" | "maya") => {
    if (!uri) return { path: undefined, externalUrl: undefined };

    const existingPath = getStoreMediaPath(uri);
    if (existingPath) return { path: existingPath, externalUrl: undefined };
    if (/^https?:\/\//i.test(uri)) return { path: undefined, externalUrl: uri };

    const file = new File(uri);
    const body = await file.arrayBuffer();
    const path = `${storeId}/payment-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("store-media")
      .upload(path, body, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
    if (uploadError) {
      throw uploadError;
    }

    uploadedPaths.push(path);
    return { path, externalUrl: undefined };
  };

  let gcashQr: Awaited<ReturnType<typeof uploadQr>>;
  let mayaQr: Awaited<ReturnType<typeof uploadQr>>;
  try {
    [gcashQr, mayaQr] = await Promise.all([
      uploadQr(qrs.gcashQrUri, "gcash"),
      uploadQr(qrs.mayaQrUri, "maya"),
    ]);
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from("store-media").remove(uploadedPaths);
    throw error instanceof Error ? error : new Error("QR image upload failed.");
  }

  const { error } = await supabase
    .from("stores")
    .update({
      gcash_name: qrs.gcashName ?? null,
      gcash_number: qrs.gcashNumber ?? null,
      gcash_qr_url: gcashQr.path ?? gcashQr.externalUrl ?? null,
      maya_name: qrs.mayaName ?? null,
      maya_number: qrs.mayaNumber ?? null,
      maya_qr_url: mayaQr.path ?? mayaQr.externalUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);
  if (error) {
    if (uploadedPaths.length) await supabase.storage.from("store-media").remove(uploadedPaths);
    throw error;
  }

  const oldPaths = [existing?.gcash_qr_url, existing?.maya_qr_url]
    .filter((value): value is string => typeof value === "string")
    .map(getStoreMediaPath)
    .filter((path): path is string => Boolean(path));
  const nextPaths = [gcashQr.path, mayaQr.path].filter((path): path is string => Boolean(path));
  const pathsToRemove = oldPaths.filter((path) => !nextPaths.includes(path));
  if (pathsToRemove.length) await supabase.storage.from("store-media").remove(pathsToRemove);

  const [gcashQrUri, mayaQrUri] = await Promise.all([
    resolveStoreMediaUri(gcashQr.path ?? gcashQr.externalUrl),
    resolveStoreMediaUri(mayaQr.path ?? mayaQr.externalUrl),
  ]);
  return { ...qrs, gcashQrUri, mayaQrUri };
}


// ─── Batches (FEFO) ──────────────────────────────────────────────────────────

export async function fetchBatches(storeId: string): Promise<ProductBatch[]> {
  const { data, error } = await supabase
    .from("product_batches")
    .select("*")
    .eq("store_id", storeId)
    .order("expiry_date", { ascending: true });

  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id,
    batchNumber: row.batch_number,
    quantity: Number(row.quantity),
    expiryDate: row.expiry_date,
    unitCost: Number(row.unit_cost),
    createdAt: row.created_at,
  }));
}

export async function upsertBatch(storeId: string, batch: ProductBatch): Promise<boolean> {
  const { error } = await supabase
    .from("product_batches")
    .upsert({
      id: batch.id.startsWith("batch-") ? undefined : batch.id,
      store_id: storeId,
      product_id: batch.productId,
      batch_number: batch.batchNumber,
      quantity: batch.quantity,
      expiry_date: batch.expiryDate,
      unit_cost: batch.unitCost,
      created_at: batch.createdAt,
    });
  return !error;
}

export async function removeBatch(batchId: string): Promise<boolean> {
  const { error } = await supabase
    .from("product_batches")
    .delete()
    .eq("id", batchId);
  return !error;
}

// ─── Cash Shifts ─────────────────────────────────────────────────────────────

export async function fetchCashShifts(storeId: string): Promise<CashShift[]> {
  const { data, error } = await supabase
    .from("cash_shifts")
    .select("*")
    .eq("store_id", storeId)
    .order("opened_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    cashierId: row.cashier_id ?? undefined,
    cashierName: row.cashier_name,
    openingFloat: Number(row.opening_float),
    expectedCash: Number(row.expected_cash),
    countedCash: row.counted_cash != null ? Number(row.counted_cash) : undefined,
    variance: row.variance != null ? Number(row.variance) : undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? undefined,
  }));
}

export async function insertCashShift(storeId: string, shift: CashShift): Promise<{ success: boolean; id?: string }> {
  const { data, error } = await supabase
    .from("cash_shifts")
    .insert({
      store_id: storeId,
      cashier_id: shift.cashierId ?? null,
      cashier_name: shift.cashierName,
      opening_float: shift.openingFloat,
      expected_cash: shift.expectedCash,
      status: shift.status,
      notes: shift.notes ?? null,
      opened_at: shift.openedAt,
    })
    .select("id")
    .single();

  if (error || !data) return { success: false };
  return { success: true, id: data.id };
}

export async function closeCashShift(
  shiftId: string,
  countedCash: number,
  expectedCash: number,
  variance: number,
  notes?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("cash_shifts")
    .update({
      counted_cash: countedCash,
      expected_cash: expectedCash,
      variance,
      status: "closed",
      notes: notes ?? null,
      closed_at: new Date().toISOString(),
    })
    .eq("id", shiftId);

  return !error;
}
