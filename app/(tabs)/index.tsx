import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Bell,
  CalendarClock,
  FileText,
  MapPinned,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  COLORS,
  type NotificationLogRow,
  type SalesAttendanceCard,
  type SalesAttendanceRow,
  type SalesFollowupRow,
  type SalesPersonCard,
} from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/Badge';
import { MetricCard } from '@/components/MetricCard';
import {
  mapNotificationLog,
  mapSalesAttendance,
  mapSalesFollowup,
  mapSalesPerson,
  mapUserDisplayName,
} from '@/lib/salesperson-mappers';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { formatClockTime } from '@/lib/date';
import type { SalesAttendanceInsert } from '@/lib/schema';
import { LogIn, LogOut, CheckCircle, AlertCircle, Navigation } from 'lucide-react-native';


type DashboardMetrics = {
  totalFollowups: number;
  pendingFollowups: number;
  attendanceThisWeek: number;
  enquiriesThisMonth: number;
  checkedInToday: boolean;
  visitsThisMonth: number;
};

const COMPLETED_STATUSES = ['completed', 'complete', 'done', 'closed'];

// Feature flag: controls whether the "View Detailed Analytics" link renders
// under the Performance Overview chart. Defaults to false (hidden).
const ENABLE_DETAILED_ANALYTICS = false;

type EnquiryRow = {
  id: number;
  enq_date: string | null;
  sales_person_id: number | null;
};

type JobRow = {
  id: number;
  enq_date: string | null;
  sales_person_id: number | null;
};

function getFollowupTimestamp(row: SalesFollowupRow): number {
  const scheduled = (row as { followup_at?: string | null }).followup_at;
  if (!scheduled) return Number.POSITIVE_INFINITY;
  const parsed = new Date(scheduled).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

// Web-only pointer cursor for clickable cards. Declared outside StyleSheet.create
// (and typed as `any`) since `cursor` isn't part of React Native's ViewStyle;
// react-native-web reads it fine, and native platforms simply ignore it.
const pointerCursorStyle: any = Platform.OS === 'web' ? { cursor: 'pointer' } : {};

function isClosedFollowup(status: string | null | undefined) {
  return COMPLETED_STATUSES.includes((status || '').trim().toLowerCase());
}

function dateKey(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(value);
}

function getMonthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    start: start.toISOString().slice(0, 10),
    next: next.toISOString().slice(0, 10),
  };
}

function DashboardSection({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel ? (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [styles.sectionAction, pressed && styles.sectionActionPressed]}
          >
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
            <ArrowRight size={14} color={COLORS.primary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function MetricTile({
  title,
  value,
  subtitle,
  accent,
  icon,
  onPress,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  accent: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <>
      <View style={[styles.metricIconWrap, { backgroundColor: `${accent}18` }]}>{icon}</View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{title}</Text>
        <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
        {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.metricCard}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      style={({ pressed }) => [
        styles.metricCard,
        pointerCursorStyle,
        hovered && styles.metricCardHovered,
        pressed && styles.metricCardPressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const ATTENDANCE_BG_CHECKED_IN = '#c1f4c4';
const ATTENDANCE_BG_NOT_CHECKED_IN = '#fa787c';

function formatDashboardCheckInTime(value: string | null | undefined) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return formatClockTime(d);
}

function formatDashboardCheckOutTime(value: string | null | undefined) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return formatClockTime(d);
}

function CheckInTile({
  attendance,
  attendanceRow,
  checkedInToday,
  isChecking,
  onPressCheckIn,
  onPressCheckOut,
}: {
  attendance: SalesAttendanceCard | null;
  attendanceRow: SalesAttendanceRow | null;
  checkedInToday: boolean;
  isChecking: boolean;
  onPressCheckIn: () => void;
  onPressCheckOut: () => void;
}) {
  const isCheckedIn = !!attendanceRow?.check_in_at;
  const isCheckedOut = !!attendanceRow?.check_out_at;

  const cardBgColor = checkedInToday ? ATTENDANCE_BG_CHECKED_IN : ATTENDANCE_BG_NOT_CHECKED_IN;

  const checkInTime = formatClockTime(attendanceRow?.check_in_at ?? '');
  const checkOutTime = formatClockTime(attendanceRow?.check_out_at ?? '');

  return (
    <View style={[styles.checkInCard, { backgroundColor: cardBgColor }]}>
      <View style={styles.checkInHeader}>
        <Text style={[styles.metricLabel, { color: COLORS.primary }]}>Attendance</Text>
        <View style={[styles.checkInBadge, { backgroundColor: COLORS.gray50 }]}>
          <Text style={[styles.checkInBadgeText, { color: COLORS.primary }]}>
            {isCheckedOut ? 'Checked out' : isCheckedIn ? 'Checked in' : 'Not checked in'}
          </Text>
        </View>
      </View>

      <View style={styles.checkInBody}>
        <View style={styles.checkInStatusRow}>
          <Text style={styles.checkInTime}>
            {isCheckedOut ? `In: ${checkInTime} • Out: ${checkOutTime}` : `In: ${isCheckedIn ? checkInTime : '-'}`}
          </Text>
          <StatusBadge
            status={
              attendance?.statusLabel ??
              (isCheckedOut ? 'Checked out' : isCheckedIn ? 'Checked in' : 'Not in')
            }
          />
        </View>

        {!isCheckedIn ? (
          <Pressable
            style={[styles.checkBtn, styles.checkInBtn]}
            onPress={onPressCheckIn}
            accessibilityRole="button"
            accessibilityLabel="Check In"
          >
            <Text style={styles.checkBtnText}>Check In</Text>
          </Pressable>
        ) : isCheckedOut ? (
          <View style={styles.checkedOutPill}>
            <Text style={styles.checkedOutPillText}>Day complete</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.checkBtn, styles.checkBtnMuted, styles.disabled]}
              disabled
              accessibilityRole="button"
              accessibilityLabel="Check In (already checked in)"
            >
              <Text style={styles.checkBtnTextMuted}>Check In</Text>
            </Pressable>
            <Pressable
              style={[styles.checkBtn, styles.checkOutBtn, isChecking && styles.disabled]}
              onPress={onPressCheckOut}
              disabled={isChecking}
              accessibilityRole="button"
              accessibilityLabel="Check Out"
            >
              <Text style={styles.checkBtnText}>Check Out</Text>
            </Pressable>
          </View>
        )}

        {!attendance ? (
          <View style={styles.checkInEmpty}>
            {/* <ShieldCheck size={22} color={COLORS.textLight} /> */}
            {/* <Text style={styles.checkInEmptyText}>No attendance record today</Text> */}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ChartSection({
  series,
  showDetailedAnalytics = false,
}: {
  series: Array<{
    key: string;
    label: string;
    visits: number;
    jobs: number;
    enquiries: number;
  }>;
  showDetailedAnalytics?: boolean;
}) {
  const maxValue = Math.max(1, ...series.map((entry) => Math.max(entry.visits, entry.jobs, entry.enquiries)));

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <Text style={styles.sectionSubtitle}>Total visits, jobs, and enquiries over the last 7 days.</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Visits</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.legendText}>Jobs</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.legendText}>Enquiries</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartArea}>
        {series.map((entry) => (
          <View key={entry.key} style={styles.chartColumn}>
            <View style={styles.chartBars}>
              <View
                style={[
                  styles.chartBar,
                  styles.chartBarPrimary,
                  { height: `${Math.max(8, Math.round((entry.visits / maxValue) * 100))}%` },
                ]}
              />
              <View
                style={[
                  styles.chartBar,
                  styles.chartBarSuccess,
                  { height: `${Math.max(8, Math.round((entry.jobs / maxValue) * 100))}%` },
                ]}
              />
              <View
                style={[
                  styles.chartBar,
                  styles.chartBarWarning,
                  { height: `${Math.max(8, Math.round((entry.enquiries / maxValue) * 100))}%` },
                ]}
              />
            </View>
            <Text style={styles.chartLabel}>{entry.label}</Text>
          </View>
        ))}
      </View>

      {showDetailedAnalytics ? (
        <View style={styles.chartFooter}>
          <Pressable
            onPress={() => {
              console.log('[dashboard] detailed analytics tapped');
            }}
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
          >
            <Text style={styles.linkButtonText}>View Detailed Analytics</Text>
            <ArrowRight size={16} color={COLORS.primary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function AlertItem({
  icon,
  title,
  subtitle,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail: string;
  accent: string;
}) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, { backgroundColor: accent }]}>{icon}</View>
      <View style={styles.timelineBody}>
        <Text style={styles.timelineTitle}>
          <Text style={styles.timelineTitleStrong}>{title}</Text>
          {subtitle ? ` - ${subtitle}` : ''}
        </Text>
        <Text style={styles.timelineDetail}>{detail}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const [salesperson, setSalesperson] = useState<SalesPersonCard | null>(null);
  const [followups, setFollowups] = useState<SalesFollowupRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<SalesAttendanceRow[]>([]);
  const [enquiryRows, setEnquiryRows] = useState<EnquiryRow[]>([]);
  const [jobRows, setJobRows] = useState<JobRow[]>([]);
  const [notificationRows, setNotificationRows] = useState<NotificationLogRow[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<SalesAttendanceCard | null>(null);
  const [todayAttendanceRow, setTodayAttendanceRow] = useState<SalesAttendanceRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const session = await resolveSalespersonSession(auth.user?.email ?? null);
      const salespersonRow = session.salesperson;
      setSalesperson(salespersonRow ? mapSalesPerson(salespersonRow) : null);

      if (!salespersonRow) {
        setFollowups([]);
        setAttendanceRows([]);
        setEnquiryRows([]);
        setJobRows([]);
        setNotificationRows([]);
        setTodayAttendance(null);
        setTodayAttendanceRow(null);
        setLastSyncedAt(null);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const monthBounds = getMonthBounds();

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

      const [enquiriesRes, jobsRes] = await Promise.all([
        (supabase as any)
          .from('enquiries')
          .select('id, enq_date, sales_person_id')
          .eq('sales_person_id', salespersonRow.id)
          .gte('enq_date', monthBounds.start)
          .lt('enq_date', monthBounds.next)
          .order('enq_date', { ascending: false }),
        (supabase as any)
          .from('jobs')
          .select('id, enq_date, sales_person_id')
          .eq('sales_person_id', salespersonRow.id)
          .gte('enq_date', monthBounds.start)
          .lt('enq_date', monthBounds.next)
          .order('enq_date', { ascending: false }),
      ]);

      const followupRows = followupsRes.data || [];
      const attendanceData = attendanceRes.data || [];
      const notificationData = notificationsRes.data || [];
      const enquiryData = enquiriesRes.data || [];
      const jobData = jobsRes.data || [];
      const todayRow = attendanceData.find((row) => row.attendance_date === today) || null;

      setFollowups(followupRows);
      setAttendanceRows(attendanceData);
      setEnquiryRows(enquiryData);
      setJobRows(jobData);
      setNotificationRows(notificationData);
      setTodayAttendance(todayRow ? mapSalesAttendance(todayRow) : null);
      setTodayAttendanceRow(todayRow || null);
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      console.error('[dashboard] load failed:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const displayName = salesperson?.name || mapUserDisplayName(null, null);

  const metrics = useMemo<DashboardMetrics>(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthStart = getMonthBounds().start;
    const attendanceThisWeek = attendanceRows.filter((row) => row.attendance_date >= weekStart).length;
    const visitsThisMonth = attendanceRows.filter((row) => row.attendance_date >= monthStart).length;
    const todayRow = attendanceRows.find((row) => row.attendance_date === todayKey) || null;

    return {
      totalFollowups: followups.length,
      pendingFollowups: followups.filter((row) => !isClosedFollowup(row.status)).length,
      attendanceThisWeek,
      enquiriesThisMonth: enquiryRows.length,
      checkedInToday: !!todayRow?.check_in_at,
      visitsThisMonth,
    };
  }, [attendanceRows, enquiryRows, followups]);

  const upcomingFollowups = useMemo(() => {
    const sorted = [...followups].sort((a, b) => getFollowupTimestamp(a) - getFollowupTimestamp(b));
    return sorted.slice(0, 3).map(mapSalesFollowup);
  }, [followups]);

  const recentAlerts = useMemo(() => notificationRows.slice(0, 3).map(mapNotificationLog), [notificationRows]);

  const weeklySeries = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);

      return {
        key,
        label: formatWeekday(date),
        visits: attendanceRows.filter((row) => row.attendance_date === key).length,
        jobs: jobRows.filter((row) => dateKey(row.enq_date) === key).length,
        enquiries: enquiryRows.filter((row) => dateKey(row.enq_date) === key).length,
      };
    });
  }, [attendanceRows, enquiryRows, jobRows]);

  const alertItems = useMemo(
    () =>
      recentAlerts.slice(0, 3).map((notification) => ({
        key: `notification-${notification.id}`,
        icon: <Bell size={14} color={COLORS.white} />,
        title: notification.title,
        subtitle: notification.subtitle,
        detail: notification.detail,
        accent: COLORS.info,
      })),
    [recentAlerts],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.page}>
          <View style={styles.announcementBar}>
            <View style={styles.announcementCopy}>
              <Megaphone size={18} color={COLORS.white} />
              <Text style={styles.announcementText}>
                Sales sync is live: follow-ups, attendance, and notification logs refresh on pull.
              </Text>
            </View>
          </View>

          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderCopy}>
              <Text style={styles.pageTitle}> Hello! {displayName}</Text>
              <Text style={styles.pageSubtitle}>Here&apos;s your performance for today.</Text>
            </View>
          </View>


          <View style={styles.metricGrid}>

          <CheckInTile
              attendance={todayAttendance}
              attendanceRow={todayAttendanceRow}
              checkedInToday={metrics.checkedInToday}
              isChecking={false}
              onPressCheckIn={async () => {
                const { checkInToday } = await import('@/lib/attendanceActions');
                await checkInToday({ notes: '' });
                await loadData();
              }}
              onPressCheckOut={async () => {
                const { checkOutToday } = await import('@/lib/attendanceActions');
                if (!todayAttendanceRow) return;
                await checkOutToday({ todayAttendanceRow });
                await loadData();
              }}
            />
            
            <MetricTile
              title="Follow-Ups"
              value={metrics.totalFollowups}
              subtitle={`${metrics.pendingFollowups} open`}
              accent={COLORS.primary}
              icon={<CalendarClock size={22} color={COLORS.primary} />}
              onPress={() => router.push('/(tabs)/followups')}
            />


            <MetricTile
              title="Visits"
              value={metrics.visitsThisMonth}
              subtitle="this month"
              accent={COLORS.warning}
              icon={<MapPinned size={22} color={COLORS.warning} />}
              onPress={() => router.push('/(tabs)/attendance')}
            />

            <MetricTile
              title="Enquiries"
              value={metrics.enquiriesThisMonth}
              subtitle="this month"
              accent={COLORS.success}
              icon={<FileText size={22} color={COLORS.success} />}
              onPress={() => router.push('/(tabs)/enquiries')}
            />
            
          </View>

          <ChartSection series={weeklySeries} showDetailedAnalytics={ENABLE_DETAILED_ANALYTICS} />

          <View style={styles.bottomGrid}>
            <DashboardSection
              title="Follow-ups"
              subtitle="View your upcoming follow-ups."
              actionLabel="Schedule"
              onAction={() => router.push('/(tabs)/followups')}
            >
              {upcomingFollowups.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock size={28} color={COLORS.textLight} />}
                  title="No follow-ups yet"
                  subtitle="Create your first follow-up from the follow-up tab."
                />
              ) : (
                <View style={styles.cardList}>
                  {upcomingFollowups.map((followup, index) => (
                    <View key={followup.id} style={[styles.cardRow, index > 0 && styles.cardRowBorder]}>
                      <View style={styles.cardRowCopy}>
                        <Text style={styles.cardRowTitle}>{followup.title}</Text>
                        <Text style={styles.cardRowSubtitle}>{followup.subtitle}</Text>
                      </View>
                      <View style={styles.cardRowMeta}>
                        <Text style={styles.cardRowDetail}>{followup.detail}</Text>
                        <StatusBadge status={followup.statusLabel} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </DashboardSection>

            <DashboardSection
              title="Alerts"
              subtitle="Latest alerts for your account."
              actionLabel="View All"
              onAction={() => router.push('/(tabs)/alerts')}
            >
              {alertItems.length === 0 ? (
                <EmptyState
                  icon={<Users size={28} color={COLORS.textLight} />}
                  title="No alerts yet"
                  subtitle="New alerts will appear here as they come in."
                />
              ) : (
                <View style={styles.timeline}>
                  {alertItems.map((item) => (
                    <AlertItem
                      key={item.key}
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      detail={item.detail}
                      accent={item.accent}
                    />
                  ))}
                </View>
              )}
            </DashboardSection>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {lastSyncedAt ? `Last synced ${formatClockTime(new Date(lastSyncedAt))}` : 'Waiting for data sync'}
            </Text>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>System Status</Text>
              <Text style={styles.footerLink}>Help Center</Text>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  page: {
    width: '100%',
    maxWidth: 1220,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  announcementBar: {
    backgroundColor: COLORS.gray700,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  announcementCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  announcementText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.white,
    fontWeight: '600',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  pageHeaderCopy: {
    flex: 1,
    minWidth: 240,
  },
  pageTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  // metricScroll: {
  //   flexDirection: 'row',
  //   alignItems: 'stretch',
  //   gap: 12,
  //   paddingRight: 2,
  // },

  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // alignItems: 'stretch',
    gap: 16,
  },
  
  metricCard: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 0,
    // width: 250,
    // minWidth: 250,
    width: '23.5%',
    minWidth: 220,
   
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  metricCardHovered: {
    borderColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  metricCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  metricIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCopy: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  metricSubtitle: {
    fontSize: 12,
    color: COLORS.text,
  },

  checkInCard: {
    flexBasis: 0,
    flexGrow: 1,
    // flexBasis: 280,
    // minWidth: 240,
    backgroundColor: '#f0edda',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 18,
    gap: 12,
    width: '23.5%',
    minWidth: 220,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  checkInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.gray50,
  },
  checkInBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checkInBody: {
    gap: 10,
  },
  checkInStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  checkInTime: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  checkInCTAContainer: {
    marginTop: 4,
  },
  checkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  checkInBtn: {
    backgroundColor: COLORS.primary,
  },
  checkOutBtn: {
    backgroundColor: COLORS.danger,
  },
  checkBtnMuted: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.gray50,
  },
  disabled: {
    opacity: 0.7,
  },
  checkBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  checkBtnTextMuted: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkedOutPill: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedOutPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.success,
  },
  // checkInEmpty: {
  //   marginTop: 8,
  //   minHeight: 72,
  //   alignItems: 'flex-start',
  //   justifyContent: 'center',
  //   gap: 8,
  // },
  // checkInEmptyText: {
  //   fontSize: 13,
  //   color: COLORS.text,
  //   fontWeight: '600',
  // },

  chartCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 18,
    gap: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  chartArea: {
    height: 220,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  chartColumn: {
    flex: 1,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    height: '100%',
  },
  chartBars: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  chartBar: {
    flex: 1,
    maxWidth: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartBarPrimary: {
    backgroundColor: COLORS.primary,
  },
  chartBarSuccess: {
    backgroundColor: COLORS.success,
  },
  chartBarWarning: {
    backgroundColor: COLORS.warning,
  },
  chartLabel: {
    fontSize: 10,
    color: COLORS.text,
    width: '100%',
    textAlign: 'center',
  },
  chartFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    alignItems: 'flex-end',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkButtonPressed: {
    opacity: 0.8,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  bottomGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  section: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionActionPressed: {
    opacity: 0.75,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },

  cardList: {
    padding: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  cardRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardRowCopy: {
    flex: 1,
    gap: 4,
  },
  cardRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardRowSubtitle: {
    fontSize: 12,
    color: COLORS.text,
  },
  cardRowMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardRowDetail: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },

  timeline: {
    padding: 16,
    gap: 18,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  timelineBody: {
    flex: 1,
    gap: 4,
  },
  timelineTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  timelineTitleStrong: {
    fontWeight: '700',
  },
  timelineDetail: {
    fontSize: 12,
    color: COLORS.text,
  },

  footer: {
    paddingTop: 6,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  footerLink: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});

