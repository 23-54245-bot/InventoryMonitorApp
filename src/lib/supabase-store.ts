/**
 * supabase-store.ts
 * All Supabase queries for the StoreProvider.
 * Each function maps between the app's camelCase Product/StockMovement/NotificationItem
 * types and the database's snake_case column names.
 */

import type { NotificationItem, Product, SaleTransaction, StockMovement } from "../data/freshmart";
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

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToProduct);
}

export async function upsertProduct(storeId: string, product: Product): Promise<boolean> {
  const { error } = await supabase
    .from("products")
    .upsert(productToRow(storeId, product), { onConflict: "id" });
  return !error;
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

export async function insertMovement(
  storeId: string,
  userId: string,
  movement: StockMovement,
): Promise<boolean> {
  const { error } = await supabase.from("stock_movements").insert({
    store_id: storeId,
    product_id: movement.productId,
    user_id: userId,
    type: movement.type,
    reason: movement.reason ?? null,
    quantity: movement.quantity,
    performed_by: movement.performedBy,
    note: movement.note ?? null,
  });
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

  if (error || !data) return [];
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

  if (error || !data) return [];

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
    items: (row.sale_items ?? []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku ?? "",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
    })),
  }));
}

export async function insertSale(
  storeId: string,
  userId: string,
  sale: SaleTransaction,
): Promise<{ success: boolean; saleId?: string }> {
  const { data: saleRow, error: saleError } = await supabase
    .from("sales")
    .insert({
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
      created_at: sale.timestamp,
    })
    .select("id")
    .single();

  if (saleError || !saleRow) {
    return { success: false };
  }

  const saleId = saleRow.id;

  if (sale.items.length > 0) {
    const itemsToInsert = sale.items.map((item) => ({
      sale_id: saleId,
      product_id: item.productId || null,
      product_name: item.productName,
      sku: item.sku ?? "",
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      created_at: sale.timestamp,
    }));

    await supabase.from("sale_items").insert(itemsToInsert);
  }

  return { success: true, saleId };
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

  if (error || !data) return [];
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

export async function insertDebt(storeId: string, debt: any): Promise<boolean> {
  const { error } = await supabase.from("debts").insert({
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
  });
  return !error;
}

export async function updateDebtPayment(
  storeId: string,
  debtId: string,
  customerId: string,
  payment: {
    amount: number;
    paymentMethod: "cash" | "gcash" | "maya" | "other";
    referenceNumber?: string;
    recordedBy: string;
    note?: string;
  },
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

  // Insert payment log
  await supabase.from("debt_payments").insert({
    store_id: storeId,
    debt_id: debtId,
    customer_id: customerId,
    amount: payment.amount,
    payment_method: payment.paymentMethod,
    reference_number: payment.referenceNumber ?? null,
    recorded_by: payment.recordedBy,
    note: payment.note ?? null,
  });

  return true;
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

export async function updateStoreQRs(
  storeId: string,
  qrs: {
    gcashName?: string;
    gcashNumber?: string;
    gcashQrUri?: string;
    mayaName?: string;
    mayaNumber?: string;
    mayaQrUri?: string;
  },
): Promise<boolean> {
  const { error } = await supabase
    .from("stores")
    .update({
      gcash_name: qrs.gcashName ?? null,
      gcash_number: qrs.gcashNumber ?? null,
      gcash_qr_url: qrs.gcashQrUri ?? null,
      maya_name: qrs.mayaName ?? null,
      maya_number: qrs.mayaNumber ?? null,
      maya_qr_url: qrs.mayaQrUri ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);
  return !error;
}
