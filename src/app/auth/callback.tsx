import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { useAuth } from "../../context/auth";
import { supabase } from "../../lib/supabase";

// This route completes OAuth when Android delivers the callback through the app scheme.
export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, getHomeRoute, refreshSession } = useAuth();
  const { code: codeParam, access_token: accessTokenParam, refresh_token: refreshTokenParam, error: errorParam, error_description: errorDescriptionParam } = useLocalSearchParams<{
    code?: string | string[];
    access_token?: string | string[];
    refresh_token?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const code = firstParam(codeParam);
  const accessToken = firstParam(accessTokenParam);
  const refreshToken = firstParam(refreshTokenParam);
  const callbackError = firstParam(errorParam);
  const callbackErrorDescription = firstParam(errorDescriptionParam);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [exchangeError, setExchangeError] = useState("");
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession) {
        void refreshSession();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshSession]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    void Linking.getInitialURL().then((url) => {
      if (url) {
        setRedirectUrl(url);
      }
    });

    const subscription = Linking.addEventListener("url", ({ url }) => setRedirectUrl(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const hasCallbackParams = Boolean(code || accessToken || refreshToken || callbackError || callbackErrorDescription);
    if (Platform.OS === "web" || session || !supabase || exchangeStarted.current || (!redirectUrl && !hasCallbackParams)) {
      return;
    }

    exchangeStarted.current = true;
    let active = true;
    void (async () => {
      const callbackHref = redirectUrl ?? (typeof window !== "undefined" ? window.location.href : "");
      const callbackUrl = callbackHref ? new URL(callbackHref) : null;
      const query = callbackUrl ? callbackUrl.searchParams : new URLSearchParams();
      const hash = callbackUrl ? new URLSearchParams(callbackUrl.hash.replace(/^#/, "")) : null;
      const callbackCode = code ?? query.get("code");
      const callbackAccessToken = accessToken ?? hash?.get("access_token");
      const callbackRefreshToken = refreshToken ?? hash?.get("refresh_token");
      const callbackErrorMessage = callbackErrorDescription ?? callbackError ?? query.get("error_description") ?? query.get("error");
      const result = callbackErrorMessage
        ? { error: new Error(decodeURIComponent(callbackErrorMessage.replace(/\+/g, " "))) }
        : callbackCode
        ? await supabase.auth.exchangeCodeForSession(callbackCode)
        : callbackAccessToken && callbackRefreshToken
          ? await supabase.auth.setSession({ access_token: callbackAccessToken, refresh_token: callbackRefreshToken })
          : { error: new Error("Google returned to the app without an authorization code or session tokens.") };
      const error = result.error;
      if (error) {
        if (active) {
          setExchangeError(error.message);
        }
        return;
      }

      await refreshSession();
    })();

    return () => {
      active = false;
    };
  }, [accessToken, callbackError, callbackErrorDescription, code, redirectUrl, refreshSession, session]);

  useEffect(() => {
    if (session || exchangeError) {
      return;
    }

    const timer = setTimeout(() => setTimedOut(true), Platform.OS === "web" ? 30000 : 15000);
    return () => clearTimeout(timer);
  }, [exchangeError, session]);

  if (session) {
    return <Redirect href={getHomeRoute(session.role) as any} />;
  }

  if (exchangeError || timedOut) {
    return (
      <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, textAlign: "center", marginHorizontal: 24 }}>
          {exchangeError || "Sign-in is taking longer than expected. Please return to the login screen and try again."}
        </Text>
        <Text onPress={() => router.replace("/login")} style={{ color: theme.colors.primary, marginTop: 16 }}>
          Return to login
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ marginTop: 16, color: theme.colors.onBackground }}>Finishing sign-in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center" },
});
