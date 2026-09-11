import { Alert, Platform } from "react-native";

// react-native-web's Alert.alert() is a no-op, so alerts must fall back to window.alert() to be visible on web.
export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  Alert.alert(title, message);
}
