import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Bell, CalendarClock, Clock, ShieldCheck, Users, TrendingUp, MapPin, Truck } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, type NotificationLogCard, type SalesAttendanceCard, type SalesFollowupCard, type SalesPersonCard } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/Badge';
import {
  mapNotificationLog,
  mapSalesAttendance,
  mapSalesFollowup,
  mapSalesPerson,
  mapUserDisplayName,
} from '@/lib/salesperson-mappers';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

export default function DashboardScreen() {
  const [salesperson, setSalesperson] = useState<SalesPersonCard | null>(null);
  const [metrics, setMetrics] = useState({ totalFollowups: 0, pendingFollowups: 0, attendanceThisWeek: 0, notifications: 0, checkedInToday: false });
  const [todayAttendance, setTodayAttendance] = useState<SalesAttendanceCard | null>(null);
  const [followups, setFollowups] = useState<SalesFollowupCard[]>([]);
  const [notifications, setNotifications] = useState<NotificationLogCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);
    const salespersonRow = session.salesperson;

    setSalesperson(salespersonRow ? mapSalesPerson(salespersonRow) : null);

    if (!salespersonRow) {
      setMetrics({ totalFollowups: 0, pendingFollowups: 0, attendanceThisWeek: 0, notifications: 0, checkedInToday: false });
      setTodayAttendance(null);
      setFollowups([]);
      setNotifications([]);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [followupsRes, attendanceRes, notificationsRes] = await Promise.all([
      supabase
        .from('sales_followups')
        .select('*')
        .eq('sales_person_id', salespersonRow.id)
        .order('followup_at', { ascending: true }),
      supabase
        .from('sales_attendance')
        .select('*')
        .eq('sales_person_id', salespersonRow.id)
        .order('attendance_date', { ascending: false }),
      supabase
        .from('notification_logs')
        .select('*')
        .eq('sales_person_id', salespersonRow.id)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const followupRows = followupsRes.data || [];
    const attendanceRows = attendanceRes.data || [];
    const todayRow = attendanceRows.find((row) => row.attendance_date === today) || null;

    setFollowups(followupRows.slice(0, 5).map(mapSalesFollowup));
    setTodayAttendance(todayRow ? mapSalesAttendance(todayRow) : null);
    setNotifications((notificationsRes.data || []).map(mapNotificationLog));
    setMetrics({
      totalFollowups: followupRows.length,
      pendingFollowups: followupRows.filter((row) => !['completed', 'complete', 'done', 'closed'].includes((row.status || '').toLowerCase())).length,
      attendanceThisWeek: attendanceRows.filter((row) => row.attendance_date >= weekStart).length,
      notifications: notificationsRes.data?.length || 0,
      checkedInToday: !!todayRow?.check_in_at,
    });
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const displayName = salesperson?.name || mapUserDisplayName(null, null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <View style={styles.logoMark}>
            <Truck size={18} color={COLORS.white} />
          </View>
          <Text style={styles.logoLabel}>Sales Hub</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Bell size={18} color={COLORS.textMuted} />
          {metrics.pendingFollowups > 0 && <View style={styles.notifDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.banner}>
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerGreeting}>{greeting},</Text>
            <Text style={styles.bannerName}>{displayName}</Text>
            <View style={styles.bannerStatus}>
              <View style={[styles.statusDot, { backgroundColor: metrics.checkedInToday ? COLORS.success : COLORS.danger }]} />
              <Text style={styles.bannerStatusText}>{metrics.checkedInToday ? 'Checked in today' : 'Not checked in today'}</Text>
            </View>
          </View>
          <ShieldCheck size={48} color={COLORS.primary} strokeWidth={1.5} />
        </View>

        <Text style={styles.sectionLabel}>Overview</Text>
        <View style={styles.metricsGrid}>
          <MetricCard title="Follow-ups" value={metrics.totalFollowups} subtitle="total assigned" color={COLORS.primary} style={styles.metricHalf} icon={<CalendarClock size={18} color={COLORS.primary} />} />
          <MetricCard title="Pending" value={metrics.pendingFollowups} subtitle="open items" color={COLORS.warning} style={styles.metricHalf} icon={<Clock size={18} color={COLORS.warning} />} />
          <MetricCard title="Attendance" value={metrics.attendanceThisWeek} subtitle="records this week" color={COLORS.success} style={styles.metricHalf} icon={<MapPin size={18} color={COLORS.success} />} />
          <MetricCard title="Notifications" value={metrics.notifications} subtitle="recent logs" color={COLORS.info} style={styles.metricHalf} icon={<TrendingUp size={18} color={COLORS.info} />} />
        </View>

        <Text style={styles.sectionLabel}>Today</Text>
        <View style={styles.card}>
          {todayAttendance ? (
            <View style={styles.listItem}>
              <View style={[styles.typeIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Clock size={14} color={COLORS.primary} />
              </View>
              <View style={styles.listItemBody}>
                <Text style={styles.listItemTitle}>{todayAttendance.title}</Text>
                <Text style={styles.listItemSub}>{todayAttendance.subtitle}</Text>
                <Text style={styles.listItemMeta}>{todayAttendance.detail}</Text>
              </View>
              <StatusBadge status={todayAttendance.statusLabel} />
            </View>
          ) : (
            <EmptyState icon={<Users size={28} color={COLORS.textLight} />} title="No attendance record today" subtitle="Open the attendance tab to check in." />
          )}
        </View>

        <Text style={styles.sectionLabel}>Recent Follow-ups</Text>
        <View style={styles.card}>
          {followups.length === 0 ? (
            <EmptyState icon={<CalendarClock size={28} color={COLORS.textLight} />} title="No follow-ups yet" subtitle="Create your first follow-up from the follow-up tab." />
          ) : (
            followups.map((followup, index) => (
              <View key={followup.id} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                <View style={[styles.typeIcon, { backgroundColor: COLORS.warningLight }]}>
                  <CalendarClock size={14} color={COLORS.warning} />
                </View>
                <View style={styles.listItemBody}>
                  <Text style={styles.listItemTitle}>{followup.title}</Text>
                  <Text style={styles.listItemSub}>{followup.subtitle}</Text>
                  <Text style={styles.listItemMeta}>{followup.detail}</Text>
                </View>
                <StatusBadge status={followup.statusLabel} />
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionLabel}>Recent Notifications</Text>
        <View style={styles.card}>
          {notifications.length === 0 ? (
            <EmptyState icon={<Bell size={28} color={COLORS.textLight} />} title="No notification logs" subtitle="Notification history will appear here." />
          ) : (
            notifications.map((entry, index) => (
              <View key={entry.id} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                <View style={[styles.typeIcon, { backgroundColor: COLORS.infoLight }]}>
                  <Bell size={14} color={COLORS.info} />
                </View>
                <View style={styles.listItemBody}>
                  <Text style={styles.listItemTitle}>{entry.title}</Text>
                  <Text style={styles.listItemSub}>{entry.subtitle}</Text>
                  <Text style={styles.listItemMeta}>{entry.detail}</Text>
                </View>
                <StatusBadge status={entry.statusLabel} />
              </View>
            ))
          )}
        </View>

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'web' ? 12 : 48,
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoLabel: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  notifBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, borderWidth: 1.5, borderColor: COLORS.white },
  scroll: { flex: 1 },
  content: { padding: 16 },
  banner: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerCopy: { flex: 1, paddingRight: 16 },
  bannerGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  bannerName: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 8 },
  bannerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  bannerStatusText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  metricHalf: { flex: 1, minWidth: '45%' },
  card: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  listItemBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  typeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listItemBody: { flex: 1, gap: 2 },
  listItemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  listItemSub: { fontSize: 12, color: COLORS.textMuted },
  listItemMeta: { fontSize: 11, color: COLORS.textLight },
});
