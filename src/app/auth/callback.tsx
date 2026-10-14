import type { Href } from "expo-router";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { useAuth } from "../../context/auth";
import { supabase } from "../../lib/supabase";

function getWebCallbackError() {
  if (Platform.OS !== "web" || typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  return url.searchParams.get("error_description")
    ?? url.searchParams.get("error")
    ?? hash.get("error_description")
    ?? hash.get("error")
    ?? "";
}

function subscribeToLocationChanges() {
  return () => undefined;
}

function getServerCallbackError() {
  return "";
}

/**
 * AuthCallbackScreen
 *
 * Handles OAuth & password-reset callbacks for both platforms:
 *
 * WEB  — Supabase has detectSessionInUrl:true, so the client auto-exchanges
 *         the ?code= on page load and fires onAuthStateChange (handled in
 *         auth.tsx). We just need to show a spinner and wait for `session`
 *         to appear, then redirect. For the recovery flow we also redirect
 *         to /change-password.
 *
 * NATIVE — Android/iOS deliver the deep-link back to this route. We read the
 *         URL, manually exchange the code / set tokens, then refresh the
 *         in-memory session.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, getHomeRoute, refreshSession } = useAuth();
  const [exchangeError, setExchangeError] = useState("");
  const webCallbackError = useSyncExternalStore(
    subscribeToLocationChanges,
    getWebCallbackError,
    getServerCallbackError,
  );
  const visibleExchangeError = exchangeError || webCallbackError;
  const [timedOut, setTimedOut] = useState(false);
  const exchangeStarted = useRef(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const [isRecovery, setIsRecovery] = useState(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const u = new URL(window.location.href);
        const h = new URLSearchParams(u.hash.replace(/^#/, ""));
        return u.searchParams.get("type") === "recovery" || h.get("type") === "recovery";
      } catch {
        return false;
      }
    }
    return false;
  });

  // ── WEB ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const href = typeof window !== "undefined" ? window.location.href : "";
    if (!href) return;

    const url = new URL(href);
    const query = url.searchParams;
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const errorMsg = query.get("error_description") ?? query.get("error") ?? hash.get("error_description") ?? hash.get("error");
    const code = query.get("code") ?? hash.get("code");
    if (errorMsg) return;
    if (!code || session) return;

    void (async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setExchangeError(error.message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authentication could not be completed.";
        setExchangeError(message);
      }
    })();
  }, [session]);

  // ── NATIVE ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;

    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession) void refreshSession();
    });
    return () => data.subscription.unsubscribe();
  }, [refreshSession]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const inspectUrl = (rawUrl: string) => {
      try {
        const u = new URL(rawUrl);
        const q = u.searchParams;
        const h = new URLSearchParams(u.hash.replace(/^#/, ""));
        if (q.get("type") === "recovery" || h.get("type") === "recovery") {
          setIsRecovery(true);
        }
      } catch {}
    };

    void Linking.getInitialURL().then((url) => {
      if (url) {
        inspectUrl(url);
        setRedirectUrl(url);
      }
    });
    const sub = Linking.addEventListener("url", ({ url }) => {
      inspectUrl(url);
      setRedirectUrl(url);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" || !redirectUrl || exchangeStarted.current) return;

    exchangeStarted.current = true;
    let active = true;
    void (async () => {
      const callbackUrl = new URL(redirectUrl);
      const query = callbackUrl.searchParams;
      const hash = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
      const code = query.get("code") ?? hash.get("code");
      const accessToken = query.get("access_token") ?? hash.get("access_token");
      const refreshToken = query.get("refresh_token") ?? hash.get("refresh_token");
      const errorMsg = query.get("error_description") ?? query.get("error");
      const callbackType = query.get("type") ?? hash.get("type");

      if (callbackType === "recovery") {
        setIsRecovery(true);
      }

      const result = errorMsg
        ? { error: new Error(errorMsg) }
        : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : { error: new Error("Authentication returned without authorization code or session tokens.") };

      if (result.error) {
        if (active) setExchangeError(result.error.message);
        return;
      }

      await refreshSession();
    })();

    return () => { active = false; };
  }, [redirectUrl, refreshSession, router]);

  // ── Timeout guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (session || visibleExchangeError) return;
    const timer = setTimeout(() => setTimedOut(true), Platform.OS === "web" ? 12000 : 10000);
    return () => clearTimeout(timer);
  }, [session, visibleExchangeError]);

  // ── Redirect once session is ready ────────────────────────────────────────
  if (session) {
    if (isRecovery) {
      return <Redirect href="/change-password?recovery=1" />;
    }
    return <Redirect href={getHomeRoute(session.role) as Href} />;
  }

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      {visibleExchangeError ? (
        <>
          <Text style={{ color: theme.colors.error, textAlign: "center", marginHorizontal: 24 }}>
            {visibleExchangeError}
          </Text>
          <Text
            style={{ marginTop: 12, color: theme.colors.primary, textDecorationLine: "underline" }}
            onPress={() => router.replace("/login")}
          >
            Back to Log In
          </Text>
        </>
      ) : timedOut ? (
        <>
          <Text style={{ color: theme.colors.onBackground }}>Sign-in is taking longer than expected.</Text>
          <Text
            style={{ marginTop: 12, color: theme.colors.primary, textDecorationLine: "underline" }}
            onPress={() => router.replace("/login")}
          >
            Back to Log In
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onBackground }}>Finishing sign-in…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center" },
});
