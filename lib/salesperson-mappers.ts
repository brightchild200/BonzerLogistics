import type {
  NotificationLogCard,
  SalesAttendanceCard,
  SalesFollowupCard,
  SalesPersonCard,
  StatusBadgeConfig,
} from '@/lib/types';
import { COLORS } from '@/lib/types';
import type { NotificationLogRow, SalesAttendanceRow, SalesFollowupRow, SalesPersonRow, UserRow } from '@/lib/schema';

function formatDateTime(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }).format(parsed);
}

export function toTitleCase(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function initialsFromName(value: string | null | undefined) {
  const source = value?.trim();
  if (!source) return 'SP';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'SP';
}

export function getStatusPresentation(status: string | null | undefined): StatusBadgeConfig {
  const normalized = (status || 'unknown').trim().toLowerCase();

  if (['active', 'approved', 'completed', 'complete', 'done', 'sent', 'success', 'checked_out'].includes(normalized)) {
    return { label: toTitleCase(normalized), color: COLORS.success, bg: COLORS.successLight, tone: 'success' };
  }

  if (['pending', 'scheduled', 'in_progress', 'partial', 'checked_in', 'draft'].includes(normalized)) {
    return { label: toTitleCase(normalized), color: COLORS.warning, bg: COLORS.warningLight, tone: 'warning' };
  }

  if (['failed', 'error', 'rejected', 'cancelled', 'canceled', 'inactive', 'overdue'].includes(normalized)) {
    return { label: toTitleCase(normalized), color: COLORS.danger, bg: COLORS.dangerLight, tone: 'danger' };
  }

  if (['processed', 'queued', 'notified', 'info'].includes(normalized)) {
    return { label: toTitleCase(normalized), color: COLORS.info, bg: COLORS.infoLight, tone: 'info' };
  }

  return { label: toTitleCase(normalized), color: COLORS.textMuted, bg: COLORS.gray100, tone: 'neutral' };
}

export function mapSalesPerson(row: SalesPersonRow): SalesPersonCard {
  const status = row.is_active === false ? 'inactive' : 'active';
  return {
    id: row.id,
    name: row.name,
    subtitle: [row.designation, row.department].filter(Boolean).join(' • ') || row.email,
    meta: [row.mobile, row.email].filter(Boolean).join(' • '),
    statusLabel: getStatusPresentation(status).label,
    statusTone: getStatusPresentation(status).tone,
    initials: initialsFromName(row.name),
  };
}

export function mapSalesAttendance(row: SalesAttendanceRow): SalesAttendanceCard {
  const statusSource = row.status || row.approval_status || (row.check_out_at ? 'checked_out' : row.check_in_at ? 'checked_in' : 'pending');
  const presentation = getStatusPresentation(statusSource);
  const title = row.site_name || `Attendance #${row.id}`;
  const subtitle = row.site_address || row.visit_purpose || 'Location not captured';
  const detail = [
    row.check_in_at ? `In ${formatDateTime(row.check_in_at, { hour: '2-digit', minute: '2-digit' })}` : 'Not checked in',
    row.check_out_at ? `Out ${formatDateTime(row.check_out_at, { hour: '2-digit', minute: '2-digit' })}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return {
    id: row.id,
    title,
    subtitle,
    detail,
    statusLabel: presentation.label,
    statusTone: presentation.tone,
  };
}

export function mapSalesFollowup(row: SalesFollowupRow): SalesFollowupCard {
  const presentation = getStatusPresentation(row.status);
  const subtitle = [row.location_name, row.customer_id ? `Customer #${row.customer_id}` : null, row.job_id ? `Job #${row.job_id}` : null]
    .filter(Boolean)
    .join(' • ');

  return {
    id: row.id,
    title: row.title,
    subtitle: subtitle || row.notes || 'Follow-up scheduled',
    detail: formatDateTime(row.followup_at),
    statusLabel: presentation.label,
    statusTone: presentation.tone,
  };
}

export function mapNotificationLog(row: NotificationLogRow): NotificationLogCard {
  const presentation = getStatusPresentation(row.status);
  const title = `${toTitleCase(row.channel)} message`;
  const subtitle = [row.recipient_phone, row.provider || 'No provider'].filter(Boolean).join(' • ');
  const detail = row.sent_at ? `Sent ${formatDateTime(row.sent_at)}` : `Created ${formatDateTime(row.created_at)}`;

  return {
    id: row.id,
    title,
    subtitle: subtitle || row.message.slice(0, 80),
    detail,
    statusLabel: presentation.label,
    statusTone: presentation.tone,
  };
}

export function mapUserDisplayName(user: UserRow | null | undefined, salesperson?: SalesPersonRow | null) {
  return salesperson?.name || user?.full_name || user?.username || 'Salesperson';
}
