import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Platform, Alert, TextInput, ActivityIndicator } from 'react-native';
import { ClipboardCheck, MapPin, Clock, LogIn, LogOut, CheckCircle, AlertCircle, Navigation, History } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, type SalesAttendanceRow } from '@/lib/types';
import { StatusBadge } from '@/components/Badge';
import { mapSalesAttendance } from '@/lib/salesperson-mappers';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

async function getLocation(): Promise<{ lat: number; lng: number; accuracy: number | null; address: string }> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const {
            latitude: lat,
            longitude: lng,
            accuracy,
          } = pos.coords;
          let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
              headers: { 'User-Agent': 'SalesHub/1.0' },
            });
            const data = await res.json();
            if (data.display_name) address = data.display_name.split(',').slice(0, 3).join(', ').trim();
          } catch {}
          resolve({ lat, lng, accuracy, address });
        },
        () => resolve({ lat: 0, lng: 0, accuracy: null, address: '' }),
      );
    } else {
      resolve({ lat: 0, lng: 0, accuracy: null, address: '' });
    }
  });
}

export default function AttendanceScreen() {
  const [todayRecord, setTodayRecord] = useState<SalesAttendanceRow | null>(null);
  const [history, setHistory] = useState<SalesAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [sessionError, setSessionError] = useState('');

  async function loadData() {
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);

    if (!session.salesperson) {
      setSessionError('No salesperson profile is linked to this account yet.');
      setTodayRecord(null);
      setHistory([]);
      return;
    }

    setSessionError('');
    const today = new Date().toISOString().split('T')[0];
    const [todayRes, historyRes] = await Promise.all([
      supabase.from('sales_attendance').select('*').eq('sales_person_id', session.salesperson.id).eq('attendance_date', today).maybeSingle(),
      supabase.from('sales_attendance').select('*').eq('sales_person_id', session.salesperson.id).order('attendance_date', { ascending: false }).limit(14),
    ]);

    setTodayRecord(todayRes.data);
    setHistory((historyRes.data || []).filter((row) => row.attendance_date !== today));
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function handleCheckIn() {
    setError('');
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);
    if (!session.salesperson) {
      setLoading(false);
      setError('No salesperson record found for this account.');
      return;
    }

    const { lat, lng, accuracy, address } = await getLocation();
    const today = new Date().toISOString().split('T')[0];
    const { error: insertError } = await supabase.from('sales_attendance').insert({
      sales_person_id: session.salesperson.id,
      user_id: session.appUser?.id ?? null,
      attendance_date: today,
      check_in_at: new Date().toISOString(),
      check_in_lat: lat,
      check_in_lng: lng,
      check_in_accuracy_meters: accuracy,
      site_name: address ? address.split(',')[0] : null,
      site_address: address || null,
      notes: notes.trim() || null,
      status: 'checked_in',
      approval_status: 'pending',
      device_info: Platform.OS,
    } as any);
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNotes('');
    loadData();
  }

  async function handleCheckOut() {
    if (!todayRecord) return;
    setError('');
    setLoading(true);
    const { lat, lng, accuracy } = await getLocation();
    const { error: updateError } = await supabase
      .from('sales_attendance')
      .update({
        check_out_at: new Date().toISOString(),
        check_out_lat: lat,
        check_out_lng: lng,
        check_out_accuracy_meters: accuracy,
        status: 'checked_out',
      })
      .eq('id', todayRecord.id);
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    loadData();
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const isCheckedIn = !!todayRecord?.check_in_at;
  const isCheckedOut = !!todayRecord?.check_out_at;
  const statusColor = isCheckedOut ? COLORS.success : isCheckedIn ? COLORS.primary : COLORS.textMuted;
  const todayCard = todayRecord ? mapSalesAttendance(todayRecord) : null;

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.pageTitle}>Attendance</Text>
          <Text style={styles.pageDate}>{new Date().toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusChipText, { color: statusColor }]}>{isCheckedOut ? 'Complete' : isCheckedIn ? 'Checked in' : 'Not in'}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.actionCard}>
          <View style={styles.clockDisplay}>
            <Clock size={20} color={COLORS.textMuted} />
            <Text style={styles.clockText}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>

          {sessionError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{sessionError}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!isCheckedIn ? (
            <>
              <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes} placeholder="Add check-in notes (optional)..." placeholderTextColor={COLORS.textLight} multiline numberOfLines={2} />
              <TouchableOpacity style={[styles.checkBtn, styles.checkInBtn, loading && styles.disabled]} onPress={handleCheckIn} disabled={loading || !!sessionError}>
                {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : <LogIn size={20} color={COLORS.white} />}
                <Text style={styles.checkBtnText}>{loading ? 'Checking in...' : 'Check In'}</Text>
              </TouchableOpacity>
              <View style={styles.gpsHint}>
                <Navigation size={12} color={COLORS.textLight} />
                <Text style={styles.gpsHintText}>GPS coordinates will be stored in the attendance row</Text>
              </View>
            </>
          ) : isCheckedOut ? (
            <View style={styles.completedView}>
              <CheckCircle size={40} color={COLORS.success} />
              <Text style={styles.completedTitle}>Day complete</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.checkBtn, styles.checkOutBtn, loading && styles.disabled]} onPress={handleCheckOut} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : <LogOut size={20} color={COLORS.white} />}
              <Text style={styles.checkBtnText}>{loading ? 'Checking out...' : 'Check Out'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {todayCard ? (
          <>
            <Text style={styles.sectionTitle}>Today&apos;s Record</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryTitle}>{todayCard.title}</Text>
                <Text style={styles.summarySub}>{todayCard.subtitle}</Text>
                <Text style={styles.summaryMeta}>{todayCard.detail}</Text>
              </View>
              <StatusBadge status={todayCard.statusLabel} />
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Recent History</Text>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <History size={32} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No previous attendance records</Text>
          </View>
        ) : (
          <View style={styles.historyCard}>
            {history.map((rec, idx) => {
              const card = mapSalesAttendance(rec);
              return (
                <View key={rec.id} style={[styles.historyRow, idx > 0 && styles.historyBorder]}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDateText}>{new Date(rec.attendance_date).toLocaleDateString()}</Text>
                    <Text style={styles.historyTimes}>
                      {rec.check_in_at ? new Date(rec.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No check-in'}
                      {' • '}
                      {rec.check_out_at ? new Date(rec.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open'}
                    </Text>
                  </View>
                  <StatusBadge status={card.statusLabel} />
                </View>
              );
            })}
          </View>
        )}
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
  pageDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  actionCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  clockDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  clockText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  errorBox: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.dangerLight, borderRadius: 6, padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: COLORS.danger },
  errorText: { fontSize: 13, color: COLORS.danger, flex: 1 },
  notesInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 10, fontSize: 14, color: COLORS.text, height: 60, textAlignVertical: 'top', marginBottom: 14 },
  checkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 10 },
  checkInBtn: { backgroundColor: COLORS.primary },
  checkOutBtn: { backgroundColor: COLORS.danger },
  disabled: { opacity: 0.7 },
  checkBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  gpsHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'center' },
  gpsHintText: { fontSize: 11, color: COLORS.textLight, textAlign: 'center' },
  completedView: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  completedTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  summaryLeft: { flex: 1, gap: 4 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  summarySub: { fontSize: 12, color: COLORS.textMuted },
  summaryMeta: { fontSize: 11, color: COLORS.textLight },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', padding: 32, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  historyCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 12 },
  historyBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  historyLeft: { flex: 1, gap: 4 },
  historyDateText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  historyTimes: { fontSize: 12, color: COLORS.textMuted },
});
