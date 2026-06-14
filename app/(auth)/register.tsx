import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Dimensions,
} from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { debugLog } from '@/lib/debugLog';
import { User, Mail, Lock, Eye, EyeOff, Phone, Truck as TruckIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Text as SvgText, Ellipse, Circle, Line, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

function AnimatedTruckBackground() {
  const truckPos = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(truckPos, {
        toValue: width + 50,
        duration: 7000,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
  }, [truckPos]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[styles.blob, styles.blobOrange]} />
      <View style={[styles.blob, styles.blobBlue]} />

      <View style={styles.roadWrap}>
        <LinearGradient colors={['#0f1c2e', '#111c2d']} style={styles.road}>
          <View style={[styles.roadLine, { left: '10%' }]} />
          <View style={[styles.roadLine, { left: '50%' }]} />
          <View style={[styles.roadLine, { left: '90%' }]} />
        </LinearGradient>
      </View>

      <Animated.View style={[styles.truckWrap, { transform: [{ translateX: truckPos }] }]}>
        <Svg width="220" height="68" viewBox="0 0 220 68" fill="none">
          <Rect x="0" y="8" width="148" height="46" rx="4" fill="#1e3a5f" />
          <Rect x="0" y="8" width="148" height="46" rx="4" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <Rect x="0" y="8" width="148" height="6" rx="4" fill="#f97316" opacity="0.8" />
          <SvgText x="50" y="35" fontFamily="System" fontSize="11" fontWeight="800" fill="rgba(255,255,255,0.7)" letterSpacing="2">BONZER</SvgText>
          <SvgText x="48" y="46" fontFamily="System" fontSize="7" fill="rgba(255,255,255,0.3)" letterSpacing="1">LOGISTICS</SvgText>
          <Rect x="8" y="20" width="26" height="26" rx="4" fill="rgba(249,115,22,0.2)" stroke="rgba(249,115,22,0.4)" strokeWidth="1" />
          <SvgText x="14" y="37" fontSize="13" fill="#f97316">⬡</SvgText>
          <Rect x="148" y="14" width="52" height="40" rx="5" fill="#0f2540" />
          <Rect x="148" y="14" width="52" height="40" rx="5" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <Rect x="155" y="18" width="32" height="22" rx="3" fill="rgba(14,165,233,0.25)" stroke="rgba(14,165,233,0.3)" strokeWidth="1" />
          <Rect x="152" y="10" width="44" height="6" rx="3" fill="#0d2035" />
          <Rect x="148" y="14" width="52" height="5" rx="3" fill="#f97316" opacity="0.7" />
          <Rect x="196" y="28" width="8" height="6" rx="2" fill="#fef08a" />
          <Ellipse cx="204" cy="31" rx="10" ry="5" fill="rgba(254,240,138,0.06)" />
          <Rect x="143" y="30" width="8" height="8" rx="2" fill="#0a1c30" />
          <Ellipse cx="100" cy="67" rx="100" ry="3" fill="rgba(0,0,0,0.25)" />
          <G x="28" y="58">
            <Circle r="9" fill="#1a2a3a" stroke="#334155" strokeWidth="2" />
            <Circle r="4" fill="#0f1e2e" />
            <Line x1="0" y1="-8" x2="0" y2="8" stroke="#475569" strokeWidth="1.5" />
            <Line x1="-8" y1="0" x2="8" y2="0" stroke="#475569" strokeWidth="1.5" />
          </G>
          <G x="50" y="58">
            <Circle r="9" fill="#1a2a3a" stroke="#334155" strokeWidth="2" />
            <Circle r="4" fill="#0f1e2e" />
            <Line x1="0" y1="-8" x2="0" y2="8" stroke="#475569" strokeWidth="1.5" />
            <Line x1="-8" y1="0" x2="8" y2="0" stroke="#475569" strokeWidth="1.5" />
          </G>
          <G x="174" y="58">
            <Circle r="9" fill="#1a2a3a" stroke="#334155" strokeWidth="2" />
            <Circle r="4" fill="#0f1e2e" />
            <Line x1="0" y1="-8" x2="0" y2="8" stroke="#475569" strokeWidth="1.5" />
            <Line x1="-8" y1="0" x2="8" y2="0" stroke="#475569" strokeWidth="1.5" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

export default function RegisterScreen() {
  // DB fields matching public.users schema
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'admin' | 'sales_person'>('sales_person');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);

    debugLog('register.tsx:handleRegister:pre', 'signUp starting', {
      hasUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      emailDomain: email.split('@')[1],
      role,
    }, 'A');

    // 1. Create auth user in Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    // 2. Insert into public.users table to match schema
    if (data.user) {
      const { error: insertError } = await supabase.from('users').insert({
        username: username.trim(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        role,
        is_active: true,

        auth_user_id: data.user.id, 
      });

      if (insertError) {
        debugLog('register.tsx:insertUser:error', 'users table insert failed', { msg: insertError.message }, 'E');
        // Non-fatal — auth user was created; log the error and continue
      }
    }

    debugLog('register.tsx:handleRegister:post', 'signUp result', {
      hasError: !!signUpError,
      hasUser: !!data?.user,
      userId: data?.user?.id,
    }, 'B,D');

    // 3. Try auto sign-in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInData?.session && signInData.user) {
      router.replace('/(tabs)');
      return;
    }

    setError(
      signInError?.message?.toLowerCase().includes('confirm')
        ? 'Account created! Check your email to confirm, then sign in.'
        : 'Account created! Please sign in with your credentials.',
    );
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#050d1a', '#0f1c2e']} style={StyleSheet.absoluteFillObject} />
      <AnimatedTruckBackground />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* Top Glow Line */}
            <View style={styles.cardGlowLine} />

            {/* Logo Row */}
            <View style={styles.logoRow}>
              <LinearGradient colors={['#f97316', '#ea580c']} style={styles.logoBadge}>
                <TruckIcon size={20} color="#fff" />
              </LinearGradient>
              <Text style={styles.logoText}>Bonzer<Text style={styles.logoAccent}>.</Text></Text>
            </View>

            <Text style={styles.eyebrow}>Operations Portal</Text>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.sub}>Register your credentials below</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Role Toggle */}
            <View style={styles.roleToggleContainer}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive]}
                onPress={() => setRole('admin')}
              >
                <Text style={[styles.roleBtnText, role === 'admin' && styles.roleBtnTextActive]}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'sales_person' && styles.roleBtnActive]}
                onPress={() => setRole('sales_person')}
              >
                <Text style={[styles.roleBtnText, role === 'sales_person' && styles.roleBtnTextActive]}>Sales Person</Text>
              </TouchableOpacity>
            </View>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputRow}>
                <User size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Smith"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputRow}>
                <User size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="your_username"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputRow}>
                <Mail size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@bonzerlogistics.com"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone <Text style={styles.optional}>(optional)</Text></Text>
              <View style={styles.inputRow}>
                <Phone size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputRow}>
                <Lock size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1, paddingLeft: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword
                    ? <EyeOff size={16} color="rgba(255,255,255,0.2)" />
                    : <Eye size={16} color="rgba(255,255,255,0.2)" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#f97316', '#ea580c']} style={styles.submitGradient}>
                <Text style={styles.submitText}>{loading ? 'Creating account...' : 'Create account'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.trackDots}>
              <View style={styles.tdot} />
              <View style={[styles.tdot, styles.tdotActive]} />
              <View style={styles.tdot} />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050d1a', overflow: 'hidden' },
  kav: { flex: 1, zIndex: 10 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 40 },

  // Background
  blob: { position: 'absolute', borderRadius: 9999, opacity: 0.15 },
  blobOrange: { width: 300, height: 300, backgroundColor: '#ea580c', top: -60, left: -80 },
  blobBlue: { width: 220, height: 220, backgroundColor: '#0ea5e9', bottom: 60, right: -40 },
  roadWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  road: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
    borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  roadLine: {
    position: 'absolute', top: 38, width: 120, height: 4,
    backgroundColor: '#f97316', borderRadius: 2, opacity: 0.5,
  },
  truckWrap: { position: 'absolute', bottom: 80, left: -260 },

  // Glass Card
  card: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 36,
    paddingTop: 38,
    paddingBottom: 32,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#ea580c',
    shadowOpacity: 0.08,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
  cardGlowLine: {
    position: 'absolute', top: 0, left: '20%', right: '20%',
    height: 1, backgroundColor: 'rgba(249,115,22,0.7)',
  },

  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 26 },
  logoBadge: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  logoAccent: { color: '#f97316' },

  // Typography
  eyebrow: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#f97316', marginBottom: 5, fontWeight: '600' },
  heading: { fontSize: 25, fontWeight: '700', color: '#fff', marginBottom: 5, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.32)', marginBottom: 24 },

  // Error
  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.15)', borderRadius: 10, padding: 12,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#d63939',
  },
  errorText: { fontSize: 13, color: '#fecaca', fontWeight: '600' },

  // Role Toggle
  roleToggleContainer: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 4, marginBottom: 20,
  },
  roleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  roleBtnActive: { backgroundColor: 'rgba(249,115,22,0.15)' },
  roleBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  roleBtnTextActive: { color: '#f97316' },

  // Fields
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6, letterSpacing: 0.3 },
  required: { color: '#f97316' },
  optional: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.45)',
    borderRadius: 12,
    height: 48,
    shadowColor: '#f97316',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  inputIcon: { marginLeft: 13, marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 13, height: '100%' },
  eyeBtn: { paddingHorizontal: 12, height: '100%', justifyContent: 'center' },

  // CTA
  submitBtn: {
    width: '100%', borderRadius: 12, overflow: 'hidden',
    shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 }, elevation: 5, marginTop: 6,
  },
  submitGradient: { padding: 13, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.7 },

  // Track Dots
  trackDots: { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  tdot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.1)' },
  tdotActive: { backgroundColor: '#f97316', width: 18, borderRadius: 3 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  link: { fontSize: 13, fontWeight: '700', color: '#f97316' },
});
