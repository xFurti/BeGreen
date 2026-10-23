import "expo-sqlite/localStorage/install";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

// The publishable key is public by design: row level security protects the data.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_URL = url ?? "";
export const SUPABASE_KEY = key ?? "";

// Without these the app runs on-device only: your posts stay local and the feed shows demo proofs.
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
      })
    : null;

export const hasBackend = !!supabase;

if (supabase && process.env.EXPO_OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// Every person gets an anonymous account tied to this device: no email, no password.
export async function ensureSession(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signed.user?.id ?? null;
}
