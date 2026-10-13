import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";

import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import { translate } from "../lib/i18n";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, changePassword, resetPassword } = useAuth();
  const { state } = useStore();
  const language = state.user.preferences.language;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { recovery } = useLocalSearchParams<{ recovery?: string }>();
  const isRecovery = recovery === "1";

  const handleSubmit = async () => {
    setMessage(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }

    const result = isRecovery
      ? await resetPassword(newPassword)
      : await changePassword(currentPassword, newPassword);
    setMessage(result.message);
    if (result.success) {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}><Card.Content>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{translate(language, "changePasswordTitle")}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{isRecovery ? "Choose a new password for your StockTrack account." : session?.email}</Text>
        {!isRecovery ? <TextInput label={translate(language, "currentPasswordLabel")} secureTextEntry={!passwordVisible} value={currentPassword} onChangeText={setCurrentPassword} style={styles.input} mode="outlined" autoCapitalize="none" right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible((visible) => !visible)} />} /> : null}
        <TextInput label={translate(language, "newPasswordLabel")} secureTextEntry={!passwordVisible} value={newPassword} onChangeText={setNewPassword} style={styles.input} mode="outlined" autoCapitalize="none" right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible((visible) => !visible)} />} />
        <TextInput label="Confirm New Password" secureTextEntry={!passwordVisible} value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} mode="outlined" autoCapitalize="none" right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible((visible) => !visible)} />} />
        <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>Use at least 8 characters with a letter and a number.</Text>
        {message ? <Text style={[styles.message, { color: success ? theme.colors.secondary : theme.colors.error }]}>{message}</Text> : null}
        <View style={styles.row}>
          <Button mode="contained" onPress={handleSubmit} disabled={(!isRecovery && !currentPassword) || !newPassword || !confirmPassword}>{translate(language, "saveButton")}</Button>
          <Button onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings" as Href))}>{translate(language, "cancelButton")}</Button>
        </View>
      </Card.Content></Card>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, elevation: 1 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  subtitle: { marginBottom: 12 },
  input: { marginBottom: 12 },
  hint: { fontSize: 12, marginBottom: 12 },
  message: { fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
});
