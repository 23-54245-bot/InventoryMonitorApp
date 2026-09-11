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

## Supabase backend

The backend schema is in `supabase/schema.sql` and the Expo client is in `src/lib/supabase.ts`.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local`.
4. Add the project URL and anon key to `.env.local`.
5. Restart Expo with `npx expo start --clear`.

The schema enables row-level security for stores, profiles, products, stock movements, and notifications. Never put a Supabase service-role key in the Expo app.

### Google login

In Supabase, open **Authentication > Providers > Google**, enable it, and add the Google OAuth Client ID and Client Secret. Add the Supabase callback URL shown by Supabase to the Google OAuth client's authorized redirect URIs:

`https://icbrcvcjqckfmzkzasse.supabase.co/auth/v1/callback`

The login screen now includes **Continue with Google**. Use an EAS development or preview build for native OAuth callbacks; Expo Go is not supported for this custom redirect flow.

For the VS Code web preview, add the callback URL under Supabase **Authentication > URL Configuration > Redirect URLs**, for example `http://localhost:8093/auth/callback`. Add each localhost port you use during development.

Self-created accounts receive the `Admin` role. Accounts invited by an Admin receive the invited role. After changing this policy, run the updated `supabase/schema.sql` in the Supabase SQL Editor; existing profile roles are unchanged.

Each account owns a separate store. The schema migration also assigns existing profiles without a store to their own store so their team and inventory data remain isolated.

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
