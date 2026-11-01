import { toSVG } from '@bwip-js/react-native';
import type { Product } from "../data/freshmart";
import { getCurrency } from "../data/freshmart";
import { escapeHtml } from "./escape-html";

export type PriceLabelSize = "shelf" | "standard" | "display";

export const priceLabelSizes: Record<PriceLabelSize, { width: number; height: number; labelKey: string }> = {
  shelf: { width: 76.2, height: 38.1, labelKey: "shelfEdgeSmall" },
  standard: { width: 101.6, height: 50.8, labelKey: "standardMedium" },
  display: { width: 127, height: 76.2, labelKey: "displayCardLarge" },
};

export function generateProductSku(): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, "0");
  return `STK-${timestamp}${random}`;
}

export function createCode128BarcodeSvg(sku: string): string {
  return toSVG({
    bcid: "code128",
    text: sku.trim(),
    scale: 2,
    height: 14,
    includetext: false,
    backgroundcolor: "FFFFFF",
    barcolor: "000000",
    padding: 4,
  });
}

export function createPriceLabelHtml(product: Product, barcodeSvg: string, size: PriceLabelSize): string {
  const dimensions = priceLabelSizes[size];
  const retailPrice = product.srpPrice ?? product.unitPrice;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: ${dimensions.width}mm ${dimensions.height}mm; margin: 1.5mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111; }
  .label { width: 100%; text-align: center; overflow: hidden; }
  .brand { font-size: 7pt; font-weight: 700; }
  .name { margin: 1mm 0; font-size: 10pt; font-weight: 700; line-height: 1.15; }
  .price { margin: 0.5mm 0; font-size: 14pt; font-weight: 800; }
  .barcode { width: 100%; height: 15mm; }
  .barcode svg { display: block; width: 100%; height: 100%; }
  .sku { font-size: 8pt; font-weight: 700; }
</style></head><body><main class="label">
  <div class="brand">StockTrack</div>
  <div class="name">${escapeHtml(product.name)}</div>
  <div class="price">${escapeHtml(getCurrency(retailPrice))}</div>
  <div class="barcode">${barcodeSvg}</div>
  <div class="sku">SKU: ${escapeHtml(product.sku)}</div>
</main></body></html>`;
}
