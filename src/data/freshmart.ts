import type { AppLanguage } from "../lib/i18n";

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitType: string;
  currentStock: number;
  maxStock: number;
  lowStockThreshold: number;
  unitPrice: number;
  srpPrice?: number;
  expiryDate?: string;
  manufacturingDate?: string;
  hasTingi?: boolean;
  tingiUnit?: string;
  tingiConversionRate?: number;
  tingiPrice?: number;
  icon: string;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  productId: string;
  type: "in" | "out";
  reason?: "sale" | "damaged" | "expired" | "adjustment";
  quantity: number;
  performedBy: string;
  timestamp: string;
  note?: string;
};

export type NotificationType = "low_stock" | "expiry" | "stock_received" | "stock_out" | "info";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedProductId?: string;
  isRead: boolean;
  createdAt: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
  price: number;
};

export type SaleItem = {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitCost?: number;
};

export type PaymentMethod = "cash" | "card" | "e_wallet" | "credit" | "split" | "other";

export type CustomerRiskStatus = "good" | "warning" | "blacklisted";

export type Customer = {
  id: string;
  storeId?: string;
  name: string;
  phone: string;
  address?: string;
  creditLimit: number;
  totalDebt: number;
  loyaltyPoints: number;
  riskStatus: CustomerRiskStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type DebtStatus = "unpaid" | "partial" | "paid";

export type Debt = {
  id: string;
  storeId?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  saleId?: string;
  amount: number;
  amountPaid: number;
  balance: number;
  status: DebtStatus;
  dueDate?: string;
  note?: string;
  itemsSummary?: string;
  createdAt: string;
  updatedAt: string;
};

export type DebtPayment = {
  id: string;
  storeId?: string;
  debtId: string;
  customerId: string;
  amount: number;
  paymentMethod: "cash" | "gcash" | "maya" | "other";
  referenceNumber?: string;
  recordedBy: string;
  note?: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  storeId?: string;
  actorId?: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
};

export type StorePaymentQRs = {
  gcashName?: string;
  gcashNumber?: string;
  gcashQrUri?: string;
  mayaName?: string;
  mayaNumber?: string;
  mayaQrUri?: string;
};

export type SaleTransaction = {
  id: string;
  receiptNumber: string;
  totalItems: number;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeAmount: number;
  cashierName: string;
  note?: string;
  timestamp: string;
  items: SaleItem[];
  customerId?: string;
  customerName?: string;
  referenceNumber?: string;
  splitCashAmount?: number;
  splitOtherAmount?: number;
  splitOtherMethod?: "e_wallet" | "credit";
  status?: "completed" | "voided" | "refunded";
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
};

export type ProductBatch = {
  id: string;
  storeId?: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  unitCost: number;
  createdAt: string;
};

export type CashShift = {
  id: string;
  storeId?: string;
  cashierId?: string;
  cashierName: string;
  openingFloat: number;
  expectedCash: number;
  countedCash?: number;
  variance?: number;
  status: "open" | "closed";
  notes?: string;
  openedAt: string;
  closedAt?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  storeEmail: string;
  storeId?: string;
  phone?: string;
  address?: string;
  role: "Store Owner" | "Staff" | "Viewer";
  avatarInitials: string;
  avatarUri?: string;
  storeName: string;
  businessHours?: string;
  permitNumber?: string;
  storeQRs?: StorePaymentQRs;
  accessLevel: "Admin" | "Staff" | "Viewer";
  preferences: {
    notificationsEnabled: boolean;
    biometricEnabled: boolean;
    darkMode: boolean;
    language: AppLanguage;
    defaultCreditLimit?: number;
    managerPin?: string;
  };
};

export type TeamMember = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "Manager" | "Staff" | "Viewer";
  accessLevel: "Admin" | "Staff" | "Viewer";
  avatarUri?: string;
};

export type FreshMartState = {
  ownerEmail?: string;
  products: Product[];
  movements: StockMovement[];
  notifications: NotificationItem[];
  user: UserProfile;
  teamMembers: TeamMember[];
};

export function formatRelativeTime(isoDate: string) {
  const elapsedMinutes = Math.round(Math.max(Date.now() - new Date(isoDate).getTime(), 0) / (1000 * 60));
  if (elapsedMinutes < 60) return `${Math.max(elapsedMinutes, 1)} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  const elapsedDays = Math.max(Math.round(elapsedHours / 24), 1);
  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
}

export function getProductStatus(product: Product) {
  if (product.currentStock <= 0) return { label: "Out of Stock", tone: "critical" as const };
  if (product.currentStock <= product.lowStockThreshold) return { label: "Low Stock", tone: "warning" as const };
  return { label: "In Stock", tone: "healthy" as const };
}

export function getSafetyStockStatus(product: Product) {
  const ratio = product.lowStockThreshold <= 0 ? 1 : product.currentStock / product.lowStockThreshold;
  if (product.currentStock <= 0) return { label: "Out of Stock", tone: "critical" as const, ratio: 0 };
  if (product.currentStock <= product.lowStockThreshold) return { label: "Below safety stock", tone: "warning" as const, ratio };
  return { label: "Healthy safety margin", tone: "healthy" as const, ratio };
}

export function getExpiryStatus(product: Product) {
  if (!product.expiryDate) return { label: "No expiry date added", tone: "neutral" as const, daysLeft: null };
  const diffDays = Math.ceil((new Date(product.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Expired", tone: "critical" as const, daysLeft: diffDays };
  if (diffDays <= 14) return { label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`, tone: "warning" as const, daysLeft: diffDays };
  return { label: `${diffDays} days left`, tone: "healthy" as const, daysLeft: diffDays };
}

export function getLowStockProducts(products: Product[]) {
  return products.filter((product) => product.currentStock <= product.lowStockThreshold).sort((left, right) => left.currentStock - right.currentStock);
}

export function getExpiringProducts(products: Product[]) {
  return products.filter((product) => product.expiryDate).sort((left, right) => new Date(left.expiryDate ?? 0).getTime() - new Date(right.expiryDate ?? 0).getTime());
}

export function getDashboardSummary(products: Product[], movements: StockMovement[], notifications: NotificationItem[]) {
  const totalProducts = products.length;
  const inStock = products.filter((product) => product.currentStock > product.lowStockThreshold).length;
  const lowStock = products.filter((product) => product.currentStock > 0 && product.currentStock <= product.lowStockThreshold).length;
  const outOfStock = products.filter((product) => product.currentStock <= 0).length;
  return {
    totalProducts,
    inStock,
    lowStock,
    outOfStock,
    totalUnits: products.reduce((sum, product) => sum + product.currentStock, 0),
    unreadNotifications: notifications.filter((notification) => !notification.isRead).length,
    totalTransactions: movements.length,
    alertsResolved: notifications.filter((notification) => notification.isRead).length,
  };
}

export function getCategoryBreakdown(products: Product[]) {
  const bucket = new Map<string, number>();
  products.forEach((product) => bucket.set(product.category, (bucket.get(product.category) ?? 0) + product.currentStock));
  return Array.from(bucket.entries()).map(([name, value], index) => ({
    name,
    value,
    color: ["#2952E3", "#22C55E", "#F59E0B", "#7C3AED", "#06B6D4", "#EF4444"][index % 6],
  }));
}

export function getRecentActivity(products: Product[], movements: StockMovement[], limit = 6) {
  const productById = new Map(products.map((product) => [product.id, product] as const));
  return [...movements]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, limit)
    .map((movement) => ({ ...movement, productName: productById.get(movement.productId)?.name ?? movement.productId, productIcon: productById.get(movement.productId)?.icon ?? "📦" }));
}

export function getWeeklyActivitySeries(movements: StockMovement[]) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });
  const stockIn = Array(7).fill(0) as number[];
  const stockOut = Array(7).fill(0) as number[];
  movements.forEach((movement) => {
    const dayIndex = Math.floor((new Date(movement.timestamp).getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIndex < 0 || dayIndex > 6) return;
    if (movement.type === "in") stockIn[dayIndex] += movement.quantity;
    if (movement.type === "out") stockOut[dayIndex] += movement.quantity;
  });
  const totalIn = stockIn.reduce((sum, value) => sum + value, 0);
  const totalOut = stockOut.reduce((sum, value) => sum + value, 0);
  return {
    labels,
    stockIn,
    stockOut,
    selectedRange: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    totalIn,
    totalOut,
    turnover: (totalOut / Math.max(totalIn, 1)) * 100,
  };
}

export function getNotifications(notifications: NotificationItem[]) {
  return [...notifications].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function findProductById(productId: string, products: Product[]) {
  return products.find((product) => product.id === productId);
}

export function findProductBySku(sku: string, products: Product[]) {
  const normalized = sku.trim().toLowerCase();
  return products.find((product) => product.sku.toLowerCase() === normalized || product.id.toLowerCase() === normalized);
}

export function getCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}
