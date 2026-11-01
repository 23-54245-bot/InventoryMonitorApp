export type HelpStep = {
  stepNumber: number;
  title?: string;
  instruction: string;
};

export type HelpTopic = {
  id: string;
  title: string;
  category: "Getting Started" | "Selling & Credit" | "Inventory" | "Reports" | "Account & Settings" | "Operations & Maintenance";
  summary: string;
  keywords: string[];
  steps: HelpStep[];
};

export const HELP_CATEGORIES = [
  "Getting Started",
  "Selling & Credit",
  "Inventory",
  "Reports",
  "Account & Settings",
  "Operations & Maintenance",
] as const;

export const HELP_TOPICS: HelpTopic[] = [
  // Getting Started
  {
    id: "getting-started-overview",
    title: "Quick Tour of Your Store Dashboard",
    category: "Getting Started",
    summary: "Learn what the numbers mean and how to navigate around your store.",
    keywords: ["home", "dashboard", "overview", "start", "basics", "stats"],
    steps: [
      { stepNumber: 1, instruction: "Look at the top row to see your total items, healthy stock, low stock, and out-of-stock counts at a glance." },
      { stepNumber: 2, instruction: "Check the attention line right below your store name to see if any items need urgent restocking today." },
      { stepNumber: 3, instruction: "Tap the floating plus (+) button at the bottom right to quickly open the Cash Register, record a delivery, or add a product." },
      { stepNumber: 4, instruction: "Scroll down to check Recent Activity to see the latest stock movements and sales." },
    ],
  },
  {
    id: "getting-started-store-info",
    title: "Setting Up Your Store Details",
    category: "Getting Started",
    summary: "Add your store name and contact details so they appear on receipts and reports.",
    keywords: ["store", "name", "receipt", "business", "profile", "address"],
    steps: [
      { stepNumber: 1, instruction: "Go to the Profile tab from the bottom navigation bar (or the left sidebar on laptop)." },
      { stepNumber: 2, instruction: "Tap the Store tab at the top of the profile page." },
      { stepNumber: 3, instruction: "Type in your Store Name, Address, Contact Number, and Currency preference." },
      { stepNumber: 4, instruction: "Tap Save Store Info to keep your updates." },
    ],
  },

  // Selling & Credit
  {
    id: "pos-make-sale",
    title: "Making a Sale at the Cash Register (POS)",
    category: "Selling & Credit",
    summary: "Ring up customer purchases and accept cash, GCash, or Maya.",
    keywords: ["pos", "checkout", "sale", "cash register", "payment", "receipt", "sell"],
    steps: [
      { stepNumber: 1, instruction: "Tap the Cash Register icon in the header or select POS from the Quick Actions (+) menu." },
      { stepNumber: 2, instruction: "Tap on any item to add it to the cart, or use the barcode scanner button at the top to scan its barcode." },
      { stepNumber: 3, instruction: "Tap the cart bar at the bottom to review quantities and adjust items if needed." },
      { stepNumber: 4, instruction: "Tap Charge / Checkout, choose the customer payment method (Cash, GCash, or Maya), and enter the amount tendered." },
      { stepNumber: 5, instruction: "Tap Complete Sale to deduct items from inventory and generate a digital receipt you can print or download." },
    ],
  },
  {
    id: "utang-record-credit",
    title: "Recording Customer Credit",
    category: "Selling & Credit",
    summary: "Keep track of customer balances without losing notebook pages.",
    keywords: ["utang", "credit", "debt", "lista", "customer", "borrow"],
    steps: [
      { stepNumber: 1, instruction: "Open Credit Tracker from the Quick Actions (+) menu or your store shortcuts." },
      { stepNumber: 2, instruction: "Tap Record New Credit Account at the top." },
      { stepNumber: 3, instruction: "Select an existing customer or type a new customer name and phone number." },
      { stepNumber: 4, instruction: "Enter the amount owed, select a due date, and write a quick note describing the items taken." },
      { stepNumber: 5, instruction: "Tap Record Credit. The customer balance will automatically update and highlight overdue dates." },
    ],
  },
  {
    id: "utang-record-payment",
    title: "Recording a Credit Payment",
    category: "Selling & Credit",
    summary: "Record full or partial payments against a customer's credit balance.",
    keywords: ["credit payment", "pay credit", "payment", "settle", "utang", "balance", "receipt", "gcash", "maya"],
    steps: [
      { stepNumber: 1, instruction: "Open Credit Tracker and find the customer's unpaid or overdue credit record." },
      { stepNumber: 2, instruction: "Tap Pay on that record." },
      { stepNumber: 3, instruction: "Enter the amount received, or use Full Balance or Half, then select Cash, GCash, or Maya. A partial payment cannot be more than the balance due." },
      { stepNumber: 4, instruction: "For GCash or Maya, enter the payment reference number if available. You can also add an optional note." },
      { stepNumber: 5, instruction: "Tap Confirm Payment. The balance is reduced, and the record is marked Paid when the balance reaches zero." },
    ],
  },

  // Inventory
  {
    id: "inventory-add-product",
    title: "Adding a New Item to Your Shelf",
    category: "Inventory",
    summary: "Add new products with barcodes, cost prices, selling prices, and reorder alerts.",
    keywords: ["add", "product", "item", "new", "shelf", "sku", "price", "srp"],
    steps: [
      { stepNumber: 1, instruction: "Tap the (+) icon in the Inventory tab or tap Add Product from the floating menu." },
      { stepNumber: 2, instruction: "Type the Product Name and select its Category (or create a new category)." },
      { stepNumber: 3, instruction: "Enter or scan the Barcode (SKU) so you can scan it later during checkout." },
      { stepNumber: 4, instruction: "Enter your Cost Price (what you bought it for) and Retail Price / SRP (what you sell it for)." },
      { stepNumber: 5, instruction: "Set the Low Stock Alert limit (e.g. 5 units) so the app notifies you when supplies run low." },
      { stepNumber: 6, instruction: "Tap Save Product to put it on your inventory shelf." },
    ],
  },
  {
    id: "inventory-stock-in",
    title: "Stocking In New Deliveries",
    category: "Inventory",
    summary: "Increase your stock counts when distributor shipments arrive.",
    keywords: ["stock in", "delivery", "supplier", "restock", "receive", "incoming"],
    steps: [
      { stepNumber: 1, instruction: "Tap Stock In from the Quick Actions (+) menu on the home screen." },
      { stepNumber: 2, instruction: "Select the product you received from the dropdown list." },
      { stepNumber: 3, instruction: "Use the (+) and (-) stepper buttons to enter how many units you received." },
      { stepNumber: 4, instruction: "Optionally add the supplier name or invoice number for your records." },
      { stepNumber: 5, instruction: "Tap Confirm Stock In. Your total inventory will immediately increase." },
    ],
  },
  {
    id: "inventory-stock-out",
    title: "Recording Wastage, Expired, or Damaged Items",
    category: "Inventory",
    summary: "Deduct items that were damaged, expired, or lost so your stock count stays truthful.",
    keywords: ["stock out", "damaged", "expired", "wastage", "loss", "remove"],
    steps: [
      { stepNumber: 1, instruction: "Tap Stock Out from the Quick Actions (+) menu." },
      { stepNumber: 2, instruction: "Select the product you need to deduct." },
      { stepNumber: 3, instruction: "Choose the reason: Damaged, Expired, or Adjustment." },
      { stepNumber: 4, instruction: "Enter the number of units to remove and tap Confirm Stock Out." },
    ],
  },
  {
    id: "inventory-barcode-scan",
    title: "Scanning Barcodes with Your Camera",
    category: "Inventory",
    summary: "Use your device camera to look up products instantly without typing.",
    keywords: ["scan", "camera", "barcode", "upc", "qr"],
    steps: [
      { stepNumber: 1, instruction: "Tap the barcode icon in the Inventory header or inside the Cash Register." },
      { stepNumber: 2, instruction: "If prompted, allow camera permissions on your phone or web browser." },
      { stepNumber: 3, instruction: "Align the product barcode within the scanning box until it beeps or flashes." },
      { stepNumber: 4, instruction: "The product details will automatically open on screen." },
    ],
  },

  // Reports
  {
    id: "reports-activity",
    title: "Checking Weekly and Monthly Activity",
    category: "Reports",
    summary: "See trends in what was stocked in, sold, and wasted over time.",
    keywords: ["reports", "charts", "trends", "weekly", "monthly", "turnover"],
    steps: [
      { stepNumber: 1, instruction: "Tap the Reports tab on the bottom bar or left sidebar." },
      { stepNumber: 2, instruction: "Switch between the Weekly and Monthly tabs at the top." },
      { stepNumber: 3, instruction: "Look at the trend line chart: navy line represents incoming items, amber line represents outgoing items." },
      { stepNumber: 4, instruction: "Check the Inventory Turnover percentage to see how quickly goods are selling." },
    ],
  },
  {
    id: "reports-export",
    title: "Exporting to Excel or Word Document",
    category: "Reports",
    summary: "Download your inventory or activity log for offline records or printing.",
    keywords: ["export", "excel", "word", "csv", "download", "print"],
    steps: [
      { stepNumber: 1, instruction: "Open the Reports tab or the Profile tab." },
      { stepNumber: 2, instruction: "Tap the Export Inventory button or Export Activity Log." },
      { stepNumber: 3, instruction: "Choose Excel (.csv / .xls), Word (.doc), or Printable PDF." },
      { stepNumber: 4, instruction: "On mobile, choose where to save or share. On web, the file will download straight to your browser." },
    ],
  },

  // Account & Settings
  {
    id: "settings-theme-language",
    title: "Switching Dark Mode and Language",
    category: "Account & Settings",
    summary: "Customize the display for night-time use or switch languages.",
    keywords: ["dark mode", "light mode", "theme", "language", "tagalog", "english", "filipino"],
    steps: [
      { stepNumber: 1, instruction: "Tap the Settings gear icon in the top right of the Profile tab (or in the desktop sidebar footer)." },
      { stepNumber: 2, instruction: "Toggle the Dark Theme switch to turn dark mode on or off." },
      { stepNumber: 3, instruction: "Tap Language to switch between English and Tagalog." },
    ],
  },
  {
    id: "settings-team-members",
    title: "Managing Cashiers and Staff Accounts",
    category: "Account & Settings",
    summary: "Invite co-workers or family members to help manage your store.",
    keywords: ["team", "staff", "cashier", "manager", "admin", "roles", "employee"],
    steps: [
      { stepNumber: 1, instruction: "Go to the Profile tab and tap the Team tab." },
      { stepNumber: 2, instruction: "Tap Invite Member or Add Staff." },
      { stepNumber: 3, instruction: "Enter their email and assign their role: Staff (sales and checkout), Manager (inventory and reports), or Admin (full control)." },
      { stepNumber: 4, instruction: "They will receive an email invitation to log into your store." },
    ],
  },

  // Advanced Operations & Retail Workflows
  {
    id: "pos-void-sale",
    title: "Voiding or Cancelling a Mistaken Sale",
    category: "Selling & Credit",
    summary: "Cancel an accidental transaction and return products back to shelf stock.",
    keywords: ["void", "cancel", "refund", "mistake", "sales history", "receipt"],
    steps: [
      { stepNumber: 1, instruction: "Open Sales History from the POS header or the Quick Actions menu." },
      { stepNumber: 2, instruction: "Find the transaction you need to cancel and tap it to expand details." },
      { stepNumber: 3, instruction: "Tap the red 'Void' button (available for Store Owners and Managers)." },
      { stepNumber: 4, instruction: "Enter the reason for cancellation (e.g., 'Customer changed mind')." },
      { stepNumber: 5, instruction: "Tap Confirm Void. The items are restored to inventory and the sale is tagged VOIDED." },
    ],
  },
  {
    id: "shifts-cash-reconciliation",
    title: "Cash Drawer Shifts & Daily Reconciliation",
    category: "Selling & Credit",
    summary: "Open your morning register float and verify closing cash to prevent drawer shortages.",
    keywords: ["shift", "drawer", "cash", "float", "closing", "variance", "shortage", "overage"],
    steps: [
      { stepNumber: 1, instruction: "Go to Profile → Store tab, and scroll to the Cash Shifts & Drawer card." },
      { stepNumber: 2, instruction: "Tap 'Open Register / Start Shift' and declare your starting cash float (e.g., ₱500)." },
      { stepNumber: 3, instruction: "Conduct daily transactions normally at the POS register." },
      { stepNumber: 4, instruction: "At the end of the shift, tap 'End Shift & Count Drawer'." },
      { stepNumber: 5, instruction: "Count your physical bills and coins, enter the total, and check the live variance calculation (balanced, shortage, or overage)." },
    ],
  },
  {
    id: "inventory-fefo-batches",
    title: "FEFO Batch & Expiry Lot Tracking",
    category: "Inventory",
    summary: "Track product lot numbers and prioritize selling batches that expire earliest (FEFO).",
    keywords: ["batch", "fefo", "lot", "expiry", "expiration", "spoilage", "perishable"],
    steps: [
      { stepNumber: 1, instruction: "Open any product from the Inventory tab to view its detail page." },
      { stepNumber: 2, instruction: "Tap the 'FEFO Batches' button under Stock Actions." },
      { stepNumber: 3, instruction: "Enter the manufacturer Lot Number (e.g. LOT-2026-A), batch quantity, unit cost, and expiry date." },
      { stepNumber: 4, instruction: "Tap Add Batch. The app automatically organizes batches from earliest to latest expiring." },
      { stepNumber: 5, instruction: "Products nearing expiration show warning badges so you can discount or sell them first." },
    ],
  },
  {
    id: "inventory-tingi-selling",
    title: "Tingi / Fractional Selling (Sachets & Sticks)",
    category: "Inventory",
    summary: "Break bulk boxes into individual retail units and maximize store profit margins.",
    keywords: ["tingi", "sachet", "stick", "fractional", "unit splitting", "retail", "profit"],
    steps: [
      { stepNumber: 1, instruction: "Open a bulk product (e.g., a pack of cigarettes or box of coffee sachets) in Inventory." },
      { stepNumber: 2, instruction: "Tap the 'Tingi Config' button under Stock Actions." },
      { stepNumber: 3, instruction: "Toggle 'Enable Tingi for this Product' to active." },
      { stepNumber: 4, instruction: "Set the unit name (e.g., 'stick', 'sachet') and units per pack (e.g., 20 sticks per pack)." },
      { stepNumber: 5, instruction: "Set the retail price per tingi piece (e.g., ₱8) and review the live profit comparison." },
      { stepNumber: 6, instruction: "Tap Save Configuration. Cashiers can now sell either full packs or individual pieces." },
    ],
  },
  {
    id: "orders-purchase-order",
    title: "Creating and Receiving Purchase Orders",
    category: "Inventory",
    summary: "Create supplier orders, track deliveries, and update inventory as items arrive.",
    keywords: ["purchase order", "delivery", "distributor", "supplier", "inflow", "receive", "stock"],
    steps: [
      { stepNumber: 1, instruction: "Open Purchase Orders from the Quick Actions (+) menu or store shortcuts." },
      { stepNumber: 2, instruction: "Enter the supplier and optional invoice number, then search inventory and add the products being ordered." },
      { stepNumber: 3, instruction: "Enter each ordered quantity and unit cost, then tap Create draft order. Draft orders do not change stock." },
      { stepNumber: 4, instruction: "After sending the order to the supplier, tap Mark ordered." },
      { stepNumber: 5, instruction: "When a delivery arrives, tap Receive items, enter the quantities received now, and confirm. Only received quantities are added to stock; you can receive the rest later." },
      { stepNumber: 6, instruction: "If an order or its remaining items will not arrive, use Cancel on the draft or Cancel remaining on the ordered purchase order." },
    ],
  },
  {
    id: "sales-history-review",
    title: "Finding and Refreshing Sales History",
    category: "Selling & Credit",
    summary: "Review recorded sales, filter by payment type, and reload the latest transactions.",
    keywords: ["sales history", "sale", "missing sale", "transaction", "refresh", "receipt", "payment filter"],
    steps: [
      { stepNumber: 1, instruction: "Open Sales History from the Cash Register/POS screen or the Quick Actions (+) menu." },
      { stepNumber: 2, instruction: "Choose a payment filter such as All, Cash, E-Wallet, Credit, or Split to narrow the list." },
      { stepNumber: 3, instruction: "Tap a sale to expand its items and totals. From the expanded sale, you can print, download, or share its receipt." },
      { stepNumber: 4, instruction: "Tap the refresh icon in the header to reload sales. If a sale or update is still missing, check the pending sync queue in Settings." },
    ],
  },
  {
    id: "settings-sync-pending",
    title: "Retrying Pending Sync Changes",
    category: "Account & Settings",
    summary: "Check queued offline changes, retry syncing, and understand any failures.",
    keywords: ["pending sync", "sync now", "offline", "not syncing", "queue", "cloud", "failed changes"],
    steps: [
      { stepNumber: 1, instruction: "Open Settings using the gear button on your Profile screen or the Settings shortcut in the app menu." },
      { stepNumber: 2, instruction: "Under Alerts and Sync, find Offline Sync Queue. Tap the pending-count badge to see queued changes." },
      { stepNumber: 3, instruction: "When your internet connection is available, tap Sync Now and wait for the result." },
      { stepNumber: 4, instruction: "Review how many changes synced, failed, or remain. Read the failure details, fix the reported issue or restore your connection, then try Sync Now again." },
      { stepNumber: 5, instruction: "Clear Queue permanently discards pending changes. Do not use it unless you are certain those changes are no longer needed." },
    ],
  },
  {
    id: "utang-loyalty-points",
    title: "Customer Loyalty Rewards & Cashback",
    category: "Selling & Credit",
    summary: "Reward loyal regular customers with points that convert into checkout discounts.",
    keywords: ["loyalty", "points", "rewards", "cashback", "regular", "discount"],
    steps: [
      { stepNumber: 1, instruction: "Open Credit Tracker and navigate to the Customers tab." },
      { stepNumber: 2, instruction: "Inspect any customer card to see their active ⭐ Loyalty Points balance and progress bar." },
      { stepNumber: 3, instruction: "Points automatically accumulate during POS purchases (1 point = ₱1 cashback value)." },
      { stepNumber: 4, instruction: "During POS checkout, select the customer to redeem available points as an instant discount." },
    ],
  },
  {
    id: "operations-maintenance-manual",
    title: "Operations & Maintenance Manual",
    category: "Operations & Maintenance",
    summary: "Daily store procedures, inventory controls, closing checks, sync, security, and routine maintenance.",
    keywords: ["manual", "operations", "maintenance", "procedures", "opening", "closing", "troubleshooting", "pdf"],
    steps: [
      {
        stepNumber: 1,
        title: "Purpose and responsibilities",
        instruction: "Use this manual as a practical guide for operating StockTrack (Inventory Monitor App) in a retail store. The app records products, stock movements, sales, customer credit, and store activity; staff remain responsible for entering accurate information and reconciling it with physical stock and cash. Store administrators should assign each user an appropriate role, train staff before they transact, and review important records regularly.",
      },
      {
        stepNumber: 2,
        title: "Opening the store",
        instruction: "Sign in with your own account and confirm you are working in the correct store. Check the dashboard for low-stock and out-of-stock items, alerts, and recent activity. Review any pending offline sync changes in Settings before relying on records from another device. If your store uses cash shifts, open the register from Profile → Store → Cash Shifts & Drawer and enter the actual starting float.",
      },
      {
        stepNumber: 3,
        title: "Sales, payments, and customer credit",
        instruction: "At checkout, select or scan each product, verify the item and quantity, review the cart, and select the payment method shown by the customer. Enter the amount received accurately and complete the sale before handing over the receipt. Record customer credit in Credit Tracker against the correct customer, then record each repayment against its credit record. Use Sales History to review a transaction; only authorized users should void a mistaken sale, and the reason should be recorded.",
      },
      {
        stepNumber: 4,
        title: "Receiving deliveries and controlling stock",
        instruction: "Compare each delivery with its supplier order and invoice, count and inspect the items, and record only the quantities actually received. Purchase orders can be received in multiple deliveries; draft orders do not change stock. For deliveries without a purchase order, use Stock In and record supplier or invoice details when available. Record damaged, expired, missing, or corrected quantities with Stock Out and the truthful reason—do not use an adjustment to hide a discrepancy. Keep batch and expiry details current for products that use FEFO tracking.",
      },
      {
        stepNumber: 5,
        title: "Closing and daily reconciliation",
        instruction: "Review Sales History and compare recorded transactions with cash and e-wallet receipts. If a cash shift is open, count the physical drawer and use End Shift & Count Drawer; investigate any shortage or overage instead of changing figures to force a match. Review stock movements, alerts, and any unusual changes. When the device has been offline, restore connectivity and confirm pending changes have synced before ending the day.",
      },
      {
        stepNumber: 6,
        title: "Reports and record keeping",
        instruction: "Use Reports to review weekly or monthly activity and inventory turnover. Export inventory or activity logs from Reports or Profile as CSV, Word, or a printable report where offered. Store exported records in a business-approved, access-controlled location. Exports are useful snapshots, but they are not a complete system backup and do not replace required accounting or statutory records.",
      },
      {
        stepNumber: 7,
        title: "Offline use and synchronization",
        instruction: "Some work can be queued while a device is offline, but other devices may not show those changes until synchronization succeeds. Reconnect to a reliable network, open Settings → Alerts and Sync → Offline Sync Queue, tap Sync Now, and review the synced, failed, and remaining counts. Resolve the specific failure and retry. Never clear the queue unless you have confirmed the pending changes are no longer needed; clearing it permanently discards them.",
      },
      {
        stepNumber: 8,
        title: "Routine maintenance",
        instruction: "Daily: review stock alerts, pending purchase orders, expiry warnings, and sync status. Weekly: verify fast-moving and high-value items against physical counts, check upcoming expiry dates, and review unusual stock adjustments. Monthly and whenever costs change: review product names, barcodes, categories, cost and selling prices, low-stock thresholds, and staff access. Remove or update obsolete catalog entries only after checking their transaction history. Keep devices charged, operating systems and the installed app reasonably up to date, and exported business records protected.",
      },
      {
        stepNumber: 9,
        title: "Account and information security",
        instruction: "Use individual accounts; do not share passwords or leave a signed-in device unattended. Give staff only the access they need and remove access when a worker leaves. Use a device screen lock and protect exported reports, customer details, and receipts from unauthorized access. Never put passwords, verification codes, or backend service keys into support messages. Contact the store administrator if your access or store assignment looks wrong.",
      },
      {
        stepNumber: 10,
        title: "Troubleshooting and support",
        instruction: "For a missing or unexpected transaction, check the selected store, Sales History, stock activity, and the pending sync queue before entering it again; repeating an operation can create duplicates. For an incorrect stock count, compare the product's recent sales and stock movements with the physical count, then make a clearly described correction using the appropriate stock action. For barcode problems, confirm the product barcode and allow camera access. For persistent sign-in, invitation, or sync failures, record the error message and contact stocktracksupport@gmail.com. Do not send your password.",
      },
      {
        stepNumber: 11,
        title: "Saving or printing a copy",
        instruction: "To save this manual as a PDF, open Help & Tutorials, search for “manual,” expand Operations & Maintenance Manual, and tap Print / Save PDF Copy. In a web browser, choose Save as PDF in the print dialog. On a phone or tablet, use the share sheet to save or send the PDF.",
      },
    ],
  },
];
