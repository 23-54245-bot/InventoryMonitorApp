import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput, Title } from "react-native-paper";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    if (email === "test@example.com" && password === "1234") {
      setMessage("✅ Login successful");
      setResetMessage("");
      router.push("/dashboard");
    } else {
      setMessage("❌ Invalid credentials");
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setResetMessage("Please enter your email to reset your password.");
      return;
    }

    setResetMessage(`A password reset link has been sent to ${email}.`);
    setMessage("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <Title style={styles.title}>Inventory Monitor</Title>
        <Text style={styles.subtitle}>
          Secure access to your warehouse and stock management tools.
        </Text>
        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          label="Password"
          mode="outlined"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword((prev) => !prev)}
            />
          }
        />
        <Button mode="contained" onPress={handleLogin} style={styles.button}>
          Sign In
        </Button>
        <Button mode="text" onPress={handleForgotPassword} compact>
          Forgot Password?
        </Button>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {resetMessage ? <Text style={styles.resetMessage}>{resetMessage}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#eef2ff" },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#4b5563", marginBottom: 24, textAlign: "center" },
  input: { marginBottom: 16 },
  button: { marginTop: 8, paddingVertical: 6 },
  message: { marginTop: 18, textAlign: "center", color: "#dc2626" },
  resetMessage: { marginTop: 12, textAlign: "center", color: "#2563eb" },
});
