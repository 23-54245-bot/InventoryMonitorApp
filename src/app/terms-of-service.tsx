import { LegalDocumentScreen, type LegalSection } from "../components/legal-document-screen";

const sections: LegalSection[] = [
  {
    heading: "1. Who may use StockTrack",
    paragraphs: [
      "StockTrack is intended for store owners and staff whom a store owner invites or authorizes. A person creating a store account must be authorized to act for that store. Staff may use the service only for their store and within their assigned access.",
    ],
  },
  {
    heading: "2. Accounts and security",
    paragraphs: [
      "Provide accurate account information, keep sign-in credentials confidential, do not share an individual account, and promptly report suspected unauthorized access. Store owners are responsible for inviting appropriate people and removing access when it is no longer needed.",
      "Removing a staff profile from a store may not delete that person's separate Supabase authentication account. The store owner should verify that access to store data has ended and contact StockTrack if assistance is needed.",
    ],
  },
  {
    heading: "3. Store records and customer information",
    paragraphs: [
      "The store owner is responsible for the accuracy and lawfulness of information entered into StockTrack, including product, price, sales, staff, customer, and Customer Credit Ledger records.",
      "Before entering a customer's name, phone number, address, credit balance, or payment information, the store owner must have the right to collect and use it for the stated store purpose, provide any required privacy notice, and handle the customer's requests. The owner is responsible for ensuring that a customer's number may be used for a credit reminder.",
      "StockTrack prepares a reminder for the user to review and send through the device's messaging app or share sheet. The user chooses whether to send it and is responsible for the recipient, content, timing, and any applicable messaging rules.",
    ],
  },
  {
    heading: "4. Acceptable use",
    paragraphs: [
      "Use StockTrack only for lawful store operations. Do not access another store's data, enter information you are not authorized to use, send unlawful or harassing messages, interfere with the service, or attempt to bypass access controls.",
      "Do not enter sensitive personal information unless the feature is expressly designed for it and the store has confirmed a lawful basis and adequate safeguards. StockTrack is not a substitute for legal, accounting, tax, or credit-reporting advice.",
    ],
  },
  {
    heading: "5. Service availability and third parties",
    paragraphs: [
      "StockTrack may change or be unavailable because of maintenance, network issues, or provider outages. Offline work may not synchronize until connectivity returns. Users remain responsible for checking that important changes have synchronized and keeping required business records.",
      "Authentication, hosting, storage, messaging, and network features may rely on third-party providers subject to their own terms. StockTrack does not send SMS reminders directly.",
    ],
  },
  {
    heading: "6. Disclaimers and liability",
    paragraphs: [
      "To the extent permitted by Philippine law, StockTrack is provided without a guarantee that it will meet every store's requirements or be uninterrupted or error-free. Nothing in these terms excludes a right or remedy that cannot legally be excluded.",
      "To the extent permitted by law, the StockTrack operator is not liable for indirect or consequential loss arising from use of the service, inaccurate information entered by a store, or a third-party service. This does not limit liability that applicable law does not allow the operator to limit.",
    ],
  },
  {
    heading: "7. Changes and contact",
    paragraphs: [
      "These terms may be updated as the service or legal requirements change. The effective date will be updated, and material changes will be communicated where required. The operator's legal identity must be added before publication.",
      "Questions about these terms: inventorymonitorapp@gmail.com. These draft terms are not legal advice and should be reviewed by a qualified Philippine legal professional before publication.",
    ],
  },
];

export default function TermsOfServiceScreen() {
  return <LegalDocumentScreen titleKey="termsOfService" effectiveDate="[insert date]" sections={sections} />;
}
