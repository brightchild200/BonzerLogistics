import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  MapPinned,
  Megaphone,
  ShieldCheck,
  Users,
  X,
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
import {
  getStatusPresentation,
  mapNotificationLog,
  mapSalesAttendance,
  mapSalesFollowup,
  mapSalesPerson,
  mapUserDisplayName,
} from '@/lib/salesperson-mappers';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

type DashboardMetrics = {
  totalFollowups: number;
  pendingFollowups: number;
  attendanceThisWeek: number;
  enquiriesThisMonth: number;
  checkedInToday: boolean;
  visitsThisMonth: number;
};

const COMPLETED_STATUSES = ['completed', 'complete', 'done', 'closed'];

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

function isClosedFollowup(status: string | null | undefined) {
  return COMPLETED_STATUSES.includes((status || '').trim().toLowerCase());
}

function dateKey(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function formatClock(value: string | null | undefined) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function formatLocation(row: SalesAttendanceRow | null) {
  if (!row) return 'Location not captured';
  return row.site_name || row.site_address || 'Location not captured';
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
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: `${accent}18` }]}>{icon}</View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{title}</Text>
        <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
        {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function MonthTargetCard({
  visits,
  enquiries,
  jobs,
}: {
  visits: number;
  enquiries: number;
  jobs: number;
}) {
  const rows = [
    { label: 'Visits', value: visits, color: COLORS.primary },
    { label: 'Enquiries', value: enquiries, color: COLORS.warning },
    { label: 'Jobs', value: jobs, color: COLORS.success },
  ];
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  return (
    <View style={styles.monthCard}>
      <View style={styles.monthCardHeader}>
        <View>
          <Text style={styles.monthCardTitle}>Month Target</Text>
          <Text style={styles.monthCardSubtitle}>Visits, enquiries, and jobs this month</Text>
        </View>
        <View style={styles.monthCardChip}>
          <CalendarClock size={14} color={COLORS.primary} />
          <Text style={styles.monthCardChipText}>This month</Text>
        </View>
      </View>

      <View style={styles.monthCardRows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.monthCardRow}>
            <View style={styles.monthCardRowHead}>
              <Text style={styles.monthCardRowLabel}>{row.label}</Text>
              <Text style={styles.monthCardRowValue}>{row.value}</Text>
            </View>
            <View style={styles.monthCardTrack}>
              <View
                style={[
                  styles.monthCardFill,
                  { width: `${Math.max(10, Math.round((row.value / maxValue) * 100))}%`, backgroundColor: row.color },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CheckInTile({
  attendance,
  attendanceRow,
  checkedInToday,
}: {
  attendance: SalesAttendanceCard | null;
  attendanceRow: SalesAttendanceRow | null;
  checkedInToday: boolean;
}) {
  const statusTone = attendance?.statusTone ?? 'warning';
  const statusColor = toneColor(statusTone);
  const checkInTime = formatClock(attendanceRow?.check_in_at);
  const location = formatLocation(attendanceRow);

  return (
    <View style={styles.checkInCard}>
      <View style={styles.checkInHeader}>
        <Text style={styles.metricLabel}>Checked In</Text>
        <View style={styles.checkInBadge}>
          <View style={[styles.checkInDot, { backgroundColor: checkedInToday ? COLORS.success : COLORS.warning }]} />
          <Text style={[styles.checkInBadgeText, { color: checkedInToday ? COLORS.success : COLORS.warning }]}>
            {checkedInToday ? 'Today' : 'Awaiting'}
          </Text>
        </View>
      </View>

      {attendance ? (
        <View style={styles.checkInBody}>
          <View style={styles.checkInStatusRow}>
            <Text style={styles.checkInTime}>{checkInTime}</Text>
            <StatusBadge status={attendance.statusLabel} />
          </View>
          <View style={styles.checkInLocationRow}>
            <MapPinned size={16} color={statusColor} />
            <Text style={styles.checkInLocationText} numberOfLines={1}>
              {location}
            </Text>
          </View>
          <Text style={styles.checkInSubtitle} numberOfLines={2}>
            {attendanceRow?.site_address || attendance.subtitle}
          </Text>
        </View>
      ) : (
        <View style={styles.checkInEmpty}>
          <ShieldCheck size={22} color={COLORS.textLight} />
          <Text style={styles.checkInEmptyText}>No attendance record today</Text>
        </View>
      )}
    </View>
  );
}

function ChartSection({
  series,
}: {
  series: Array<{
    key: string;
    label: string;
    visits: number;
    jobs: number;
    enquiries: number;
  }>;
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
    </View>
  );
}

function ActivityItem({
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
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.warn('[dashboard] auth lookup failed:', authErr);
      }

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
        supabase.from('sales_followups').select('*').eq('sales_person_id', salespersonRow.id).order('followup_at', { ascending: true }),
        supabase.from('sales_attendance').select('*').eq('sales_person_id', salespersonRow.id).order('attendance_date', { ascending: false }),
        supabase.from('notification_logs').select('*').eq('sales_person_id', salespersonRow.id).order('created_at', { ascending: false }).limit(8),
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

      if (followupsRes.error) console.error('[dashboard] sales_followups error:', followupsRes.error);
      if (attendanceRes.error) console.error('[dashboard] sales_attendance error:', attendanceRes.error);
      if (notificationsRes.error) console.error('[dashboard] notification_logs error:', notificationsRes.error);
      if (enquiriesRes.error) console.error('[dashboard] enquiries error:', enquiriesRes.error);
      if (jobsRes.error) console.error('[dashboard] jobs error:', jobsRes.error);

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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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

  const upcomingFollowups = useMemo(() => followups.slice(0, 3).map(mapSalesFollowup), [followups]);
  const recentNotifications = useMemo(() => notificationRows.slice(0, 3).map(mapNotificationLog), [notificationRows]);

  const monthTarget = useMemo(() => ({
    visits: metrics.visitsThisMonth,
    enquiries: metrics.enquiriesThisMonth,
    jobs: jobRows.length,
  }), [jobRows.length, metrics.enquiriesThisMonth, metrics.visitsThisMonth]);

  const statusEntries = useMemo(() => {
    const breakdown = followups.reduce<Record<string, { label: string; count: number; tone: string }>>((acc, row) => {
      const config = getStatusPresentation(row.status);
      if (!acc[config.label]) {
        acc[config.label] = {
          label: config.label,
          count: 0,
          tone: config.tone,
        };
      }
      acc[config.label].count += 1;
      return acc;
    }, {});

    return Object.values(breakdown).sort((a, b) => b.count - a.count);
  }, [followups]);

  const highestStatusCount = Math.max(1, ...statusEntries.map((entry) => entry.count));

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

  const activityItems = useMemo(() => {
    const items: Array<{
      key: string;
      icon: React.ReactNode;
      title: string;
      subtitle: string;
      detail: string;
      accent: string;
    }> = [];

    if (todayAttendance) {
      items.push({
        key: `attendance-${todayAttendance.id}`,
        icon: <CheckCircle2 size={14} color={COLORS.white} />,
        title: 'Checked in',
        subtitle: todayAttendance.title,
        detail: todayAttendance.detail || 'Today',
        accent: COLORS.success,
      });
    }

    if (recentNotifications[0]) {
      const notification = recentNotifications[0];
      items.push({
        key: `notification-${notification.id}`,
        icon: <Bell size={14} color={COLORS.white} />,
        title: notification.title,
        subtitle: notification.subtitle,
        detail: notification.detail,
        accent: COLORS.info,
      });
    }

    if (upcomingFollowups[0]) {
      const followup = upcomingFollowups[0];
      items.push({
        key: `followup-${followup.id}`,
        icon: <CalendarClock size={14} color={COLORS.white} />,
        title: followup.title,
        subtitle: followup.subtitle,
        detail: followup.detail,
        accent: COLORS.warning,
      });
    }

    return items.slice(0, 3);
  }, [recentNotifications, todayAttendance, upcomingFollowups]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.page}>
          {showAnnouncement ? (
            <View style={styles.announcementBar}>
              <View style={styles.announcementCopy}>
                <Megaphone size={18} color={COLORS.white} />
                <Text style={styles.announcementText}>
                  Sales sync is live: follow-ups, attendance, and notification logs refresh on pull.
                </Text>
              </View>
              <Pressable onPress={() => setShowAnnouncement(false)} style={styles.announcementClose}>
                <X size={16} color={COLORS.white} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderCopy}>
              <Text style={styles.pageTitle}>{displayName}</Text>
              <Text style={styles.pageSubtitle}>Here&apos;s your performance for today.</Text>
            </View>

            <View style={styles.headerActions}>
              <MonthTargetCard
                visits={monthTarget.visits}
                enquiries={monthTarget.enquiries}
                jobs={monthTarget.jobs}
              />
              <View style={styles.headerButtonStack}>
                <Pressable
                  onPress={() => {
                    router.push('/(tabs)/attendance');
                  }}
                  style={({ pressed }) => [styles.headerButton, styles.headerButtonSecondary, pressed && styles.headerButtonPressed]}
                >
                  <CalendarClock size={16} color={COLORS.textMuted} />
                  <Text style={styles.headerButtonSecondaryText}>This Week</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    router.push('/(tabs)/followups');
                  }}
                  style={({ pressed }) => [styles.headerButton, styles.headerButtonPrimary, pressed && styles.headerButtonPressed]}
                >
                  <Download size={16} color={COLORS.white} />
                  <Text style={styles.headerButtonPrimaryText}>Export Report</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metricScroll}
          >
            <MetricTile
              title="Follow-Ups"
              value={metrics.totalFollowups}
              subtitle={`${metrics.pendingFollowups} open`}
              accent={COLORS.primary}
              icon={<CalendarClock size={22} color={COLORS.primary} />}
            />
            <MetricTile
              title="Visits"
              value={metrics.visitsThisMonth}
              subtitle="this month"
              accent={COLORS.warning}
              icon={<MapPinned size={22} color={COLORS.warning} />}
            />
            <MetricTile
              title="Enquiries"
              value={metrics.enquiriesThisMonth}
              subtitle="this month"
              accent={COLORS.success}
              icon={<FileText size={22} color={COLORS.success} />}
            />
            <CheckInTile attendance={todayAttendance} attendanceRow={todayAttendanceRow} checkedInToday={metrics.checkedInToday} />
          </ScrollView>

          <ChartSection series={weeklySeries} />

          <View style={styles.bottomGrid}>
            <DashboardSection
              title="Upcoming Follow-ups"
              subtitle="Ordered by scheduled time from sales_followups."
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
              title="Recent Activity"
              subtitle="A live feed stitched from attendance and notifications."
              actionLabel="View All"
              onAction={() => router.push('/(tabs)/attendance')}
            >
              {activityItems.length === 0 ? (
                <EmptyState
                  icon={<Users size={28} color={COLORS.textLight} />}
                  title="No activity yet"
                  subtitle="New attendance or notification entries will appear here."
                />
              ) : (
                <View style={styles.timeline}>
                  {activityItems.map((item) => (
                    <ActivityItem
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

            <DashboardSection title="Lead Status Distribution" subtitle="A quick distribution of the current working set.">
              {statusEntries.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck size={28} color={COLORS.textLight} />}
                  title="No status data"
                  subtitle="Status buckets will appear once follow-ups are loaded."
                />
              ) : (
                <View style={styles.breakdownStack}>
                  {statusEntries.map((entry) => (
                    <View key={entry.label} style={styles.breakdownItem}>
                      <View style={styles.breakdownHead}>
                        <Text style={styles.breakdownLabel}>{entry.label}</Text>
                        <Text style={styles.breakdownValue}>{entry.count}</Text>
                      </View>
                      <View style={styles.breakdownTrack}>
                        <View
                          style={[
                            styles.breakdownFill,
                            {
                              width: `${Math.max(8, Math.round((entry.count / highestStatusCount) * 100))}%`,
                              backgroundColor: toneColor(entry.tone),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </DashboardSection>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {lastSyncedAt ? `Last synced ${formatClock(lastSyncedAt)}` : 'Waiting for data sync'}
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
  announcementClose: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerButtonStack: {
    flexDirection: 'column',
    gap: 10,
  },
  monthCard: {
    width: 420,
    minWidth: 420,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  monthCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  monthCardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.text,
  },
  monthCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primaryLight,
  },
  monthCardChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  monthCardRows: {
    flexDirection: 'row',
    gap: 10,
  },
  monthCardRow: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  monthCardRowHead: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  monthCardRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  monthCardRowValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  monthCardTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
    overflow: 'hidden',
  },
  monthCardFill: {
    height: '100%',
    borderRadius: 999,
  },
  headerButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  headerButtonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  headerButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  headerButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  headerButtonPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metricScroll: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingRight: 2,
  },
  metricCard: {
    width: 250,
    minWidth: 250,
    flexGrow: 0,
    flexShrink: 0,
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
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 240,
    backgroundColor: '#f0edda',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 18,
    gap: 12,
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
  checkInDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
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
  checkInLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInLocationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  checkInSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.text,
  },
  checkInEmpty: {
    minHeight: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
  },
  checkInEmptyText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
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
  breakdownStack: {
    gap: 14,
    padding: 16,
  },
  breakdownItem: {
    gap: 8,
  },
  breakdownHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  breakdownTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 999,
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
