
# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Quick terminal shortcuts

Use these from the project root when you want to publish updates or create an Android build without going through the app UI.

- OTA update to preview:
  ```bash
  npx eas update --channel preview --environment preview --message "Fix: update description" --non-interactive
  ```

- OTA update to production:
  ```bash
  npx eas update --channel production --environment production --message "Production release: update description" --non-interactive
  ```

- Build Android APK (preview/internal test):
  ```bash
  npx eas build --platform android --profile preview --non-interactive
  ```

- Build Android App Bundle (production):
  ```bash
  npx eas build --platform android --profile production --non-interactive
  ```

- Preview profile note:
  The `preview` profile in [eas.json](eas.json) is configured for `distribution: "internal"` and `buildType: "apk"`.

## Supabase backend

The backend schema is in `supabase/schema.sql` and the Expo client is in `src/lib/supabase.ts`.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local`.
4. Add the project URL and anon key to `.env.local`.
5. Restart Expo with `npx expo start --clear`.

The schema enables row-level security for stores, profiles, products, stock movements, and notifications. It also installs the RPCs used for idempotent stock-change merging; rerun the latest schema before testing offline sync. Never put a Supabase service-role key in the Expo app.

### Google login

In Supabase, open **Authentication > Providers > Google**, enable it, and add the Google OAuth Client ID and Client Secret. Add the Supabase callback URL shown by Supabase to the Google OAuth client's authorized redirect URIs:

`https://icbrcvcjqckfmzkzasse.supabase.co/auth/v1/callback`

The login screen now includes **Continue with Google**. Use an EAS development or preview build for native OAuth callbacks; Expo Go is not supported for this custom redirect flow.

For the VS Code web preview, add the callback URL under Supabase **Authentication > URL Configuration > Redirect URLs**, for example `http://localhost:8093/auth/callback`. Add each localhost port you use during development.

Self-created accounts receive the `Admin` role. Accounts invited by an Admin receive the invited role. After changing this policy, run the updated `supabase/schema.sql` in the Supabase SQL Editor; existing profile roles are unchanged.

Each account owns a separate store. The schema migration also assigns existing profiles without a store to their own store so their team and inventory data remain isolated.

### Team invitation email

Team invitations are recorded in `public.invites`. To enable initial and resent invitation emails, deploy the `send-team-invite` Edge Function and configure its Resend API key, verified sender address, and deployed web app origin.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available as Supabase Edge Function defaults. Never add the service-role key or Resend API key to the Expo app or `.env` file. The sender domain must be verified in Resend. Run the updated `supabase/schema.sql` before using the Pending Invites section, then deploy and configure the function:

```bash
supabase functions deploy send-team-invite
supabase secrets set RESEND_API_KEY="your-resend-api-key" INVITE_FROM_EMAIL="StockTrack <invites@your-domain.com>" APP_URL="https://your-app.example.com"
```

Invitation links open the web app’s sign-up form with the invitee email prefilled; the invitee must create an account using that same email.

### Release regression checks

Run these against a non-production Supabase project and test accounts before a store rollout:

- **Invites:** send an invite, confirm the email and role, resend it, revoke it, and confirm the revoked invitation cannot grant access to the store. Also verify an invitee using a different email does not join the invited store.
- **Offline sync:** take one device offline, record stock movements and a sale, then use another device to change the same product. Reconnect and sync the first device; confirm stock movements merge, each receipt/line/movement appears once, and a sale that would make stock negative stays pending with a review error. Confirm the signed-in user's role and allowed screens do not change while offline, then verify the role refreshes from Supabase after reconnecting. Repeat with a failed network request and sync more than once.
- **Uploads:** deny or interrupt a store-image upload and confirm the UI reports failure and keeps the previous saved image; retry with a valid image.
- **Password recovery:** complete recovery on web and a native build, then retry an expired link and a mismatched password. Confirm neither failure changes the password.
- **Role restrictions:** test Admin, Manager, and Staff accounts through both navigation and direct screen URLs. Confirm Staff cannot open reports/settings, and non-Admins cannot change roles, statuses, or invitations even when attempting the request directly.

These checks require a configured backend and device/browser sessions; lint and TypeScript checks do not substitute for them.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
