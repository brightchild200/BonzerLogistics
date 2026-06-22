import type {
  NotificationLogRow,
  SalesAttendanceRow,
  SalesFollowupReminderRow,
  SalesFollowupRow,
  SalesPersonRow,
  UserRow,
} from '@/lib/schema';

export type {
  NotificationLogRow,
  SalesAttendanceRow,
  SalesFollowupReminderRow,
  SalesFollowupRow,
  SalesPersonRow,
  UserRow,
} from '@/lib/schema';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type StatusBadgeConfig = {
  label: string;
  color: string;
  bg: string;
  tone: BadgeTone;
};

export type SalesPersonCard = {
  id: number;
  name: string;
  subtitle: string;
  meta: string;
  statusLabel: string;
  statusTone: BadgeTone;
  initials: string;
};

export type SalesAttendanceCard = {
  id: number;
  title: string;
  subtitle: string;
  detail: string;
  statusLabel: string;
  statusTone: BadgeTone;
};

export type SalesFollowupCard = {
  id: number;
  title: string;
  subtitle: string;
  detail: string;
  statusLabel: string;
  statusTone: BadgeTone;
};

export type NotificationLogCard = {
  id: number;
  title: string;
  subtitle: string;
  detail: string;
  statusLabel: string;
  statusTone: BadgeTone;
};

export const COLORS = {
  primary: '#0f172a',
  primaryLight: '#e8f0fb',
  primaryDark: '#1a5499',
  success: '#2fb344',
  successLight: '#d1fae5',
  warning: '#f59f00',
  warningLight: '#fff8e1',
  danger: '#d63939',
  dangerLight: '#fee2e2',
  info: '#4299e1',
  infoLight: '#dbeafe',
  bg: '#f1f5f9',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  white: '#ffffff',
  dark: '#1e293b',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
};


