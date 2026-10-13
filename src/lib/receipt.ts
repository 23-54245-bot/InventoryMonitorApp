import type { SaleTransaction } from "../data/freshmart";
import { escapeHtml } from "./escape-html";

export type ReceiptStore = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
};

export const THERMAL_RECEIPT_WIDTH_MM = 80;

export function getThermalReceiptPrintSize(sale: SaleTransaction) {
  const itemHeight = sale.items.reduce((height, item) => {
    const lines = Math.max(1, Math.ceil(item.productName.length / 30));
    return height + 15 + (lines - 1) * 4.5;
  }, 0);
  const heightMm = Math.max(135, Math.ceil(105 + itemHeight));

  return {
    width: (THERMAL_RECEIPT_WIDTH_MM * 72) / 25.4,
    height: (heightMm * 72) / 25.4,
  };
}

export function createThermalReceiptHtml(
  sale: SaleTransaction,
  store: ReceiptStore,
  getCurrency: (value: number) => string,
): string {
  const size = getThermalReceiptPrintSize(sale);
  const heightMm = (size.height * 25.4) / 72;
  const date = new Date(sale.timestamp).toLocaleString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const paymentMethod = sale.paymentMethod.toUpperCase().replace(/_/g, " ");
  const items = sale.items.map((item) => `
    <section class="item">
      <div class="item-name">${escapeHtml(item.productName)}</div>
      <div class="item-detail"><span>${escapeHtml(String(item.quantity))} x ${escapeHtml(getCurrency(item.unitPrice))}</span><strong>${escapeHtml(getCurrency(item.totalPrice))}</strong></div>
    </section>
  `).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt ${escapeHtml(sale.receiptNumber)}</title>
<style>
  @page { size: ${THERMAL_RECEIPT_WIDTH_MM}mm ${heightMm}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { width: ${THERMAL_RECEIPT_WIDTH_MM}mm; margin: 0; padding: 0; color: #111; background: #fff; }
  body { font-family: "Courier New", monospace; font-size: 9pt; line-height: 1.3; }
  .receipt { width: ${THERMAL_RECEIPT_WIDTH_MM}mm; padding: 4mm; }
  .center { text-align: center; }
  .business-name { margin: 0; font-size: 14pt; font-weight: 800; overflow-wrap: anywhere; }
  .store-detail { margin: 1mm 0 0; font-size: 8pt; overflow-wrap: anywhere; }
  .receipt-title { margin: 3mm 0 1mm; font-size: 10pt; font-weight: 700; }
  .meta { margin-top: 2mm; font-size: 8.5pt; }
  .rule { border: 0; border-top: 1px dashed #222; margin: 3mm 0; }
  .item { padding: 1.8mm 0; border-bottom: 1px dotted #999; }
  .item-name { font-weight: 700; overflow-wrap: anywhere; }
  .item-detail, .row { display: flex; justify-content: space-between; gap: 2mm; }
  .item-detail { margin-top: 0.6mm; font-size: 8pt; }
  .item-detail > :first-child, .row > :first-child { min-width: 0; overflow-wrap: anywhere; }
  .item-detail > :last-child, .row > :last-child { text-align: right; white-space: nowrap; }
  .totals { display: grid; gap: 1.2mm; }
  .total { padding-top: 2mm; margin-top: 1mm; border-top: 1px solid #111; font-size: 12pt; font-weight: 800; }
  .footer { margin-top: 5mm; font-size: 8pt; }
  .footer p { margin: 1mm 0; }
</style></head><body><main class="receipt">
  <header class="center">
    <h1 class="business-name">${escapeHtml(store.name || "StockTrack Store")}</h1>
    ${store.address ? `<p class="store-detail">${escapeHtml(store.address)}</p>` : ""}
    ${store.phone ? `<p class="store-detail">${escapeHtml(store.phone)}</p>` : ""}
    ${store.email ? `<p class="store-detail">${escapeHtml(store.email)}</p>` : ""}
    <p class="receipt-title">SALES RECEIPT</p>
  </header>
  <div class="meta">
    <div class="row"><span>Transaction ID</span><span>${escapeHtml(sale.receiptNumber)}</span></div>
    <div class="row"><span>Date</span><span>${escapeHtml(date)}</span></div>
    ${sale.cashierName ? `<div class="row"><span>Cashier</span><span>${escapeHtml(sale.cashierName)}</span></div>` : ""}
    ${sale.customerName ? `<div class="row"><span>Customer</span><span>${escapeHtml(sale.customerName)}</span></div>` : ""}
  </div>
  <hr class="rule">
  ${items}
  <hr class="rule">
  <section class="totals">
    <div class="row"><span>Subtotal</span><span>${escapeHtml(getCurrency(sale.subtotal))}</span></div>
    ${sale.discount > 0 ? `<div class="row"><span>Discount</span><span>-${escapeHtml(getCurrency(sale.discount))}</span></div>` : ""}
    ${sale.tax > 0 ? `<div class="row"><span>Sales Tax</span><span>${escapeHtml(getCurrency(sale.tax))}</span></div>` : ""}
    <div class="row total"><span>TOTAL</span><span>${escapeHtml(getCurrency(sale.totalAmount))}</span></div>
    <div class="row"><span>Paid by</span><span>${escapeHtml(paymentMethod)}</span></div>
    ${sale.paymentMethod === "split" ? `<div class="row"><span>Cash portion</span><span>${escapeHtml(getCurrency(sale.splitCashAmount ?? 0))}</span></div><div class="row"><span>${escapeHtml((sale.splitOtherMethod ?? "other").toUpperCase().replace("_", " "))} portion</span><span>${escapeHtml(getCurrency(sale.splitOtherAmount ?? 0))}</span></div>` : ""}
    ${sale.amountTendered > 0 ? `<div class="row"><span>Amount paid</span><span>${escapeHtml(getCurrency(sale.amountTendered))}</span></div>` : ""}
    ${sale.changeAmount > 0 ? `<div class="row"><span>Change</span><span>${escapeHtml(getCurrency(sale.changeAmount))}</span></div>` : ""}
    ${sale.referenceNumber ? `<div class="row"><span>Reference</span><span>${escapeHtml(sale.referenceNumber)}</span></div>` : ""}
  </section>
  <footer class="footer center">
    <p>Thank you for your purchase!</p>
    <p>StockTrack POS</p>
  </footer>
</main></body></html>`;
}