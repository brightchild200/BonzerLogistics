import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const memoryAuthStorage = new Map<string, string>();
let storageWarningShown = false;

function warnStorageFallback(error: unknown) {
  if (storageWarningShown) return;
  storageWarningShown = true;
  console.warn('[supabase] falling back to in-memory auth storage:', error);
}

const safeAuthStorage = {
  async getItem(key: string) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) return value;
    } catch (error) {
      warnStorageFallback(error);
    }
    return memoryAuthStorage.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    memoryAuthStorage.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      warnStorageFallback(error);
    }
  },
  async removeItem(key: string) {
    memoryAuthStorage.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      warnStorageFallback(error);
    }
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: safeAuthStorage,
    storageKey: 'sb-auth',
  },
});
