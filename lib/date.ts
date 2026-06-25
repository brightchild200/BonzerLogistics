const EN_IN = 'en-IN' as const;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function isValidDate(d: Date) {
  return !Number.isNaN(d.getTime());
}

/**
 * Generic time formatter: en-IN, 12-hour (AM/PM), hours numeric + minutes 2-digit.
 */
export function formatTime(date: string | Date) {
  const d = toDate(date);
  if (!isValidDate(d)) return '-';
  return d.toLocaleTimeString(EN_IN, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Attendance UI clock style: en-IN, 12-hour (AM/PM), 2-digit hour + 2-digit minutes.
 */
export function formatClockTime(date: string | Date) {
  const d = toDate(date);
  if (!isValidDate(d)) return '-';
  return d.toLocaleTimeString(EN_IN, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Date formatter: en-IN.
 */
export function formatDateEnIn(date: string | Date) {
  const d = toDate(date);
  if (!isValidDate(d)) return '-';
  return d.toLocaleDateString(EN_IN);
}

