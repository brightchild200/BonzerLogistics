import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, RefreshControl } from 'react-native';
import { User, Phone, MapPin, Building2, BadgeCheck, Edit2, Save, LogOut, Users, CalendarClock, Mail, Briefcase } from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, type SalesPersonRow, type UserRow } from '@/lib/types';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { mapUserDisplayName } from '@/lib/salesperson-mappers';
import { StatusBadge } from '@/components/Badge';

export default function ProfileScreen() {
  const [appUser, setAppUser] = useState<UserRow | null>(null);
  const [salesperson, setSalesperson] = useState<SalesPersonRow | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    username: '',
    mobile: '',
    designation: '',
    department: '',
    address: '',
    emergency_contact: '',
    date_of_joining: '',
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ followups: 0, attendance: 0, notifications: 0 });
  const [userEmail, setUserEmail] = useState('');

  async function loadData() {
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);

    setUserEmail(auth.user?.email || '');
    setAppUser(session.appUser);
    setSalesperson(session.salesperson);
    setRoles(session.roles);

    setForm({
      full_name: session.appUser?.full_name || session.salesperson?.name || '',
      phone: session.appUser?.phone || '',
      username: session.appUser?.username || '',
      mobile: session.salesperson?.mobile || '',
      designation: session.salesperson?.designation || '',
      department: session.salesperson?.department || '',
      address: session.salesperson?.address || '',
      emergency_contact: session.salesperson?.emergency_contact || '',
      date_of_joining: session.salesperson?.date_of_joining || '',
    });

    if (session.salesperson) {
      const [followupsRes, attendanceRes, notificationRes] = await Promise.all([
        supabase.from('sales_followups').select('id', { count: 'exact' }).eq('sales_person_id', session.salesperson.id),
        supabase.from('sales_attendance').select('id', { count: 'exact' }).eq('sales_person_id', session.salesperson.id),
        supabase.from('notification_logs').select('id', { count: 'exact' }).eq('sales_person_id', session.salesperson.id),
      ]);

      setStats({
        followups: followupsRes.count || 0,
        attendance: attendanceRes.count || 0,
        notifications: notificationRes.count || 0,
      });
    } else {
      setStats({ followups: 0, attendance: 0, notifications: 0 });
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function handleSave() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);

    if (session.appUser) {
      await supabase.from('users').update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        username: form.username.trim() || null,
      }).eq('id', session.appUser.id);
    }

    if (session.salesperson) {
      await supabase.from('sales_persons').update({
        name: form.full_name.trim() || session.salesperson.name,
        mobile: form.mobile.trim() || session.salesperson.mobile,
        designation: form.designation.trim() || null,
        department: form.department.trim() || null,
        address: form.address.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        date_of_joining: form.date_of_joining.trim() || null,
      }).eq('id', session.salesperson.id);
    }

    setSaving(false);
    setEditing(false);
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const displayName = mapUserDisplayName(appUser, salesperson);
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function titleCaseRole(r: string) {
    return r
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <Text style={styles.pageTitle}>Profile</Text>
        {editing ? (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Save size={16} color={COLORS.white} />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Edit2 size={16} color={COLORS.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.banner}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.bannerName}>{displayName}</Text>
          <Text style={styles.bannerEmail}>{userEmail}</Text>
          <View style={styles.bannerStatus}>
            <StatusBadge status={salesperson?.is_active === false ? 'inactive' : 'active'} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Users size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.followups}</Text>
            <Text style={styles.statLabel}>Follow-ups</Text>
          </View>
          <View style={styles.statBox}>
            <CalendarClock size={18} color={COLORS.warning} />
            <Text style={styles.statValue}>{stats.attendance}</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statBox}>
            <MapPin size={18} color={COLORS.success} />
            <Text style={styles.statValue}>{stats.notifications}</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Information</Text>
        <View style={styles.infoCard}>
          {editing ? (
            <View style={styles.editForm}>
              {[
                { key: 'full_name', label: 'Full Name', icon: <User size={15} color={COLORS.textMuted} />, placeholder: 'John Smith' },
                { key: 'phone', label: 'Phone', icon: <Phone size={15} color={COLORS.textMuted} />, placeholder: '+1 555 000' },
                { key: 'username', label: 'Username', icon: <BadgeCheck size={15} color={COLORS.textMuted} />, placeholder: 'johndoe' },
                { key: 'mobile', label: 'Mobile', icon: <Phone size={15} color={COLORS.textMuted} />, placeholder: '+1 555 000' },
                { key: 'designation', label: 'Designation', icon: <Building2 size={15} color={COLORS.textMuted} />, placeholder: 'Sales Executive' },
                { key: 'department', label: 'Department', icon: <Building2 size={15} color={COLORS.textMuted} />, placeholder: 'Sales' },
                { key: 'address', label: 'Address', icon: <MapPin size={15} color={COLORS.textMuted} />, placeholder: 'Office address' },
                { key: 'emergency_contact', label: 'Emergency Contact', icon: <Phone size={15} color={COLORS.textMuted} />, placeholder: '+1 555 111' },
                { key: 'date_of_joining', label: 'Date of Joining', icon: <CalendarClock size={15} color={COLORS.textMuted} />, placeholder: '2026-01-01' },
              ].map((field) => (
                <View key={field.key} style={styles.formRow}>
                  <View style={styles.formLabelRow}>
                    {field.icon}
                    <Text style={styles.formLabel}>{field.label}</Text>
                  </View>
                  <TextInput
                    style={styles.formInput}
                    value={(form as any)[field.key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize={field.key.includes('name') || field.key === 'designation' || field.key === 'department' ? 'words' : 'none'}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View>
              {[
                { icon: <User size={15} color={COLORS.textMuted} />, label: 'Full Name', value: displayName },
                { icon: <Mail size={15} color={COLORS.textMuted} />, label: 'Auth Email', value: userEmail || '—' },
                { icon: <Phone size={15} color={COLORS.textMuted} />, label: 'Phone', value: appUser?.phone || '—' },
                { icon: <BadgeCheck size={15} color={COLORS.textMuted} />, label: 'Username', value: appUser?.username || '—' },
                { icon: <Briefcase size={15} color={COLORS.textMuted} />, label: 'Roles', value: roles.map(titleCaseRole).join(', ') || '—' },
                { icon: <Phone size={15} color={COLORS.textMuted} />, label: 'Mobile', value: salesperson?.mobile || '—' },
                { icon: <Building2 size={15} color={COLORS.textMuted} />, label: 'Designation', value: salesperson?.designation || '—' },
                { icon: <Building2 size={15} color={COLORS.textMuted} />, label: 'Department', value: salesperson?.department || '—' },
                { icon: <MapPin size={15} color={COLORS.textMuted} />, label: 'Address', value: salesperson?.address || '—' },
                { icon: <Phone size={15} color={COLORS.textMuted} />, label: 'Emergency Contact', value: salesperson?.emergency_contact || '—' },
                { icon: <CalendarClock size={15} color={COLORS.textMuted} />, label: 'Date of Joining', value: salesperson?.date_of_joining || '—' },
              ].map((row, idx) => (
                <View key={idx} style={[styles.infoRow, idx > 0 && styles.infoRowBorder]}>
                  <View style={styles.infoRowLeft}>
                    {row.icon}
                    <Text style={styles.infoLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Sales Hub v1.0</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'web' ? 14 : 50,
  },
  pageTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  editBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  scroll: { flex: 1 },
  content: { padding: 16 },
  banner: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 26, fontWeight: '800', color: COLORS.white },
  bannerName: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 3 },
  bannerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  bannerStatus: { marginTop: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  infoCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  infoLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, maxWidth: '55%', textAlign: 'right' },
  editForm: { padding: 16, gap: 14 },
  formRow: { gap: 6 },
  formLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  formInput: { height: 42, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 12, fontSize: 14, color: COLORS.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 10, borderWidth: 1, borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight, marginBottom: 16 },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  version: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginBottom: 8 },
});
