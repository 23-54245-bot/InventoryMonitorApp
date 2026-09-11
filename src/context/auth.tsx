import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

import { readStoredString, writeStoredString } from "../lib/storage";
import { supabase } from "../lib/supabase";

export type UserRole = "Admin" | "Manager" | "Staff";
export type EmployeeStatus = "Active" | "Inactive";

export type AppRoute = "/" | "/inventory" | "/alerts" | "/reports" | "/profit" | "/profile" | "/settings" | "/scan-modal" | "/product" | "/add-product" | "/stock-movement" | "/change-password" | "/pos" | "/sales-history";

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
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
  recoverPassword: (email: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  addEmployee: (employee: Omit<Employee, "id" | "createdAt" | "status">) => Promise<EmployeeResult>;
  updateEmployee: (employeeId: string, patch: Partial<Omit<Employee, "id" | "createdAt">>) => Promise<EmployeeResult>;
  removeEmployee: (employeeId: string) => Promise<EmployeeResult>;
  getHomeRoute: (role?: UserRole) => AppRoute;
  getAllowedRoutes: (role?: UserRole) => string[];
  hasRouteAccess: (route: string, role?: UserRole) => boolean;
};

const SESSION_STORAGE_KEY = "stocktrack.auth.v2";
const LEGACY_SESSION_STORAGE_KEY = "freshmartims.auth";

WebBrowser.maybeCompleteAuthSession();

const routeAccessByRole: Record<UserRole, string[]> = {
  Admin: ["index", "inventory", "alerts", "reports", "profit", "profile", "settings", "scan-modal", "product", "add-product", "stock-movement", "change-password", "pos", "sales-history"],
  Manager: ["index", "inventory", "alerts", "reports", "profit", "profile", "settings", "scan-modal", "product", "add-product", "stock-movement", "change-password", "pos", "sales-history"],
  Staff: ["index", "inventory", "alerts", "reports", "profit", "profile", "settings", "scan-modal", "product", "change-password", "pos", "sales-history"],
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

async function fetchProfileRole(userId: string): Promise<UserRole> {
  if (!supabase) {
    return "Staff";
  }

  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = data?.role;
  return role === "Admin" || role === "Manager" ? role : "Staff";
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
  const [remoteEmployees, setRemoteEmployees] = useState<Employee[] | null>(null);

  const refreshEmployees = async () => {
    if (!supabase) {
      return;
    }

    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      setRemoteEmployees(null);
      return;
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", currentUser.user.id)
      .maybeSingle();
    const profileQuery = supabase
      .from("profiles")
      .select("id, name, email, role, status, created_at")
      .order("created_at", { ascending: false });
    const { data, error } = currentProfile?.store_id
      ? await profileQuery.eq("store_id", currentProfile.store_id)
      : await profileQuery.eq("id", currentUser.user.id);

    if (!error && data) {
      setRemoteEmployees(
        data.map((row) => ({
          id: row.id,
          name: row.name ?? row.email?.split("@")[0] ?? "Unnamed",
          email: row.email ?? "",
          role: (row.role as UserRole) ?? "Staff",
          status: (row.status as EmployeeStatus) ?? "Active",
          createdAt: row.created_at,
        })),
      );
    }
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
    if (!supabase || !authState.session) {
      setRemoteEmployees(null);
      return;
    }
    setRemoteEmployees(null);
    void refreshEmployees();
  }, [authState.session?.email]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const applySupabaseSession = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!session?.user) {
        setRemoteEmployees(null);
        setAuthState((current) => ({ ...current, session: null, employees: [] }));
        return;
      }

      const email = session.user.email ?? "";
      const metadata = session.user.user_metadata ?? {};
      const name = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : email.split("@")[0];
      const nextSession: AuthSession = {
        email,
        name,
        role: "Staff",
        title: roleTitles.Staff,
        team: "StockTrack Store",
      };
      setAuthState((current) => ({ ...current, session: nextSession }));
      void fetchProfileRole(session.user.id).then((role) => {
        setAuthState((current) => current.session?.email === email
          ? { ...current, session: { ...nextSession, role, title: roleTitles[role] } }
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
    const nextSession: AuthSession = {
      email,
      name,
      role: "Staff",
      title: roleTitles.Staff,
      team: "StockTrack Store",
    };
    setAuthState((current) => ({
      ...current,
      session: nextSession,
    }));

    const role = await fetchProfileRole(user.id);
    setAuthState((current) => current.session?.email === email
      ? { ...current, session: { ...nextSession, role, title: roleTitles[role] } }
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
        const role = await fetchProfileRole(data.session.user.id);
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

    const role = await fetchProfileRole(data.user.id);
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

    if (Platform.OS !== "web" && Constants.appOwnership === "expo") {
      return { success: false, message: "Google login needs a custom URL scheme that Expo Go can't handle. Install the built APK (or a dev client) to use Continue with Google." };
    }

    const redirectUri = Platform.OS === "web"
      ? `${window.location.origin}/auth/callback`
      : makeRedirectUri({ native: "inventorymonitorapp://auth/callback" });
    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUri },
      });
      return { success: !error, message: error?.message ?? "" };
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
      const role = await fetchProfileRole(user.id);
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
      const nextSession: AuthSession = {
        email: authenticatedUser.email ?? "",
        name: profileName,
        role: "Staff",
        title: roleTitles.Staff,
        team: "StockTrack Store",
      };
      setAuthState((current) => ({ ...current, session: nextSession }));
      void fetchProfileRole(authenticatedUser.id).then((role) => {
        setAuthState((current) => current.session?.email === nextSession.email
          ? { ...current, session: { ...nextSession, role, title: roleTitles[role] } }
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
    const nextSession: AuthSession = {
      email: user.email ?? "",
      name: profileName,
      role: "Staff",
      title: roleTitles.Staff,
      team: "StockTrack Store",
    };
    setAuthState((current) => ({ ...current, session: nextSession }));
    void fetchProfileRole(user.id).then((role) => {
      setAuthState((current) => current.session?.email === nextSession.email
        ? { ...current, session: { ...nextSession, role, title: roleTitles[role] } }
        : current);
    });
    return { success: true, message: `Signed in as ${profileName}.`, session: nextSession };
  };

  const signInWithGoogle = () => signInWithProvider("google");

  const signOut = () => {
    if (supabase) {
      void supabase.auth.signOut();
    }
    setAuthState((current) => ({ ...current, session: null }));
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

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    return error
      ? { success: false, message: error.message }
      : { success: true, message: "Password recovery instructions were sent if the account exists." };
  };

  const addEmployee = async (employee: Omit<Employee, "id" | "createdAt" | "status">): Promise<EmployeeResult> => {
    const emailNormalized = employee.email.trim().toLowerCase();

    if (!employee.name.trim() || !emailNormalized || !employee.role) {
      return { success: false, message: "Name, email, and role are required." };
    }

    if (supabase) {
      if (remoteEmployees?.some((item) => item.email.toLowerCase() === emailNormalized)) {
        return { success: false, message: "An employee with this email already exists." };
      }

      const inviteError = await syncInvite(emailNormalized, employee.role);
      if (inviteError) {
        return { success: false, message: `Could not create the invite: ${inviteError}` };
      }

      return {
        success: true,
        message: `Invite saved for ${emailNormalized}. No email was sent; they must sign up with this email to join as ${employee.role}.`,
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
      const existing = remoteEmployees?.find((employee) => employee.id === employeeId);

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
      const existing = remoteEmployees?.find((employee) => employee.id === employeeId);

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
        employees: supabase && remoteEmployees ? remoteEmployees : authState.employees,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        recoverPassword,
        changePassword,
        addEmployee,
        updateEmployee,
        removeEmployee,
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

