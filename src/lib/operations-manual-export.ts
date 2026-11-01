import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { HelpTopic } from "../data/help-topics";
import { showAlert } from "./alert";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildManualHtml(manual: HelpTopic) {
  const sections = manual.steps
    .map(
      (step) => `
        <section>
          <h2>${escapeHtml(step.title ?? `Section ${step.stepNumber}`)}</h2>
          <p>${escapeHtml(step.instruction)}</p>
        </section>`,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(manual.title)}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: Arial, sans-serif; color: #0f172a; line-height: 1.55; }
          h1 { margin: 0 0 8px; font-size: 26px; }
          .summary { color: #475569; margin-bottom: 24px; }
          h2 { margin: 22px 0 6px; font-size: 17px; break-after: avoid; }
          p { margin: 0; }
          section { break-inside: avoid; }
          footer { margin-top: 32px; border-top: 1px solid #cbd5e1; padding-top: 10px; color: #475569; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(manual.title)}</h1>
        <p class="summary">${escapeHtml(manual.summary)}</p>
        ${sections}
        <footer>StockTrack (Inventory Monitor App) · Operations &amp; Maintenance</footer>
      </body>
    </html>
  `;
}

export async function exportOperationsManualPdf(manual: HelpTopic) {
  const html = buildManualHtml(manual);

  if (Platform.OS === "web") {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showAlert("Print window blocked", "Allow pop-ups for this site, then try printing the manual again.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    showAlert("Sharing unavailable", "The PDF was created, but this device cannot open a share sheet to save it.");
    return;
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Operations & Maintenance Manual",
    UTI: ".pdf",
  });
}
