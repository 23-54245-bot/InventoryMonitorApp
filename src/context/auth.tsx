import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { readStoredString, writeStoredString } from "../lib/storage";
import { supabase } from "../lib/supabase";
import { clearOfflineCache, getOfflineCacheScope, processSyncQueue } from "../lib/sync-queue";

export type UserRole = "Admin" | "Manager" | "Staff";
export type EmployeeStatus = "Active" | "Inactive";

export type AppRoute = "/" | "/inventory" | "/alerts" | "/reports" | "/profile" | "/settings" | "/scan-modal" | "/product" | "/add-product" | "/stock-movement" | "/change-password" | "/pos" | "/sales-history" | "/utang";

export type AuthSession = {
  email: string;
  name: string;
  role: UserRole;
  title: string;
  team: string;
  storeId?: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: EmployeeStatus;
  createdAt: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

type AuthStorage = {
  session: AuthSession | null;
  employees: Employee[];
};

type AuthResult = {
  success: boolean;
  message: string;
  session?: AuthSession;
};

type EmployeeResult = {
  success: boolean;
  message: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  isReady: boolean;
  employees: Employee[];
  pendingInvites: PendingInvite[];
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  refreshSession: () => Promise<void>;
  recoverPassword: (email: string) => Promise<AuthResult>;
  resetPassword: (newPassword: string) => Promise<AuthResult>;
  verifyRecoveryOtp: (email: string, token: string, newPassword: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  addEmployee: (employee: Omit<Employee, "id" | "createdAt" | "status">) => Promise<EmployeeResult>;
  updateEmployee: (employeeId: string, patch: Partial<Omit<Employee, "id" | "createdAt">>) => Promise<EmployeeResult>;
  removeEmployee: (employeeId: string) => Promise<EmployeeResult>;
  refreshPendingInvites: () => Promise<void>;
  resendInvite: (email: string) => Promise<EmployeeResult>;
  revokeInvite: (inviteId: string) => Promise<EmployeeResult>;
  getHomeRoute: (role?: UserRole) => AppRoute;
  getAllowedRoutes: (role?: UserRole) => string[];
  hasRouteAccess: (route: string, role?: UserRole) => boolean;
};

const SESSION_STORAGE_KEY = "stocktrack.auth.v2";
const LEGACY_SESSION_STORAGE_KEY = "freshmartims.auth";
const PROFILE_ROLE_CACHE_KEY_PREFIX = "stocktrack.profile-role.v1.";

WebBrowser.maybeCompleteAuthSession();

const routeAccessByRole: Record<UserRole, string[]> = {
  Admin: ["index", "inventory", "alerts", "reports", "profile", "settings", "scan-modal", "product", "add-product", "stock-movement", "change-password", "pos", "sales-history", "utang"],
  Manager: ["index", "inventory", "alerts", "reports", "profile", "settings", "scan-modal", "product", "add-product", "stock-movement", "change-password", "pos", "sales-history", "utang"],
  Staff: ["index", "inventory", "alerts", "profile", "change-password", "pos", "sales-history"],
};

const homeRouteByRole: Record<UserRole, AppRoute> = {
  Admin: "/",
  Manager: "/",
  Staff: "/",
};

const roleTitles: Record<UserRole, string> = {
  Admin: "Store Owner",
  Manager: "Inventory Manager",
  Staff: "Staff Team Member",
};

async function fetchProfileRole(userId: string): Promise<UserRole | null> {
  const roleCacheKey = `${PROFILE_ROLE_CACHE_KEY_PREFIX}${userId}`;
  const cachedRoleValue = await readStoredString(roleCacheKey);
  const cachedRole = cachedRoleValue === "Admin" || cachedRoleValue === "Manager" || cachedRoleValue === "Staff"
    ? cachedRoleValue
    : null;

  if (!supabase) {
    return cachedRole;
  }

  try {
    const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (error) {
      console.warn("Could not refresh the signed-in user's role; keeping its last known role while offline:", error.message);
      return cachedRole;
    }

    const role = data?.role;
    if (role === "Admin" || role === "Manager" || role === "Staff") {
      await writeStoredString(roleCacheKey, role);
      return role;
    }
  } catch (error) {
    console.warn(
      "Could not refresh the signed-in user's role; keeping its last known role while offline:",
      error instanceof Error ? error.message : String(error),
    );
  }

  return null;
}

function getKnownRole(session: AuthSession | null, email: string): UserRole | undefined {
  return session?.email.toLowerCase() === email.toLowerCase() ? session.role : undefined;
}

async function syncInvite(email: string, role: UserRole): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("invites")
    .upsert({ email: email.trim().toLowerCase(), role, invited_by: user.user?.id ?? null }, { onConflict: "email" });
  return error?.message ?? null;
}

async function removeInvite(email: string): Promise<void> {
  if (!supabase) {
    return;
  }

  await supabase.from("invites").delete().eq("email", email.trim().toLowerCase());
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRoute(route: string) {
  return route.replace(/^\//, "").split("?")[0].split("/")[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthStorage>(() => ({ session: null, employees: [] }));
  const [isReady, setIsReady] = useState(false);
  const [remoteEmployees, setRemoteEmployees] = useState<{ email: string; employees: Employee[] } | null>(null);
  const [remotePendingInvites, setRemotePendingInvites] = useState<{ email: string; invites: PendingInvite[] } | null>(null);
  const googleAuthInFlight = useRef(false);
  const currentRemoteEmployees = remoteEmployees && remoteEmployees.email === authState.session?.email.toLowerCase()
    ? remoteEmployees.employees
    : null;

  const refreshEmployees = async (userId?: string, email?: string) => {
    if (!supabase) {
      return;
    }

    let activeUser = userId && email ? { id: userId, email } : null;
    if (!activeUser) {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        setRemoteEmployees(null);
        return;
      }
      activeUser = { id: currentUser.user.id, email: currentUser.user.email ?? "" };
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", activeUser.id)
      .maybeSingle();
    const profileQuery = supabase
      .from("profiles")
      .select("id, name, email, role, status, created_at")
      .order("created_at", { ascending: false });
    const { data, error } = currentProfile?.store_id
      ? await profileQuery.eq("store_id", currentProfile.store_id)
      : await profileQuery.eq("id", activeUser.id);

    if (!error && data) {
      setRemoteEmployees({
        email: activeUser.email.toLowerCase(),
        employees: data.map((row) => ({
          id: row.id,
          name: row.name ?? row.email?.split("@")[0] ?? "Unnamed",
          email: row.email ?? "",
          role: (row.role as UserRole) ?? "Staff",
          status: (row.status as EmployeeStatus) ?? "Active",
          createdAt: row.created_at,
        })),
      });
    }
  };

  const refreshPendingInvites = async (userId?: string, email?: string) => {
    if (!supabase) {
      return;
    }

    let activeUser = userId && email ? { id: userId, email } : null;
    if (!activeUser) {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        setRemotePendingInvites(null);
        return;
      }
      activeUser = { id: currentUser.user.id, email: currentUser.user.email ?? "" };
    }

    const { data, error } = await supabase
      .from("invites")
      .select("id, email, role, created_at")
      .eq("invited_by", activeUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Could not load pending invitations: ${error.message}`);
    }

    setRemotePendingInvites({
      email: activeUser.email.toLowerCase(),
      invites: (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role as UserRole,
        createdAt: row.created_at,
      })),
    });
  };

  useEffect(() => {
    void (async () => {
      try {
        await writeStoredString(LEGACY_SESSION_STORAGE_KEY, null);
        const storedValue = await Promise.race([
          readStoredString(SESSION_STORAGE_KEY),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);

        if (!storedValue) {
          setIsReady(true);
          return;
        }

        try {
          const parsed = JSON.parse(storedValue) as AuthStorage;
          setAuthState({
            session: parsed.session,
            employees: Array.isArray(parsed.employees) ? parsed.employees : [],
          });
        } catch {
          await writeStoredString(SESSION_STORAGE_KEY, null);
        }
      } catch {
        // Ignore storage errors; continue to app start.
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const applySupabaseSession = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!session?.user) {
        setRemoteEmployees(null);
        setRemotePendingInvites(null);
        setAuthState((current) => ({ ...current, session: null, employees: [] }));
        return;
      }

      const email = session.user.email ?? "";
      const metadata = session.user.user_metadata ?? {};
      const name = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : email.split("@")[0];
      setAuthState((current) => {
        const role = getKnownRole(current.session, email) ?? "Staff";
        return {
          ...current,
          session: { email, name, role, title: roleTitles[role], team: "StockTrack Store" },
        };
      });
      void refreshEmployees(session.user.id, email);
      void refreshPendingInvites(session.user.id, email).catch((error) => console.error(error));
      void fetchProfileRole(session.user.id).then((role) => {
        if (!role) return;
        setAuthState((current) => current.session?.email.toLowerCase() === email.toLowerCase()
          ? { ...current, session: { ...current.session, role, title: roleTitles[role] } }
          : current);
      });
    };

    void supabase.auth.getSession().then(({ data }) => applySupabaseSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => applySupabaseSession(session));
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshSession = async (): Promise<void> => {
    if (!supabase) {
      return;
    }

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      return;
    }

    const email = user.email ?? "";
    const metadata = user.user_metadata ?? {};
    const name = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : email.split("@")[0];
    setAuthState((current) => {
      const role = getKnownRole(current.session, email) ?? "Staff";
      return {
        ...current,
        session: { email, name, role, title: roleTitles[role], team: "StockTrack Store" },
      };
    });

    const role = await fetchProfileRole(user.id);
    if (!role) return;
    setAuthState((current) => current.session?.email.toLowerCase() === email.toLowerCase()
      ? { ...current, session: { ...current.session, role, title: roleTitles[role] } }
      : current);
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) {
        return { success: false, message: error.message };
      }

      if (!error && data.session?.user) {
        const profileName = typeof data.session.user.user_metadata?.name === "string" && data.session.user.user_metadata.name
          ? data.session.user.user_metadata.name
          : normalizedEmail.split("@")[0];
        const role = (await fetchProfileRole(data.session.user.id)) ?? getKnownRole(authState.session, normalizedEmail) ?? "Staff";
        const nextSession: AuthSession = {
          email: normalizedEmail,
          name: profileName,
          role,
          title: roleTitles[role],
          team: "StockTrack Store",
        };
        setAuthState((current) => ({ ...current, session: nextSession }));
        return { success: true, message: `Signed in as ${profileName}.`, session: nextSession };
      }
    }

    return {
      success: false,
      message: "Invalid email or password.",
    };
  };

  const signUp = async (name: string, email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || !normalizedEmail || !password) {
      return { success: false, message: "Name, email, and password are required." };
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return { success: false, message: "Password must be at least 8 characters and include a letter and a number." };
    }

    if (!supabase) {
      return { success: false, message: "Account creation needs the Supabase configuration in .env.local." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { name: trimmedName } },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data.user) {
      return { success: false, message: "Supabase did not return a user account. Please try again." };
    }

    if (!data.session) {
      if (!data.user.identities?.length) {
        return { success: false, message: "An account with this email already exists. Sign in instead, or use a different email address." };
      }

      return { success: true, message: "Account created. Check your email to confirm your account before signing in." };
    }

    const role = (await fetchProfileRole(data.user.id)) ?? getKnownRole(authState.session, normalizedEmail) ?? "Staff";
    const nextSession: AuthSession = {
      email: normalizedEmail,
      name: trimmedName,
      role,
      title: roleTitles[role],
      team: "StockTrack Store",
    };
    setAuthState((current) => ({ ...current, session: nextSession }));
    return { success: true, message: "Account created successfully.", session: nextSession };
  };

  const signInWithProvider = async (provider: "google"): Promise<AuthResult> => {
    if (!supabase) {
      return { success: false, message: "Google login needs the Supabase configuration in .env.local." };
    }

    if (googleAuthInFlight.current) {
      return { success: false, message: "Google sign-in is already in progress." };
    }

    if (Platform.OS !== "web" && Constants.appOwnership === "expo") {
      return { success: false, message: "Google login needs a custom URL scheme that Expo Go can't handle. Install the built APK (or a dev client) to use Continue with Google." };
    }

    googleAuthInFlight.current = true;

    try {
      const redirectUri = Platform.OS === "web"
        ? `${window.location.origin}/auth/callback`
        : makeRedirectUri({ native: "inventorymonitorapp://auth/callback" });
      if (Platform.OS === "web") {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUri,
          },
        });

        if (error) {
          return { success: false, message: error.message };
        }

        if (data?.url) {
          window.location.assign(data.url);
          return { success: true, message: "Redirecting to Google sign-in…" };
        }

        return { success: true, message: "Opening Google sign-in…" };
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      });

      if (error || !data.url) {
        return { success: false, message: error?.message ?? "Google login could not be started." };
      }

      const result = await Promise.race([
        WebBrowser.openAuthSessionAsync(data.url, redirectUri),
        new Promise<{ type: "cancel"; message?: string }>((resolve) => setTimeout(() => resolve({ type: "cancel", message: "Google login timed out. Check that the provider is enabled in Supabase." }), 15000)),
      ]);
      if (result.type !== "success" || !result.url) {
        const timeoutMessage = "message" in result ? result.message : undefined;
        return { success: false, message: timeoutMessage ?? "Google login was cancelled." };
      }

      const callbackUrl = new URL(result.url);
      const providerError = callbackUrl.searchParams.get("error_description") ?? callbackUrl.searchParams.get("error");
      if (providerError) {
        return { success: false, message: providerError.replace(/\+/g, " ") };
      }
      const code = callbackUrl.searchParams.get("code");
      const hash = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
      const codeFromHash = hash.get("code");
      const accessToken = callbackUrl.searchParams.get("access_token") ?? hash.get("access_token");
      const refreshToken = callbackUrl.searchParams.get("refresh_token") ?? hash.get("refresh_token");
      const callbackCode = code ?? codeFromHash;
      if (!callbackCode && accessToken && refreshToken) {
        const tokenSession = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (tokenSession.error || !tokenSession.data.user) {
          return { success: false, message: tokenSession.error?.message ?? "Google login could not create a session." };
        }
        const user = tokenSession.data.user;
        const profileName = typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : user.email?.split("@")[0] ?? "Google User";
        const role = (await fetchProfileRole(user.id)) ?? getKnownRole(authState.session, user.email ?? "") ?? "Staff";
        const nextSession: AuthSession = { email: user.email ?? "", name: profileName, role, title: roleTitles[role], team: "StockTrack Store" };
        setAuthState((current) => ({ ...current, session: nextSession }));
        return { success: true, message: `Signed in as ${profileName}.`, session: nextSession };
      }
      if (!callbackCode) {
        const { data: currentSession } = await supabase.auth.getSession();
        const authenticatedUser = currentSession.session?.user;
        if (!authenticatedUser) {
          const callbackShape = `query=${callbackUrl.search ? "present" : "empty"}, hash=${callbackUrl.hash ? "present" : "empty"}`;
          return { success: false, message: `Google login returned without session data (${callbackShape}). Check the Supabase redirect allow list.` };
        }

        const profileName = typeof authenticatedUser.user_metadata?.full_name === "string"
          ? authenticatedUser.user_metadata.full_name
          : typeof authenticatedUser.user_metadata?.name === "string"
            ? authenticatedUser.user_metadata.name
            : authenticatedUser.email?.split("@")[0] ?? "Google User";
        const knownRole = getKnownRole(authState.session, authenticatedUser.email ?? "") ?? "Staff";
        const nextSession: AuthSession = {
          email: authenticatedUser.email ?? "",
          name: profileName,
          role: knownRole,
          title: roleTitles[knownRole],
          team: "StockTrack Store",
        };
        setAuthState((current) => ({ ...current, session: nextSession }));
        void fetchProfileRole(authenticatedUser.id).then((role) => {
          if (!role) return;
          setAuthState((current) => current.session?.email.toLowerCase() === nextSession.email.toLowerCase()
            ? { ...current, session: { ...current.session, role, title: roleTitles[role] } }
            : current);
        });
        return { success: true, message: `Signed in as ${profileName}.`, session: nextSession };
      }

      const exchange = await supabase.auth.exchangeCodeForSession(callbackCode);
      if (exchange.error || !exchange.data.user) {
        return { success: false, message: exchange.error?.message ?? "Google login could not be completed." };
      }

      const user = exchange.data.user;
      const profileName = typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : user.email?.split("@")[0] ?? "Google User";
      const knownRole = getKnownRole(authState.session, user.email ?? "") ?? "Staff";
      const nextSession: AuthSession = {
        email: user.email ?? "",
        name: profileName,
        role: knownRole,
        title: roleTitles[knownRole],
        team: "StockTrack Store",
      };
      setAuthState((current) => ({ ...current, session: nextSession }));
      void fetchProfileRole(user.id).then((role) => {
        if (!role) return;
        setAuthState((current) => current.session?.email.toLowerCase() === nextSession.email.toLowerCase()
          ? { ...current, session: { ...current.session, role, title: roleTitles[role] } }
          : current);
      });
      return { success: true, message: `Signed in as ${profileName}.`, session: nextSession };
    } finally {
      googleAuthInFlight.current = false;
    }
  };

  const signInWithGoogle = () => signInWithProvider("google");

  const signOut = async (): Promise<AuthResult> => {
    const cacheScope = getOfflineCacheScope();
    if (supabase) {
      try {
        const syncResult = await processSyncQueue();
        if (syncResult.remainingCount > 0) {
          return { success: false, message: "Some changes are still waiting to sync. Connect to the internet and sync before signing out, or clear the pending queue if you want to discard those changes." };
        }
        const { error } = await supabase.auth.signOut();
        if (error) {
          return { success: false, message: error.message };
        }
        await clearOfflineCache(cacheScope);
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Could not safely sign out." };
      }
    }
    setAuthState((current) => ({ ...current, session: null }));
    return { success: true, message: "Signed out successfully." };
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
    if (!authState.session) {
      return { success: false, message: "Your session has expired. Please sign in again." };
    }

    if (!supabase) {
      return { success: false, message: "Password changes need the Supabase configuration in .env.local." };
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return { success: false, message: "New password must be at least 8 characters and include a letter and a number." };
    }

    const verification = await supabase.auth.signInWithPassword({ email: authState.session.email, password: currentPassword });
    if (verification.error) {
      return { success: false, message: "Current password is incorrect." };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: "Password updated successfully." };
  };

  const recoverPassword = async (email: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!supabase) {
      return { success: false, message: "Password recovery needs the Supabase configuration in .env.local." };
    }

    const redirectTo = Platform.OS === "web"
      ? `${window.location.origin}/auth/callback`
      : makeRedirectUri({ native: "inventorymonitorapp://auth/callback" });
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    return error
      ? { success: false, message: error.message }
      : { success: true, message: "Password recovery instructions were sent if the account exists." };
  };

  const resetPassword = async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) {
      return { success: false, message: "Password recovery needs the Supabase configuration in .env.local." };
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return { success: false, message: "New password must be at least 8 characters and include a letter and a number." };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error
      ? { success: false, message: error.message }
      : { success: true, message: "Password updated successfully." };
  };

  const verifyRecoveryOtp = async (email: string, token: string, newPassword: string): Promise<AuthResult> => {
    if (!supabase) {
      return { success: false, message: "Password recovery needs the Supabase configuration in .env.local." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    if (!normalizedEmail || !cleanToken) {
      return { success: false, message: "Please provide both your email and the verification code." };
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return { success: false, message: "New password must be at least 8 characters and include a letter and a number." };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: cleanToken,
        type: "recovery",
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (!data.session) {
        return { success: false, message: "Invalid or expired verification code. Please request a new one." };
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        return { success: false, message: updateError.message };
      }

      await refreshSession();
      return { success: true, message: "Password updated successfully. You are now logged in." };
    } catch (err: any) {
      return { success: false, message: err?.message ?? "Failed to reset password." };
    }
  };

  const addEmployee = async (employee: Omit<Employee, "id" | "createdAt" | "status">): Promise<EmployeeResult> => {
    const emailNormalized = employee.email.trim().toLowerCase();

    if (!employee.name.trim() || !emailNormalized || !employee.role) {
      return { success: false, message: "Name, email, and role are required." };
    }

    if (supabase) {
      if (currentRemoteEmployees?.some((item) => item.email.toLowerCase() === emailNormalized)) {
        return { success: false, message: "An employee with this email already exists." };
      }

      const inviteError = await syncInvite(emailNormalized, employee.role);
      if (inviteError) {
        return { success: false, message: `Could not create the invite: ${inviteError}` };
      }

      let emailError: string | null = null;
      try {
        const { error } = await supabase.functions.invoke("send-team-invite", {
          body: { email: emailNormalized, role: employee.role },
        });
        emailError = error?.message ?? null;
      } catch (error) {
        emailError = error instanceof Error ? error.message : String(error);
      }
      if (emailError) {
        await refreshPendingInvites().catch((error) => console.error(error));
        return { success: false, message: `Invite saved, but the email could not be sent: ${emailError}` };
      }
      try {
        await refreshPendingInvites();
      } catch (error) {
        return {
          success: false,
          message: `Invitation email was sent, but the pending list could not be refreshed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      return {
        success: true,
        message: `Invitation email sent to ${emailNormalized}.`,
      };
    }

    if (authState.employees.some((item) => item.email.toLowerCase() === emailNormalized)) {
      return { success: false, message: "An employee with this email already exists." };
    }

    await syncInvite(emailNormalized, employee.role);

    const nextEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name: employee.name.trim(),
      email: emailNormalized,
      role: employee.role,
      status: "Active",
      createdAt: new Date().toISOString(),
    };

    setAuthState((current) => ({ ...current, employees: [nextEmployee, ...current.employees] }));

    return {
      success: true,
      message: "Employee invited successfully. They can now sign up with this email to get the assigned role.",
    };
  };

  const updateEmployee = async (employeeId: string, patch: Partial<Omit<Employee, "id" | "createdAt">>): Promise<EmployeeResult> => {
    if (supabase) {
      const existing = currentRemoteEmployees?.find((employee) => employee.id === employeeId);

      if (!existing) {
        return { success: false, message: "Employee not found." };
      }

      if (!patch.name?.trim() && !patch.role && !patch.status) {
        return { success: false, message: "No changes provided." };
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          ...(patch.name?.trim() ? { name: patch.name.trim() } : {}),
          ...(patch.role ? { role: patch.role } : {}),
          ...(patch.status ? { status: patch.status } : {}),
        })
        .eq("id", employeeId);

      if (error) {
        return { success: false, message: error.message };
      }

      await refreshEmployees();
      return { success: true, message: "Employee updated successfully." };
    }

    const existing = authState.employees.find((employee) => employee.id === employeeId);

    if (!existing) {
      return { success: false, message: "Employee not found." };
    }

    const nextEmail = patch.email?.trim().toLowerCase() ?? existing.email;
    if (!patch.name?.trim() && !patch.email && !patch.role && !patch.status) {
      return { success: false, message: "No changes provided." };
    }

    if (nextEmail !== existing.email.toLowerCase() && authState.employees.some((employee) => employee.email.toLowerCase() === nextEmail && employee.id !== employeeId)) {
      return { success: false, message: "An employee with this email already exists." };
    }

    if (patch.role || patch.email) {
      if (nextEmail !== existing.email.toLowerCase()) {
        await removeInvite(existing.email);
      }
      await syncInvite(nextEmail, patch.role ?? existing.role);
    }

    setAuthState((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              ...patch,
              email: patch.email ? patch.email.trim().toLowerCase() : employee.email,
              name: patch.name ? patch.name.trim() : employee.name,
            }
          : employee,
      ),
    }));

    return {
      success: true,
      message: "Employee updated successfully.",
    };
  };

  const removeEmployee = async (employeeId: string): Promise<EmployeeResult> => {
    if (supabase) {
      const existing = currentRemoteEmployees?.find((employee) => employee.id === employeeId);

      if (!existing) {
        return { success: false, message: "Employee not found." };
      }

      if (existing.email.toLowerCase() === authState.session?.email.toLowerCase()) {
        return { success: false, message: "You cannot remove your own account." };
      }

      const { error } = await supabase.from("profiles").delete().eq("id", employeeId);

      if (error) {
        return { success: false, message: error.message };
      }

      await refreshEmployees();
      return { success: true, message: "Employee removed from the team. Their login stays active but reverts to default access until reassigned." };
    }

    const employee = authState.employees.find((item) => item.id === employeeId);

    if (!employee) {
      return { success: false, message: "Employee not found." };
    }

    if (employee.email === authState.session?.email) {
      return { success: false, message: "You cannot remove your own account." };
    }

    await removeInvite(employee.email);

    setAuthState((current) => ({
      ...current,
      employees: current.employees.filter((item) => item.id !== employeeId),
    }));

    return {
      success: true,
      message: "Employee removed successfully.",
    };
  };

  const resendInvite = async (email: string): Promise<EmployeeResult> => {
    if (!supabase) {
      return { success: false, message: "Sending invitation emails requires Supabase configuration." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { error } = await supabase.functions.invoke("send-team-invite", {
        body: { email: normalizedEmail },
      });
      if (error) {
        return { success: false, message: `Could not resend the invitation: ${error.message}` };
      }
    } catch (error) {
      return {
        success: false,
        message: `Could not resend the invitation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    return { success: true, message: `Invitation email resent to ${normalizedEmail}.` };
  };

  const revokeInvite = async (inviteId: string): Promise<EmployeeResult> => {
    if (!supabase) {
      return { success: false, message: "Revoking invitations requires Supabase configuration." };
    }

    try {
      const { error } = await supabase
        .from("invites")
        .delete()
        .eq("id", inviteId);
      if (error) {
        return { success: false, message: `Could not revoke the invitation: ${error.message}` };
      }
    } catch (error) {
      return {
        success: false,
        message: `Could not revoke the invitation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    setRemotePendingInvites((current) => current
      ? { ...current, invites: current.invites.filter((invite) => invite.id !== inviteId) }
      : current);
    try {
      await refreshPendingInvites();
    } catch (error) {
      return {
        success: true,
        message: `Invitation revoked, but the list could not be refreshed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    return { success: true, message: "Invitation revoked." };
  };

  const getAllowedRoutes = (role?: UserRole) => {
    if (!role) {
      return [];
    }

    return routeAccessByRole[role];
  };

  const getHomeRoute = (role?: UserRole): AppRoute => {
    if (!role) {
      return "/";
    }

    return homeRouteByRole[role];
  };

  const hasRouteAccess = (route: string, role?: UserRole) => {
    const nextRole: UserRole | undefined = role ?? authState.session?.role;

    if (!nextRole) {
      return false;
    }

    const normalized = normalizeRoute(route) || "index";
    return routeAccessByRole[nextRole].includes(normalized);
  };

  return (
    <AuthContext.Provider
      value={{
        session: authState.session,
        isReady,
        employees: supabase ? currentRemoteEmployees ?? [] : authState.employees,
        pendingInvites: remotePendingInvites && remotePendingInvites.email === authState.session?.email.toLowerCase()
          ? remotePendingInvites.invites
          : [],
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        recoverPassword,
        resetPassword,
        verifyRecoveryOtp,
        changePassword,
        addEmployee,
        updateEmployee,
        removeEmployee,
        refreshPendingInvites: () => refreshPendingInvites(),
        resendInvite,
        revokeInvite,
        getHomeRoute,
        getAllowedRoutes,
        hasRouteAccess,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
