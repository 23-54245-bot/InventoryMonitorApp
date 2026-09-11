import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppLanguage } from "../lib/i18n";

import {
    CartItem,
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
    SaleItem,
    SaleTransaction,
    StockMovement,
    TeamMember,
} from "../data/freshmart";
import { readStoredString, writeStoredString } from "../lib/storage";
import { supabase } from "../lib/supabase";
import {
    fetchMovements,
    fetchNotifications,
    fetchProducts,
    fetchSales,
    insertMovement,
    insertNotification,
    insertSale,
    removeNotification,
    removeProduct,
    updateAllNotificationsRead,
    updateNotificationRead,
    upsertProduct,
} from "../lib/supabase-store";
import { useAuth } from "./auth";

type StoreContextValue = {
  state: FreshMartState;
  summary: ReturnType<typeof getDashboardSummary>;
  categoryBreakdown: ReturnType<typeof getCategoryBreakdown>;
  weeklyActivity: ReturnType<typeof getWeeklyActivitySeries>;
  notifications: NotificationItem[];
  recentActivity: ReturnType<typeof getRecentActivity>;
  teamMembers: TeamMember[];
  sales: SaleTransaction[];
  processCheckout: (checkoutData: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    amountTendered: number;
    discount?: number;
    tax?: number;
    note?: string;
  }) => Promise<{ success: boolean; sale?: SaleTransaction; error?: string }>;
  loadSales: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  getProductBySku: (sku: string) => Product | undefined;
  stockIn: (productId: string, quantity: number, performedBy?: string, note?: string, timestamp?: string) => void;
  stockOut: (productId: string, quantity: number, performedBy?: string, note?: string, timestamp?: string, reason?: "sale" | "damaged" | "expired" | "adjustment") => void;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, patch: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  toggleNotificationPreference: () => void;
  toggleBiometricPreference: () => void;
  toggleDarkMode: () => void;
  setLanguage: (language: AppLanguage) => void;
  updateUserProfile: (patch: Partial<Pick<FreshMartState["user"], "name" | "username" | "email" | "storeEmail" | "phone" | "address" | "storeName" | "businessHours" | "permitNumber" | "avatarUri" | "avatarInitials">>) => void;
  updateTeamMemberAccess: (memberId: string, accessLevel: "Admin" | "Staff" | "Viewer") => void;
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, isReady: authReady } = useAuth();
  const [state, setState] = useState<FreshMartState>(() => createState());
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const loadedStorageKey = useRef<string | null>(null);

  // Preferences-only AsyncStorage key (products/movements/notifications now live in Supabase)
  const prefsStorageKey = session
    ? `${STORAGE_KEY}.prefs.${encodeURIComponent(session.email.toLowerCase())}`
    : null;

  // ── Load on login ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authReady) return;

    void writeStoredString(LEGACY_STORAGE_KEY, null);
    loadedStorageKey.current = null;
    const accountSession = session;

    if (!accountSession) {
      setState(createState());
      setSales([]);
      loadedStorageKey.current = STORAGE_KEY;
      return;
    }

    let active = true;

    void (async () => {
      try {
        // 1. Resolve store_id from Supabase profile
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

        const accountWithStoreId = { ...accountSession, storeId: accountStoreId };

        // 2. Load user preferences from AsyncStorage (stays local)
        let savedPrefs: Partial<FreshMartState> = {};
        if (prefsStorageKey) {
          const stored = await readStoredString(prefsStorageKey);
          if (stored) {
            try { savedPrefs = JSON.parse(stored) as Partial<FreshMartState>; } catch { /* ignore */ }
          }
        }

        // 3. Load inventory data from Supabase (or empty if no store yet)
        const [products, movements, notifications, loadedSales] = accountStoreId
          ? await Promise.all([
              fetchProducts(accountStoreId),
              fetchMovements(accountStoreId),
              fetchNotifications(accountStoreId),
              fetchSales(accountStoreId),
            ])
          : [[], [], [], []] as [Product[], StockMovement[], NotificationItem[], SaleTransaction[]];

        if (active) {
          setSales(loadedSales);
          setState(createState(
            { ...savedPrefs, products, movements, notifications },
            accountWithStoreId,
          ));
          loadedStorageKey.current = prefsStorageKey ?? STORAGE_KEY;
        }
      } catch {
        if (active) {
          setState(createState(undefined, { ...accountSession }));
          setSales([]);
          loadedStorageKey.current = prefsStorageKey ?? STORAGE_KEY;
        }
      }
    })();

    return () => { active = false; };
  }, [authReady, session?.email]);

  // ── Persist user preferences to AsyncStorage ───────────────────────────────
  useEffect(() => {
    if (!prefsStorageKey || loadedStorageKey.current !== prefsStorageKey) return;
    // Only save user preferences, not the full inventory (that's in Supabase)
    const prefsOnly: Partial<FreshMartState> = { user: state.user, teamMembers: state.teamMembers };
    void writeStoredString(prefsStorageKey, JSON.stringify(prefsOnly));
  }, [state.user, state.teamMembers, prefsStorageKey]);

  const mutate = (updater: (current: FreshMartState) => FreshMartState) => {
    setState((current) => updater(current));
  };

  // Returns the current storeId from state for Supabase writes
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
        id: `M-${Date.now()}`,
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

        // Optimistic Supabase write (background)
        const storeId = current.user.storeId;
        if (storeId) {
          const updatedProduct = products.find((p) => p.id === productId);
          if (updatedProduct) {
            void upsertProduct(storeId, updatedProduct);
          }
          void getUserId().then((uid) => {
            if (newMovement) void insertMovement(storeId, uid, newMovement);
          });
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
  }): Promise<{ success: boolean; sale?: SaleTransaction; error?: string }> => {
    const { items, paymentMethod, amountTendered, discount = 0, tax = 0, note } = checkoutData;
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
    const changeAmount = Math.max(0, amountTendered - totalAmount);
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();
    const cashierName = state.user.name || "Cashier";

    const saleItems: SaleItem[] = items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    }));

    const sale: SaleTransaction = {
      id: `sale-${Date.now()}`,
      receiptNumber,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discount,
      tax,
      totalAmount,
      paymentMethod,
      amountTendered,
      changeAmount,
      cashierName,
      note,
      timestamp,
      items: saleItems,
    };

    const newMovements: StockMovement[] = [];
    const newNotifications: NotificationItem[] = [];
    const updatedProductsList: Product[] = [];

    mutate((current) => {
      const itemMap = new Map(items.map((i) => [i.product.id, i.quantity]));
      const nextProducts = current.products.map((prod) => {
        const qtyToDeduct = itemMap.get(prod.id);
        if (!qtyToDeduct) return prod;
        const nextStock = Math.max(0, prod.currentStock - qtyToDeduct);
        const updated = { ...prod, currentStock: nextStock, updatedAt: timestamp };
        updatedProductsList.push(updated);
        return updated;
      });

      const nextMovements = [...current.movements];
      const nextNotifications = [...current.notifications];

      for (const item of items) {
        const m: StockMovement = {
          id: `M-${Date.now()}-${item.product.id.slice(-4)}`,
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

    setSales((prev) => [sale, ...prev]);

    const storeId = state.user.storeId;
    if (storeId) {
      for (const prod of updatedProductsList) {
        void upsertProduct(storeId, prod);
      }
      void getUserId().then((uid) => {
        for (const mov of newMovements) {
          void insertMovement(storeId, uid, mov);
        }
        void insertSale(storeId, uid, sale);
      });
      for (const notif of newNotifications) {
        void insertNotification(storeId, notif);
      }
    }

    return { success: true, sale };
  };

  const value = useMemo<StoreContextValue>(() => {
    const summary = getDashboardSummary(state.products, state.movements, state.notifications);
    const categoryBreakdown = getCategoryBreakdown(state.products);
    const weeklyActivity = getWeeklyActivitySeries(state.movements);
    const notifications = getNotifications(state.notifications);
    const recentActivity = getRecentActivity(state.products, state.movements);

    return {
      state,
      summary,
      categoryBreakdown,
      weeklyActivity,
      notifications,
      recentActivity,
      teamMembers: state.teamMembers,
      sales,
      processCheckout,
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
          void upsertProduct(storeId, product);
          void insertNotification(storeId, notification);
        }
      },

      updateProduct: (productId, patch) => {
        const storeId = getStoreId();
        mutate((current) => {
          const products = current.products.map((product) =>
            product.id === productId ? { ...product, ...patch, updatedAt: new Date().toISOString() } : product,
          );
          if (storeId) {
            const updated = products.find((p) => p.id === productId);
            if (updated) void upsertProduct(storeId, updated);
          }
          return { ...current, products };
        });
      },

      deleteProduct: (productId) => {
        mutate((current) => ({
          ...current,
          products: current.products.filter((product) => product.id !== productId),
        }));
        void removeProduct(productId);
      },

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
    };
  }, [state, sales]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }

  return context;
}
