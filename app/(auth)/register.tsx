import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Truck, Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { debugLog } from '@/lib/debugLog';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setLoading(true);
    debugLog('register.tsx:handleRegister:pre', 'signUp starting', {
      hasUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      emailDomain: email.split('@')[1],
    }, 'A');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    debugLog('register.tsx:handleRegister:post', 'signUp result', {
      hasError: !!signUpError,
      errorMsg: signUpError?.message,
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      emailConfirmedAt: data?.user?.email_confirmed_at,
    }, 'B,D');

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.session && data.user) {
      setLoading(false);
      router.replace('/(tabs)');
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    debugLog('register.tsx:autoSignIn', 'auto signIn after signup', {
      hasError: !!signInError,
      errorMsg: signInError?.message,
      hasSession: !!signInData?.session,
    }, 'B,E');

    setLoading(false);

    if (signInData?.session && signInData.user) {
      router.replace('/(tabs)');
      return;
    }

    const needsConfirmation = signInError?.message?.toLowerCase().includes('confirm');
    setError(
      needsConfirmation
        ? 'Account created! Check your email to confirm, then sign in.'
        : 'Account created! Please sign in with your credentials.',
    );
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.logoWrap}>
              <View style={styles.logoCircle}><Truck size={28} color={COLORS.white} /></View>
              <Text style={styles.logoText}>LogiSales</Text>
            </View>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.sub}>Start managing your sales pipeline</Text>
            {error ? (<View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>) : null}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full name</Text>
              <View style={styles.inputRow}>
                <User size={16} color={COLORS.textMuted} />
                <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="John Smith" placeholderTextColor={COLORS.textLight} autoCapitalize="words" />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputRow}>
                <Mail size={16} color={COLORS.textMuted} />
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={COLORS.textLight} keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={COLORS.textMuted} />
                <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword} placeholder="Min 6 characters" placeholderTextColor={COLORS.textLight} secureTextEntry={!showPassword} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} color={COLORS.textMuted} /> : <Eye size={16} color={COLORS.textMuted} />}</TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={[styles.submitBtn, loading && styles.disabled]} onPress={handleRegister} disabled={loading}>
              <Text style={styles.submitText}>{loading ? 'Creating account...' : 'Create account'}</Text>
            </TouchableOpacity>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild><TouchableOpacity><Text style={styles.link}>Sign in</Text></TouchableOpacity></Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg }, kav: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 32, maxWidth: 440, width: '100%', alignSelf: 'center', borderWidth: 1, borderColor: COLORS.border },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }, logoCircle: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  heading: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 6 }, sub: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24 },
  errorBox: { backgroundColor: COLORS.dangerLight, borderRadius: 6, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.danger },
  errorText: { fontSize: 13, color: COLORS.danger, fontWeight: '500' },
  fieldGroup: { marginBottom: 16 }, label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 12, height: 44, backgroundColor: COLORS.white, gap: 8 },
  input: { flex: 1, fontSize: 14, color: COLORS.text, height: 44 },
  submitBtn: { backgroundColor: COLORS.primary, height: 44, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  disabled: { opacity: 0.7 }, submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, footerText: { fontSize: 14, color: COLORS.textMuted },
  link: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
