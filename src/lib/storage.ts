import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export async function readStoredString(key: string) {
  try {
    if (Platform.OS === "web") {
      return typeof window === "undefined" ? null : window.localStorage.getItem(key);
    }

    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writeStoredString(key: string, value: string | null) {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return;
      }

      if (value === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }

      return;
    }

    if (value === null) {
      await AsyncStorage.removeItem(key);
      return;
    }

    await AsyncStorage.setItem(key, value);
  } catch {
    return;
  }
}
