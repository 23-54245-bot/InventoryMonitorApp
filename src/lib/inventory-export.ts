import { File, Paths } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { FreshMartState, getCurrency, getExpiryStatus, getSafetyStockStatus } from "../data/freshmart";
import { showAlert } from "./alert";

function buildRows(state: FreshMartState) {
  return state.products.map((product) => ({
    sku: product.sku,
    name: product.name,
    category: product.category,
    currentStock: product.currentStock,
    lowStockThreshold: product.lowStockThreshold,
    expiry: product.expiryDate ?? "",
    unitPrice: getCurrency(product.unitPrice),
    safety: getSafetyStockStatus(product).label,
    expiryStatus: getExpiryStatus(product).label,
  }));
}

function sanitizeCsvCell(value: string | number): string {
  let str = String(value);
  // CSV Formula Injection mitigation: if cell starts with =, +, -, @, \t, \r, prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function toCsv(header: string[], rows: (string | number)[][]) {
  // Leading BOM so Excel/Word detect UTF-8 and render currency symbols (e.g. ₱) correctly.
  return "\uFEFF" + [header, ...rows].map((row) => row.map(sanitizeCsvCell).join(",")).join("\n");
}

export function buildInventoryCsv(state: FreshMartState) {
  const header = ["SKU", "Name", "Category", "Current Stock", "Safety Threshold", "Expiry Date", "Unit Price", "Safety Status", "Expiry Status"];
  const rows = buildRows(state).map((row) => [row.sku, row.name, row.category, row.currentStock, row.lowStockThreshold, row.expiry, row.unitPrice, row.safety, row.expiryStatus]);
  return toCsv(header, rows);
}

function buildActivityRows(state: FreshMartState) {
  const productMap = new Map(state.products.map((product) => [product.id, product]));
  return [...state.movements]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .map((movement) => {
      const date = new Date(movement.timestamp);
      const product = productMap.get(movement.productId);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        performedBy: movement.performedBy,
        action: movement.type === "in" ? "Stock In" : "Stock Out",
        product: product?.name ?? movement.productId,
        sku: product?.sku ?? "",
        quantity: movement.quantity,
        reason: movement.reason ?? "-",
        note: movement.note ?? "",
      };
    });
}

export function buildActivityLogCsv(state: FreshMartState) {
  const header = ["Date", "Time", "Performed By", "Action", "Product", "SKU", "Quantity", "Reason", "Note"];
  const rows = buildActivityRows(state).map((row) => [row.date, row.time, row.performedBy, row.action, row.product, row.sku, row.quantity, row.reason, row.note]);
  return toCsv(header, rows);
}

export function buildActivityLogHtml(state: FreshMartState) {
  const rows = buildActivityRows(state)
    .map(
      (row) => `
        <tr>
          <td>${row.date}</td>
          <td>${row.time}</td>
          <td>${row.performedBy}</td>
          <td>${row.action}</td>
          <td>${row.product}</td>
          <td>${row.sku}</td>
          <td>${row.quantity}</td>
          <td>${row.reason}</td>
          <td>${row.note || "-"}</td>
        </tr>`,
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 6px; }
          p { color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #e0f2fe; }
        </style>
      </head>
      <body>
        <h1>StockTrack Activity Log</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Performed By</th>
              <th>Action</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
}

export function buildInventoryHtml(state: FreshMartState) {
  const rows = buildRows(state)
    .map(
      (row) => `
        <tr>
          <td>${row.sku}</td>
          <td>${row.name}</td>
          <td>${row.category}</td>
          <td>${row.currentStock}</td>
          <td>${row.lowStockThreshold}</td>
          <td>${row.expiry || "-"}</td>
          <td>${row.unitPrice}</td>
          <td>${row.safety}</td>
          <td>${row.expiryStatus}</td>
        </tr>`,
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 6px; }
          p { color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #e0f2fe; }
        </style>
      </head>
      <body>
        <h1>StockTrack Inventory Report</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Current</th>
              <th>Safety</th>
              <th>Expiry</th>
              <th>Price</th>
              <th>Safety Status</th>
              <th>Expiry Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
}

function wordDocument(title: string, headers: string[], rows: (string | number)[][]) {
  // Inline styles + table attributes are used instead of a <style> block because many mobile
  // Word/WPS viewers ignore <style> blocks when rendering .doc files and only respect inline styles.
  const cellStyle = "border:1px solid #cbd5e1;padding:8px;text-align:left;font-size:12px;";
  const headerStyle = `${cellStyle}background:#e0f2fe;font-weight:bold;`;
  const headerRow = headers.map((label) => `<th style="${headerStyle}">${label}</th>`).join("");
  const bodyRows = rows
    .map((row) => `<tr>${row.map((value) => `<td style="${cellStyle}">${value === "" ? "-" : value}</td>`).join("")}</tr>`)
    .join("");

  // The mso namespaces let Word open this HTML content cleanly when saved with a .doc extension.
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
      </head>
      <body style="font-family:Calibri, Arial, sans-serif;color:#0f172a;">
        <h1 style="margin:0 0 6px;">${title}</h1>
        <p style="color:#475569;">Generated ${new Date().toLocaleString()}</p>
        <table border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse;width:100%;margin-top:18px;">
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

async function printHtml(html: string) {
  if (Platform.OS === "web") {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    return;
  }

  await Print.printAsync({ html });
}

async function saveOrShareFile(content: string, filename: string, mimeType: string, dialogTitle: string, uti: string) {
  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  if (Platform.OS === "android") {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const baseName = filename.replace(/\.[^.]+$/, "");
        const fileUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, baseName, mimeType);
        await StorageAccessFramework.writeAsStringAsync(fileUri, content, { encoding: "utf8" });
        showAlert("Saved", `${filename} was saved to the selected folder.`);
        return;
      }
    } catch {
      // Fall back to the share sheet below if the user's folder picker fails.
    }
  }

  if (!(await Sharing.isAvailableAsync())) {
    showAlert("Sharing unavailable", "This device does not support saving or sharing files.");
    return;
  }

  try {
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(content);
    // expo-sharing only accepts file:// URIs, not the Android content:// URI from file.contentUri.
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle, UTI: uti });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showAlert("Export failed", `The file could not be prepared. (${message})`);
  }
}

export async function printInventoryData(state: FreshMartState) {
  await printHtml(buildInventoryHtml(state));
}

export async function downloadInventoryExcel(state: FreshMartState) {
  const filename = `stocktrack-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  await saveOrShareFile(toCsv(["SKU", "Name", "Category", "Current Stock", "Safety Threshold", "Expiry Date", "Unit Price", "Safety Status", "Expiry Status"], buildRows(state).map((row) => [row.sku, row.name, row.category, row.currentStock, row.lowStockThreshold, row.expiry, row.unitPrice, row.safety, row.expiryStatus])), filename, "text/csv", "Save inventory as CSV", "com.microsoft.excel.csv");
}

export async function downloadInventoryWord(state: FreshMartState) {
  const filename = `stocktrack-inventory-${new Date().toISOString().slice(0, 10)}.doc`;
  const header = ["SKU", "Name", "Category", "Current Stock", "Safety Threshold", "Expiry Date", "Unit Price", "Safety Status", "Expiry Status"];
  const rows = buildRows(state).map((row) => [row.sku, row.name, row.category, row.currentStock, row.lowStockThreshold, row.expiry, row.unitPrice, row.safety, row.expiryStatus]);
  await saveOrShareFile(wordDocument("StockTrack Inventory Report", header, rows), filename, "application/msword", "Save inventory as Word document", "com.microsoft.word.doc");
}

export async function printActivityLog(state: FreshMartState) {
  await printHtml(buildActivityLogHtml(state));
}

export async function downloadActivityLogExcel(state: FreshMartState) {
  const filename = `stocktrack-activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
  const header = ["Date", "Time", "Performed By", "Action", "Product", "SKU", "Quantity", "Reason", "Note"];
  const rows = buildActivityRows(state).map((row) => [row.date, row.time, row.performedBy, row.action, row.product, row.sku, row.quantity, row.reason, row.note]);
  await saveOrShareFile(toCsv(header, rows), filename, "text/csv", "Save activity log as Excel (CSV)", "public.comma-separated-values-text");
}

export async function downloadActivityLogWord(state: FreshMartState) {
  const filename = `stocktrack-activity-log-${new Date().toISOString().slice(0, 10)}.doc`;
  const header = ["Date", "Time", "Performed By", "Action", "Product", "SKU", "Quantity", "Reason", "Note"];
  const rows = buildActivityRows(state).map((row) => [row.date, row.time, row.performedBy, row.action, row.product, row.sku, row.quantity, row.reason, row.note]);
  await saveOrShareFile(wordDocument("StockTrack Activity Log", header, rows), filename, "application/msword", "Save activity log as Word document", "com.microsoft.word.doc");
}