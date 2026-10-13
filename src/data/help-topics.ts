export type HelpStep = {
  stepNumber: number;
  instruction: string;
};

export type HelpTopic = {
  id: string;
  title: string;
  category: "Getting Started" | "Selling & Credit" | "Inventory" | "Reports" | "Account & Settings";
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
    title: "Recording Debt Payments",
    category: "Selling & Credit",
    summary: "Record full or partial repayments when a customer pays down their balance.",
    keywords: ["pay", "payment", "settle", "utang", "balance", "receipt"],
    steps: [
      { stepNumber: 1, instruction: "Open Credit Tracker and find the customer in the list." },
      { stepNumber: 2, instruction: "Tap Record Payment on the customer card." },
      { stepNumber: 3, instruction: "Enter the amount the customer is paying and choose Cash or E-Wallet." },
      { stepNumber: 4, instruction: "Tap Confirm Payment. The system will reduce their balance and mark the debt as settled if paid in full." },
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
    title: "Receiving Purchase Orders from Distributors",
    category: "Inventory",
    summary: "Create delivery orders from suppliers and batch intake new stock into inventory.",
    keywords: ["purchase order", "delivery", "distributor", "supplier", "inflow", "receive"],
    steps: [
      { stepNumber: 1, instruction: "Open Purchase Orders from the Quick Actions (+) menu or store shortcuts." },
      { stepNumber: 2, instruction: "Enter the Supplier Name and delivery invoice reference number." },
      { stepNumber: 3, instruction: "Search for delivered items and tap 'Add' to place them on the receiving manifest." },
      { stepNumber: 4, instruction: "Enter the quantity delivered and purchase unit cost for each item." },
      { stepNumber: 5, instruction: "Tap 'Confirm & Receive Into Stock' to immediately intake goods and record the delivery audit log." },
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
];

