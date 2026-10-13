import { LegalDocumentScreen, type LegalSection } from "../components/legal-document-screen";

const sections: LegalSection[] = [
  {
    heading: "1. Operator and scope",
    paragraphs: [
      "StockTrack is operated by [insert the operator's full legal name and business address]. This policy describes personal information processed through the StockTrack inventory, point-of-sale, team, and customer credit features.",
      "The store owner decides why customer records are entered and used. The legal roles of the store owner and StockTrack operator under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) depend on the actual service arrangement and must be confirmed before publication.",
    ],
  },
  {
    heading: "2. Information processed",
    paragraphs: [
      "Account and sign-in data may include a person's name, email address, username, role, and account status. When Google sign-in is used, Supabase Auth receives basic Google identity, email, and profile information; the app uses the name and email for account display. StockTrack does not request Gmail, Drive, or other Google API access.",
      "Store and team data may include store name, email, phone, address, business hours, permit number, invited staff names and email addresses, roles, and account status.",
      "Business records may include product names and SKUs, categories, prices and costs, quantities, expiry and manufacturing dates, batches, stock movements, sales, sale items, cashier names, payment methods and references, cash shifts, notes, notifications, and audit entries. StockTrack does not collect card numbers through its payment-method field.",
      "A store may enter customer names, phone numbers, optional addresses and notes, credit limits, credit balances, payment history and references, due dates, loyalty points, risk status, and item summaries for its Customer Credit Ledger. Free-text fields may contain other information a store chooses to enter.",
      "The app can use camera or photo-library access to scan products or select product and payment QR images. It does not intentionally collect analytics or device identifiers through app code.",
    ],
  },
  {
    heading: "3. Purposes and legal basis",
    paragraphs: [
      "Information is used to authenticate users, manage store teams, operate inventory and point-of-sale features, maintain the credit ledger, prepare reports and notifications, synchronize offline work, secure the service, and respond to support or legal requests.",
      "Depending on the information and purpose, processing may rely on steps needed to provide the service, legitimate interests, consent, or a legal obligation. The responsible personal information controller must determine and document the applicable lawful basis. A store owner must give customers appropriate notice and have a lawful basis before entering customer contact or credit information.",
    ],
  },
  {
    heading: "4. Storage and security",
    paragraphs: [
      "Account and store records are synchronized with Supabase Auth and database services. The Supabase project region is [confirm the region in Supabase Project Settings]; processing or backups may occur outside the Philippines depending on provider configuration. The public website is hosted by Vercel, which may process ordinary connection and request metadata.",
      "The app uses store-scoped database access rules. Members of a store can currently read and manage that store's customer and credit records; Admins and Managers have additional team and audit-log permissions. Payment QR objects are stored in a private bucket and the app uses signed image links that expire after 24 hours. Anyone who obtains a valid signed link may access that image until it expires.",
      "Some preferences, sign-in state, offline records, and pending changes are stored in the browser or on the device. Offline record caches are separated by store/account and are cleared on successful sign-out. Sign-out is blocked while that store has pending changes that failed to synchronize. Users should secure devices used to access StockTrack.",
    ],
  },
  {
    heading: "5. Sharing and third parties",
    paragraphs: [
      "Supabase provides authentication, database, and storage services. Google provides sign-in. Vercel hosts the public website. Each provider may process information as needed to provide its service under its own terms and privacy notices. StockTrack does not sell personal information.",
      "StockTrack does not send credit reminders through an SMS gateway. If a user chooses to send a prepared reminder, the user's messaging or share app, mobile carrier, and intended recipient may receive the phone number and message. StockTrack does not receive delivery status.",
    ],
  },
  {
    heading: "6. Retention and deletion",
    paragraphs: [
      "StockTrack does not currently enforce an automatic retention deadline. Store records are kept while needed to provide the service and for applicable business or legal purposes. Supabase backup retention is governed by provider settings and must be confirmed before publication.",
      "Authorized store users can delete a customer record in the app; associated credit and payment rows are configured to cascade. Account holders can request deletion in the app from Profile > Danger Zone > Request Account Deletion, or from the public /delete-account page. Requests are handled manually; send the request from the email address associated with the account to inventorymonitorapp@gmail.com. Some business records may need to be retained where required by law.",
      "Customers should first contact the store that entered their information. The store owner is responsible for responding to requests about customer records it controls. A data subject may also exercise applicable rights under the Data Privacy Act, including being informed, access, correction, objection, blocking or deletion where permitted, portability where applicable, and the right to complain to the National Privacy Commission.",
    ],
  },
  {
    heading: "7. Contact and changes",
    paragraphs: [
      "For privacy questions or requests, contact inventorymonitorapp@gmail.com. The operator's legal identity and address must be added above before this policy is published. Material changes should be communicated to users and the effective date updated.",
      "This draft is intended to support review under the Philippine Data Privacy Act of 2012. It is not legal advice and should be reviewed by a qualified Philippine privacy professional before publication.",
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return <LegalDocumentScreen titleKey="privacyPolicy" effectiveDate="[insert date]" sections={sections} />;
}
