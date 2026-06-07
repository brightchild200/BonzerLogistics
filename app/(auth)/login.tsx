import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Truck, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { debugLog } from '@/lib/debugLog';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return; }
    setError(''); setLoading(true);
    debugLog('login.tsx:handleLogin:pre', 'signIn starting', { emailDomain: email.split('@')[1] }, 'E');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    debugLog('login.tsx:handleLogin:post', 'signIn result', {
      hasError: !!signInError,
      errorMsg: signInError?.message,
      hasSession: !!data?.session,
      userId: data?.user?.id,
    }, 'E');
    if (signInError) { setError(signInError.message); } else { router.replace('/(tabs)'); }
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
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.sub}>Sign in to your dashboard</Text>
            {error ? (<View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>) : null}
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
                <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor={COLORS.textLight} secureTextEntry={!showPassword} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={16} color={COLORS.textMuted} /> : <Eye size={16} color={COLORS.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={[styles.submitBtn, loading && styles.disabled]} onPress={handleLogin} disabled={loading}>
              <Text style={styles.submitText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
            </TouchableOpacity>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild><TouchableOpacity><Text style={styles.link}>Create account</Text></TouchableOpacity></Link>
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
  input: { flex: 1, fontSize: 14, color: COLORS.text, height: 44 }, eyeBtn: { padding: 4 },
  submitBtn: { backgroundColor: COLORS.primary, height: 44, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  disabled: { opacity: 0.7 }, submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, footerText: { fontSize: 14, color: COLORS.textMuted },
  link: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
