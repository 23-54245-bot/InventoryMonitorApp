import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;


const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};


if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "CRITICAL ENVIRONMENT ERROR:\n" +
    `EXPO_PUBLIC_SUPABASE_URL is: ${supabaseUrl || "MISSING"}\n` +
    `EXPO_PUBLIC_SUPABASE_ANON_KEY is: ${supabaseAnonKey ? "Present" : "MISSING"}\n\n` +
    "Please check that your file is named exactly '.env' and located in the project root."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? webStorage : AsyncStorage,
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

export function requireSupabase() {
  return supabase;
}
