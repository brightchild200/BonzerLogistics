import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';


export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;

    async function guard() {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;

        // landing rule: login is landing page
        if (!data.user) {
          router.replace('/(auth)/login');
        } else {
          router.replace('/(tabs)');
        }
      } catch (error) {
        if (cancelled) return;
        console.warn('[root] auth guard failed, sending user to login:', error);
        router.replace('/(auth)/login');
      }
    }

    guard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
