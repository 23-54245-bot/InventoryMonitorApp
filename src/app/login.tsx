import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput, Title, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOutUp } from "react-native-reanimated";

import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import { translate } from "../lib/i18n";

export default function LoginScreen() {
  const router = useRouter();
  const { email: invitedEmail, invite } = useLocalSearchParams<{ email?: string; invite?: string }>();
  const theme = useTheme();
  const { session, signIn, signUp, signInWithGoogle, recoverPassword, getHomeRoute } = useAuth();
  const { state } = useStore();
  const language = state.user.preferences.language;
  const [email, setEmail] = useState(invite === "1" && invitedEmail ? invitedEmail : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createAccount, setCreateAccount] = useState(invite === "1" && Boolean(invitedEmail));
  const [recovering, setRecovering] = useState(false);
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (session) {
    return <Redirect href={getHomeRoute(session.role) as any} />;
  }

  const handleLogin = async () => {
    setError("");
    setSuccessMessage("");
    setLoginLoading(true);
    const result = await signIn(email, password);
    setLoginLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }
  };

  const handleCreateAccount = async () => {
    setError("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoginLoading(true);
    const result = await signUp(name, email, password);
    setLoginLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }

    if (result.session) {
      return;
    }

    setSuccessMessage(result.message);
    setCreateAccount(false);
    setPassword("");
    setConfirmPassword("");
  };

  const handleBackToLogin = () => {
    setCreateAccount(false);
    setRecovering(false);
    setName("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMessage("");
    router.replace("/login");
  };

  const handleRecoverPassword = async () => {
    setError("");
    setSuccessMessage("");
    setLoginLoading(true);
    const result = await recoverPassword(email);
    setLoginLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setSuccessMessage(result.message);
  };

  const handleGoogleLogin = async () => {
    setError("");
    setSuccessMessage("");
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Google sign-in could not be completed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Animated.View entering={FadeIn.duration(450)} style={[styles.headerBand, Platform.OS === "web" && styles.webHeaderBand, { backgroundColor: theme.colors.primary }] }>
        <View style={[styles.headerCircleLarge, { backgroundColor: `${theme.colors.onPrimary}12` }]} />
        <View style={[styles.headerCircleSmall, { backgroundColor: `${theme.colors.onPrimary}12` }]} />
        <View style={[styles.brandMark, Platform.OS === "web" && styles.webBrandMark]}>
          <MaterialCommunityIcons name="warehouse" size={38} color={theme.colors.primary} />
        </View>
        <Title style={[styles.brandTitle, Platform.OS === "web" && styles.webBrandTitle, { color: theme.colors.onPrimary }]}>StockTrack</Title>
        <Text style={[styles.brandSubtitle, Platform.OS === "web" && styles.webBrandSubtitle, { color: `${theme.colors.onPrimary}cc` }]}>Inventory Management System</Text>
      </Animated.View>

      <ScrollView
        style={styles.contentWrap}
        contentContainerStyle={styles.formScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(500).delay(120)}>
        <Card style={[styles.loginCard, Platform.OS === "web" && styles.webLoginCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.background }]}> 
          <Card.Content style={Platform.OS === "web" ? styles.webCardContent : undefined}>
            <Title style={[styles.welcome, Platform.OS === "web" && styles.webWelcome, { color: theme.colors.onSurface }]}>{createAccount ? translate(language, "createAccountButton") : recovering ? translate(language, "resetPasswordTitle") : translate(language, "welcomeBack")}</Title>
            <Text style={[styles.subtitle, Platform.OS === "web" && styles.webSubtitle, { color: theme.colors.onSurfaceVariant }]}>{createAccount ? translate(language, "createAccountSubtitle") : recovering ? translate(language, "resetPasswordSubtitle") : translate(language, "loginSubtitle")}</Text>

            {createAccount ? (
              <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)}>
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>{translate(language, "nameInputLabel")}</Text>
                <TextInput mode="outlined" value={name} onChangeText={setName} autoCapitalize="words" importantForAutofill="no" outlineColor={theme.colors.outline} activeOutlineColor={theme.colors.primary} style={[styles.input, { backgroundColor: theme.colors.background }]} />
              </Animated.View>
            ) : null}

            <Text style={[styles.label, { color: theme.colors.onSurface }]}>{translate(language, "emailLabel")}</Text>
            <TextInput
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              importantForAutofill="no"
              keyboardType="email-address"
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              style={[styles.input, { backgroundColor: theme.colors.background }]}
            />

            {!recovering ? <>
              <Text style={[styles.label, { color: theme.colors.onSurface }]}>{translate(language, "passwordLabel")}</Text>
              <TextInput
                mode="outlined"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                importantForAutofill="no"
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                style={[styles.input, { backgroundColor: theme.colors.background }]}
                right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword((current) => !current)} />}
              />
            </> : null}

            {createAccount ? (
              <Animated.View entering={FadeInDown.duration(300).delay(50)} exiting={FadeOutUp.duration(200)}>
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>{translate(language, "confirmPasswordLabel")}</Text>
                <TextInput mode="outlined" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoCapitalize="none" importantForAutofill="no" outlineColor={theme.colors.outline} activeOutlineColor={theme.colors.primary} style={[styles.input, { backgroundColor: theme.colors.background }]} />
              </Animated.View>
            ) : null}

            {!createAccount && !recovering ? <View style={styles.forgotRow}>
              <Button mode="text" compact textColor={theme.colors.primary} onPress={() => { setRecovering(true); setError(""); setSuccessMessage(""); }}>
                {translate(language, "forgotPassword")}
              </Button>
            </View> : null}

              <Button mode="contained" loading={loginLoading} disabled={loginLoading || googleLoading} onPress={createAccount ? handleCreateAccount : recovering ? handleRecoverPassword : handleLogin} style={[styles.signInButton, Platform.OS === "web" && styles.webSignInButton]} contentStyle={[styles.signInContent, Platform.OS === "web" && styles.webSignInContent]}>
              {createAccount ? translate(language, "createAccountButton") : recovering ? translate(language, "sendResetLink") : translate(language, "signInButton")}
            </Button>

            {!recovering ? <Button mode="outlined" icon="google" loading={googleLoading} disabled={googleLoading} onPress={handleGoogleLogin} style={styles.googleButton} contentStyle={[styles.signInContent, Platform.OS === "web" && styles.webSignInContent]}>
              {translate(language, "continueWithGoogle")}
            </Button> : null}

            <View style={styles.legalNotice}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{translate(language, "legalAgreementPrefix")}{" "}</Text>
              <Pressable onPress={() => router.push("/terms-of-service" as Href)} accessibilityRole="link">
                <Text style={[styles.legalLink, { color: theme.colors.primary }]}>{translate(language, "termsOfService")}</Text>
              </Pressable>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{" "}{translate(language, "legalAgreementAnd")}{" "}</Text>
              <Pressable onPress={() => router.push("/privacy-policy" as Href)} accessibilityRole="link">
                <Text style={[styles.legalLink, { color: theme.colors.primary }]}>{translate(language, "privacyPolicy")}</Text>
              </Pressable>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>.</Text>
            </View>

            <Button mode="text" icon={createAccount || recovering ? "arrow-left" : "account-plus-outline"} onPress={createAccount || recovering ? handleBackToLogin : () => { setCreateAccount(true); setError(""); setSuccessMessage(""); setPassword(""); setConfirmPassword(""); }} style={styles.switchButton}>
              {createAccount || recovering ? translate(language, "backToLogin") : translate(language, "createAccountButton")}
            </Button>

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
            {successMessage ? <Text style={[styles.errorText, { color: theme.colors.secondary }]}>{successMessage}</Text> : null}

            <Text style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "footerText")}</Text>
          </Card.Content>
        </Card>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerBand: { height: 230, paddingTop: 28, paddingHorizontal: 22, alignItems: "center", overflow: "hidden" },
  webHeaderBand: { height: 178, paddingTop: 16 },
  headerCircleLarge: { position: "absolute", width: 210, height: 210, borderRadius: 105, top: -92, left: -88 },
  headerCircleSmall: { position: "absolute", width: 170, height: 170, borderRadius: 85, top: -86, right: -62 },
  brandMark: { width: 78, height: 78, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", marginBottom: 14 },
  webBrandMark: { width: 58, height: 58, borderRadius: 18, marginBottom: 8 },
  brandTitle: { fontSize: 30, fontWeight: "800", marginBottom: 4 },
  webBrandTitle: { fontSize: 25, marginBottom: 2 },
  brandSubtitle: { fontSize: 16 },
  webBrandSubtitle: { fontSize: 13 },
  contentWrap: { flex: 1, marginTop: -38, paddingHorizontal: 18 },
  webCardContent: { padding: 14 },
  webLoginCard: { borderRadius: 20 },
  webWelcome: { fontSize: 24, lineHeight: 29, marginBottom: 3 },
  webSubtitle: { fontSize: 13, marginBottom: 9 },
  formScrollContent: { paddingBottom: 28 },
  loginCard: { borderRadius: 24, elevation: 4, borderWidth: 1 },
  welcome: { fontSize: 30, fontWeight: "800", marginBottom: 6 },
  subtitle: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8, marginTop: 6 },
  input: { marginBottom: 2 },
  forgotRow: { alignItems: "flex-end", marginTop: 4 },
  signInButton: { marginTop: 12, borderRadius: 16 },
  webSignInButton: { marginTop: 8 },
  biometricButton: { marginTop: 12, borderRadius: 16 },
  switchButton: { marginTop: 4 },
  googleButton: { marginTop: 10, borderRadius: 16 },
  legalNotice: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 12, paddingHorizontal: 8 },
  legalLink: { textDecorationLine: "underline" },
  signInContent: { height: 52 },
  webSignInContent: { height: 43 },
  errorText: { marginTop: 12, textAlign: "center" },
  footer: { textAlign: "center", marginTop: 18, fontSize: 12 },
});
