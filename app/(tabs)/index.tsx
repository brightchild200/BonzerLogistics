import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AlertCircle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, type NotificationLogCard, type SalesAttendanceCard, type SalesFollowupCard, type SalesPersonCard } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/Badge';
import { mapNotificationLog, mapSalesAttendance, mapSalesFollowup, mapSalesPerson, mapUserDisplayName } from '@/lib/salesperson-mappers';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

type DashboardMetrics = {
  totalFollowups: number;
  pendingFollowups: number;
  attendanceThisWeek: number;
  notifications: number;
  checkedInToday: boolean;
};

const initialMetrics: DashboardMetrics = {
  totalFollowups: 0,
  pendingFollowups: 0,
  attendanceThisWeek: 0,
  notifications: 0,
  checkedInToday: false,
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.panel}>{children}</View>
    </View>
  );
}

function ListRow({
  icon,
  title,
  subtitle,
  detail,
  status,
  accent,
  bordered,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail: string;
  status: string;
  accent: string;
  bordered?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={[styles.row, bordered && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: accent }]}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
        <Text style={styles.rowMeta}>{detail}</Text>
      </View>
      <View style={styles.rowTrail}>{trailing ?? <StatusBadge status={status} />}</View>
    </View>
  );
}

function toneColor(tone: string) {
  switch (tone) {
    case 'success':
      return COLORS.success;
    case 'warning':
      return COLORS.warning;
    case 'danger':
      return COLORS.danger;
    case 'info':
      return COLORS.info;
    default:
      return COLORS.textLight;
  }
}

export default function DashboardScreen() {
  const [salesperson, setSalesperson] = useState<SalesPersonCard | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [todayAttendance, setTodayAttendance] = useState<SalesAttendanceCard | null>(null);
  const [followups, setFollowups] = useState<SalesFollowupCard[]>([]);
  const [notifications, setNotifications] = useState<NotificationLogCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      console.log('[dashboard] load start');
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      console.log('[dashboard] auth ok:', !authErr, authErr ?? null);

      const session = await resolveSalespersonSession(auth.user?.email ?? null);
      console.log('[dashboard] session resolved:', {
        hasAuthEmail: !!session.authEmail,
        hasAppUser: !!session.appUser,
        hasSalesperson: !!session.salesperson,
      });

      const salespersonRow = session.salesperson;
      setSalesperson(salespersonRow ? mapSalesPerson(salespersonRow) : null);

      if (!salespersonRow) {
        console.warn('[dashboard] no salesperson mapping found for the current auth user');
        setMetrics(initialMetrics);
        setTodayAttendance(null);
        setFollowups([]);
        setNotifications([]);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const [followupsRes, attendanceRes, notificationsRes] = await Promise.all([
        supabase.from('sales_followups').select('*').eq('sales_person_id', salespersonRow.id).order('followup_at', { ascending: true }),
        supabase.from('sales_attendance').select('*').eq('sales_person_id', salespersonRow.id).order('attendance_date', { ascending: false }),
        supabase.from('notification_logs').select('*').eq('sales_person_id', salespersonRow.id).order('created_at', { ascending: false }).limit(8),
      ]);

      console.log('[dashboard] query status:', {
        followups: !followupsRes.error,
        attendance: !attendanceRes.error,
        notifications: !notificationsRes.error,
      });

      if (followupsRes.error) console.error('[dashboard] sales_followups error:', followupsRes.error);
      if (attendanceRes.error) console.error('[dashboard] sales_attendance error:', attendanceRes.error);
      if (notificationsRes.error) console.error('[dashboard] notification_logs error:', notificationsRes.error);

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

      console.log('[dashboard] load success:', {
        followups: followupRows.length,
        attendance: attendanceRows.length,
        notifications: notificationsRes.data?.length || 0,
      });
    } catch (error) {
      console.error('[dashboard] load failed:', error);
    }
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
  const followupStatusBreakdown = followups.reduce<Record<string, { label: string; count: number; tone: string }>>((acc, item) => {
    const label = item.statusLabel || 'Unknown';
    if (!acc[label]) {
      acc[label] = { label, count: 0, tone: item.statusTone };
    }
    acc[label].count += 1;
    return acc;
  }, {});
  const followupStatusEntries = Object.values(followupStatusBreakdown).sort((a, b) => b.count - a.count);
  const highestStatusCount = Math.max(1, ...followupStatusEntries.map((entry) => entry.count));

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.page}>
          <View style={styles.topbar}>
            <View>
              <View style={styles.brandRow}>
                <View style={styles.logoMark}>
                  <LayoutDashboard size={18} color={COLORS.white} />
                </View>
                <Text style={styles.brandLabel}>Logistics Pro</Text>
              </View>
              <Text style={styles.pageTitle}>Sales Overview</Text>
              <Text style={styles.pageSubtitle}>Tabler-style snapshot of live sales activity from Supabase.</Text>
            </View>

            <View style={styles.actions}>
              <View style={styles.searchBox}>
                <Search size={16} color={COLORS.textLight} />
                <Text style={styles.searchText}>Search leads, visits, follow-ups</Text>
              </View>
              <Pressable style={styles.iconButton} onPress={onRefresh}>
                <RefreshCw size={16} color={COLORS.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.banner}>
            <View style={styles.bannerCopy}>
              <View style={styles.bannerEyebrowRow}>
                <TrendingUp size={14} color={COLORS.primary} />
                <Text style={styles.bannerEyebrow}>Operations pulse</Text>
              </View>
              <Text style={styles.bannerTitle}>{greeting}, {displayName}</Text>
              <Text style={styles.bannerText}>The dashboard is stitched from follow-ups, attendance, and notification logs so the working set stays visible at a glance.</Text>
              <View style={styles.bannerMetaRow}>
                <View style={styles.bannerMeta}>
                  <CheckCircle2 size={14} color={metrics.checkedInToday ? COLORS.success : COLORS.warning} />
                  <Text style={styles.bannerMetaText}>{metrics.checkedInToday ? 'Checked in today' : 'Not checked in today'}</Text>
                </View>
                <View style={styles.bannerMeta}>
                  <Clock3 size={14} color={COLORS.textMuted} />
                  <Text style={styles.bannerMetaText}>{metrics.pendingFollowups} open follow-ups</Text>
                </View>
                <View style={styles.bannerMeta}>
                  <Bell size={14} color={COLORS.info} />
                  <Text style={styles.bannerMetaText}>{metrics.notifications} recent logs</Text>
                </View>
              </View>
            </View>

            <View style={styles.bannerStats}>
              <View style={styles.bannerStat}>
                <Text style={styles.bannerStatValue}>{metrics.totalFollowups}</Text>
                <Text style={styles.bannerStatLabel}>Follow-ups</Text>
              </View>
              <View style={styles.bannerStat}>
                <Text style={styles.bannerStatValue}>{metrics.attendanceThisWeek}</Text>
                <Text style={styles.bannerStatLabel}>Attendance this week</Text>
              </View>
              <View style={styles.bannerStat}>
                <Text style={styles.bannerStatValue}>{metrics.notifications}</Text>
                <Text style={styles.bannerStatLabel}>Notification logs</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard title="Follow-ups" value={metrics.totalFollowups} subtitle="total assigned" color={COLORS.primary} style={styles.metricCard} icon={<CalendarClock size={18} color={COLORS.primary} />} />
            <MetricCard title="Pending" value={metrics.pendingFollowups} subtitle="open items" color={COLORS.warning} style={styles.metricCard} icon={<AlertCircle size={18} color={COLORS.warning} />} />
            <MetricCard title="Attendance" value={metrics.attendanceThisWeek} subtitle="records this week" color={COLORS.success} style={styles.metricCard} icon={<MapPinned size={18} color={COLORS.success} />} />
            <MetricCard title="Notifications" value={metrics.notifications} subtitle="recent logs" color={COLORS.info} style={styles.metricCard} icon={<Bell size={18} color={COLORS.info} />} />
          </View>

          <View style={styles.dashboardGrid}>
            <View style={styles.mainColumn}>
              <Section title="Today" subtitle="Current attendance state for the signed-in salesperson.">
                {todayAttendance ? (
                  <View style={styles.attendanceCard}>
                    <View style={styles.attendanceHeader}>
                      <View style={styles.attendanceCopy}>
                        <Text style={styles.attendanceTitle}>{todayAttendance.title}</Text>
                        <Text style={styles.attendanceSubtitle}>{todayAttendance.subtitle}</Text>
                      </View>
                      <StatusBadge status={todayAttendance.statusLabel} />
                    </View>
                    <View style={styles.attendanceMetaGrid}>
                      <View style={styles.attendanceMeta}>
                        <Text style={styles.attendanceMetaLabel}>Detail</Text>
                        <Text style={styles.attendanceMetaValue}>{todayAttendance.detail}</Text>
                      </View>
                      <View style={styles.attendanceMeta}>
                        <Text style={styles.attendanceMetaLabel}>State</Text>
                        <Text style={styles.attendanceMetaValue}>{todayAttendance.statusLabel}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <EmptyState icon={<Users size={28} color={COLORS.textLight} />} title="No attendance record today" subtitle="Open the attendance tab to check in." />
                )}
              </Section>

              <Section title="Recent Follow-ups" subtitle="Ordered by scheduled time from sales_followups.">
                {followups.length === 0 ? (
                  <EmptyState icon={<CalendarClock size={28} color={COLORS.textLight} />} title="No follow-ups yet" subtitle="Create your first follow-up from the follow-up tab." />
                ) : (
                  followups.map((followup, index) => (
                    <ListRow
                      key={followup.id}
                      icon={<CalendarClock size={14} color={COLORS.warning} />}
                      title={followup.title}
                      subtitle={followup.subtitle}
                      detail={followup.detail}
                      status={followup.statusLabel}
                      accent={COLORS.warningLight}
                      bordered={index > 0}
                    />
                  ))
                )}
              </Section>

              <Section title="Recent Notifications" subtitle="Live notification_logs from Supabase.">
                {notifications.length === 0 ? (
                  <EmptyState icon={<Bell size={28} color={COLORS.textLight} />} title="No notification logs" subtitle="Notification history will appear here." />
                ) : (
                  notifications.map((entry, index) => (
                    <ListRow
                      key={entry.id}
                      icon={<Bell size={14} color={COLORS.info} />}
                      title={entry.title}
                      subtitle={entry.subtitle}
                      detail={entry.detail}
                      status={entry.statusLabel}
                      accent={COLORS.infoLight}
                      bordered={index > 0}
                    />
                  ))
                )}
              </Section>
            </View>

            <View style={styles.sideColumn}>
              <Section title="Follow-up status" subtitle="A quick distribution of the current working set.">
                {followupStatusEntries.length === 0 ? (
                  <EmptyState icon={<ShieldCheck size={28} color={COLORS.textLight} />} title="No status data" subtitle="Follow-up status buckets will appear once items are loaded." />
                ) : (
                  <View style={styles.breakdownStack}>
                    {followupStatusEntries.map((entry) => {
                      const width = `${Math.max(8, Math.round((entry.count / highestStatusCount) * 100))}%`;
                      return (
                        <View key={entry.label} style={styles.breakdownItem}>
                          <View style={styles.breakdownHead}>
                            <Text style={styles.breakdownLabel}>{entry.label}</Text>
                            <Text style={styles.breakdownValue}>{entry.count}</Text>
                          </View>
                          <View style={styles.breakdownTrack}>
                      <View style={[styles.breakdownFill, { width: `${Math.max(0, Math.min(100, Math.round((entry.count / highestStatusCount) * 100)))}%`, backgroundColor: toneColor(entry.tone) }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Section>

              <Section title="Sync Status" subtitle="Basic runtime trace for Supabase wiring.">
                <View style={styles.statusStack}>
                  <View style={styles.statusLine}>
                    <Text style={styles.statusLabel}>Auth</Text>
                    <Text style={styles.statusValue}>supabase.auth.getUser()</Text>
                  </View>
                  <View style={styles.statusLine}>
                    <Text style={styles.statusLabel}>Session</Text>
                    <Text style={styles.statusValue}>resolveSalespersonSession()</Text>
                  </View>
                  <View style={styles.statusLine}>
                    <Text style={styles.statusLabel}>Tables</Text>
                    <Text style={styles.statusValue}>sales_persons, sales_followups, sales_attendance, notification_logs</Text>
                  </View>
                  <View style={styles.statusLine}>
                    <Text style={styles.statusLabel}>Result</Text>
                    <Text style={[styles.statusValue, { color: salesperson ? COLORS.success : COLORS.warning }]}>{salesperson ? 'Connected' : 'No salesperson mapped'}</Text>
                  </View>
                </View>
              </Section>

              <Section title="Operational Snapshot" subtitle="The fields already exist in the current schema.">
                <View style={styles.snapshotHeader}>
                  <View style={styles.snapshotAvatar}>
                    <Users size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.snapshotCopy}>
                    <Text style={styles.snapshotName}>{salesperson?.name || 'Unresolved'}</Text>
                    <Text style={styles.snapshotRole}>{salesperson?.subtitle || 'No metadata'}</Text>
                  </View>
                </View>
                <View style={styles.snapshotItem}>
                  <Text style={styles.snapshotLabel}>Contact</Text>
                  <Text style={styles.snapshotValue}>{salesperson?.meta || 'No contact info'}</Text>
                </View>
                <View style={styles.snapshotItem}>
                  <Text style={styles.snapshotLabel}>Status</Text>
                  <Text style={styles.snapshotValue}>{salesperson?.statusLabel || 'Unresolved'}</Text>
                </View>
              </Section>

              <Section title="Source Coverage" subtitle="Quick read on what the dashboard actually queried.">
                <View style={styles.coverageRow}>
                  <Text style={styles.coverageLabel}>sales_followups</Text>
                  <Text style={styles.coverageValue}>{metrics.totalFollowups}</Text>
                </View>
                <View style={styles.coverageRow}>
                  <Text style={styles.coverageLabel}>sales_attendance</Text>
                  <Text style={styles.coverageValue}>{metrics.attendanceThisWeek}</Text>
                </View>
                <View style={styles.coverageRow}>
                  <Text style={styles.coverageLabel}>notification_logs</Text>
                  <Text style={styles.coverageValue}>{metrics.notifications}</Text>
                </View>
              </Section>

              <View style={styles.footerNote}>
                <TrendingUp size={14} color={COLORS.success} />
                <Text style={styles.footerNoteText}>Console logs show load start, auth/session state, table query status, and success/failure.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  page: { width: '100%', maxWidth: 1220, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  topbar: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logoMark: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  brandLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  pageSubtitle: { marginTop: 4, fontSize: 13, color: COLORS.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    minWidth: 280,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.gray50,
  },
  searchText: { fontSize: 13, color: COLORS.textLight, flexShrink: 1 },
  iconButton: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  banner: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  bannerCopy: { flex: 1, minWidth: 280 },
  bannerEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bannerEyebrow: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '700' },
  bannerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: 0 },
  bannerText: { marginTop: 8, maxWidth: 720, fontSize: 14, lineHeight: 20, color: COLORS.textMuted },
  bannerMetaRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bannerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.gray50,
  },
  bannerMetaText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  bannerStats: { width: 320, maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignSelf: 'flex-start' },
  bannerStat: {
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 96,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.gray50,
    gap: 4,
  },
  bannerStatValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  bannerStatLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '700' },
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  heroCopy: { flex: 1, minWidth: 280 },
  heroGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.72)' },
  heroName: { fontSize: 28, fontWeight: '800', color: COLORS.white, marginTop: 2 },
  heroText: { marginTop: 8, maxWidth: 720, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.8)' },
  heroStatus: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  heroStatusText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  heroSide: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  heroStat: {
    width: 150,
    minHeight: 118,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    justifyContent: 'space-between',
  },
  heroStatValue: { fontSize: 30, fontWeight: '800', color: COLORS.white },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.72)' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flexGrow: 1, flexBasis: 220, minWidth: 220 },
  dashboardGrid: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  mainColumn: { flex: 1, minWidth: 320, gap: 16 },
  sideColumn: { width: 340, maxWidth: '100%', gap: 16 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionSubtitle: { marginTop: 2, fontSize: 12, color: COLORS.textMuted },
  panel: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textMuted },
  rowMeta: { fontSize: 11, color: COLORS.textLight },
  rowTrail: { alignItems: 'flex-end' },
  attendanceCard: { padding: 14, gap: 12 },
  attendanceHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  attendanceCopy: { flex: 1, minWidth: 0, gap: 2 },
  attendanceTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  attendanceSubtitle: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  attendanceMetaGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  attendanceMeta: { flexGrow: 1, flexBasis: 160, gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  attendanceMetaLabel: { fontSize: 11, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '700' },
  attendanceMetaValue: { fontSize: 13, color: COLORS.text, fontWeight: '600', lineHeight: 18 },
  breakdownStack: { gap: 14, padding: 14 },
  breakdownItem: { gap: 8 },
  breakdownHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  breakdownLabel: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  breakdownValue: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
  breakdownTrack: { height: 8, borderRadius: 999, backgroundColor: COLORS.gray100, overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: 999 },
  statusStack: { gap: 10, padding: 14 },
  statusLine: { gap: 4 },
  statusLabel: { fontSize: 11, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.4 },
  statusValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  snapshotHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  snapshotAvatar: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  snapshotCopy: { flex: 1, gap: 2 },
  snapshotName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  snapshotRole: { fontSize: 12, color: COLORS.textMuted },
  snapshotItem: { padding: 14, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 4 },
  snapshotLabel: { fontSize: 11, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.4 },
  snapshotValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  coverageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  coverageLabel: { fontSize: 13, color: COLORS.text },
  coverageValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  footerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  footerNoteText: { flex: 1, fontSize: 12, lineHeight: 18, color: COLORS.textMuted },
});
