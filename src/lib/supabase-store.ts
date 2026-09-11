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

