/**
 * reportService.ts
 * Shared report-generation utilities for Enquiries and Visits.
 * Handles date filtering, metric computation, PDF HTML generation,
 * and Excel workbook building.
 */

import * as XLSX from 'xlsx';
import { Platform } from 'react-native';

// ─── Date helpers ─────────────────────────────────────────────────────────────

export type ReportRange = 'daily' | 'weekly' | 'monthly' | 'custom';

export function getDateRange(range: ReportRange, customStart?: string, customEnd?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'daily':
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    case 'weekly': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start, end: new Date(today.getTime() + 86400000 - 1) };
    }
    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start, end };
    }
    case 'custom': {
      const start = customStart ? new Date(customStart) : today;
      const end = customEnd
        ? new Date(new Date(customEnd).getTime() + 86400000 - 1)
        : new Date(today.getTime() + 86400000 - 1);
      return { start, end };
    }
  }
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function rangeLabel(range: ReportRange, start: Date, end: Date): string {
  if (range === 'daily') return `Daily — ${fmtDate(start.toISOString())}`;
  if (range === 'weekly')
    return `Weekly — ${fmtDate(start.toISOString())} to ${fmtDate(end.toISOString())}`;
  if (range === 'monthly')
    return `Monthly — ${start.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
  return `${fmtDate(start.toISOString())} to ${fmtDate(end.toISOString())}`;
}

// ─── Enquiry Report ───────────────────────────────────────────────────────────

export type EnquiryRow = {
  id: number;
  enquiry_no: string | null;
  enq_date: string | null;
  customer_name: string | null;
  shipper: string | null;
  cnee: string | null;
  pol: string | null;
  pod: string | null;
  commodity: string | null;
  packages: string | null;
  gross_weight: string | null;
  status: string | null;
  sales_person_id: number | null;
  mode_id: number | null;
  job_id: number | null;
  created_at: string;
  updated_at: string;
  mode_name?: string;
  salesperson_name?: string | null;
};

export type EnquiryReportData = {
  range: ReportRange;
  start: Date;
  end: Date;
  records: EnquiryRow[];
  // computed
  total: number;
  byStatus: Record<string, number>;
  byMode: Record<string, number>;
  bySalesperson: Record<string, { total: number; converted: number }>;
  dailyCounts: { date: string; count: number }[];
};

export function computeEnquiryReport(
  all: EnquiryRow[],
  range: ReportRange,
  customStart?: string,
  customEnd?: string,
): EnquiryReportData {
  const { start, end } = getDateRange(range, customStart, customEnd);

  const records = all.filter((r) => {
    const d = new Date(r.enq_date || r.created_at);
    return d >= start && d <= end;
  });

  const byStatus: Record<string, number> = {};
  const byMode: Record<string, number> = {};
  const bySalesperson: Record<string, { total: number; converted: number }> = {};
  const dailyMap: Record<string, number> = {};

  for (const r of records) {
    const status = r.status || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    const mode = r.mode_name || 'Unknown';
    byMode[mode] = (byMode[mode] || 0) + 1;

    const sp = r.salesperson_name || 'Unassigned';
    if (!bySalesperson[sp]) bySalesperson[sp] = { total: 0, converted: 0 };
    bySalesperson[sp].total++;
    if (['confirmed', 'completed', 'converted'].includes(status.toLowerCase())) {
      bySalesperson[sp].converted++;
    }

    const dateKey = fmtDate(r.enq_date || r.created_at);
    dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1;
  }

  const dailyCounts = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { range, start, end, records, total: records.length, byStatus, byMode, bySalesperson, dailyCounts };
}

export function exportEnquiryExcel(data: EnquiryReportData, periodLabel: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Summary
  const summaryRows = [
    ['Bonzer Logistics — Enquiry Report'],
    ['Period', periodLabel],
    ['Generated', fmtDate(new Date().toISOString())],
    [],
    ['SUMMARY'],
    ['Total Enquiries', data.total],
    [],
    ['STATUS BREAKDOWN'],
    ['Status', 'Count', 'Percentage'],
    ...Object.entries(data.byStatus).map(([s, c]) => [
      s,
      c,
      data.total ? `${((c / data.total) * 100).toFixed(1)}%` : '0%',
    ]),
    [],
    ['MODE BREAKDOWN'],
    ['Mode', 'Count'],
    ...Object.entries(data.byMode).map(([m, c]) => [m, c]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // Sheet 2 — Detailed Records
  const detailRows = data.records.map((r) => ({
    'Date': fmtDate(r.enq_date || r.created_at),
    'Enquiry No': r.enquiry_no || `ENQ-${r.id.toString().padStart(6, '0')}`,
    'Customer': r.customer_name || '',
    'Mode': r.mode_name || '',
    'POL': r.pol || '',
    'POD': r.pod || '',
    'Commodity': r.commodity || '',
    'Status': r.status || '',
    'Salesperson': r.salesperson_name || '',
    'Job ID': r.job_id ? `JOB-${r.job_id.toString().padStart(5, '0')}` : '',
    'Created': fmtDate(r.created_at),
  }));
  const ws2 = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Detailed Records');

  // Sheet 3 — Salesperson Performance
  const spRows = Object.entries(data.bySalesperson).map(([sp, d]) => ({
    Salesperson: sp,
    'Total Enquiries': d.total,
    Converted: d.converted,
    'Conversion %': d.total ? `${((d.converted / d.total) * 100).toFixed(1)}%` : '0%',
  }));
  const ws3 = XLSX.utils.json_to_sheet(spRows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Salesperson Performance');

  // Sheet 4 — Daily Trend
  const ws4 = XLSX.utils.json_to_sheet(data.dailyCounts.map((d) => ({ Date: d.date, Enquiries: d.count })));
  XLSX.utils.book_append_sheet(wb, ws4, 'Daily Trend');

  const today = new Date();
  const dd = today.getDate().toString().padStart(2, '0');
  const mm = (today.getMonth() + 1).toString().padStart(2, '0');
  XLSX.writeFile(wb, `EnquiryReport_${dd}-${mm}-${today.getFullYear()}.xlsx`);
}

export function generateEnquiryPdfHtml(data: EnquiryReportData, periodLabel: string): string {
  const statusRows = Object.entries(data.byStatus)
    .map(([s, c]) => `<tr><td>${s}</td><td>${c}</td><td>${data.total ? ((c / data.total) * 100).toFixed(1) : 0}%</td></tr>`)
    .join('');
  const modeRows = Object.entries(data.byMode)
    .map(([m, c]) => `<tr><td>${m}</td><td>${c}</td></tr>`)
    .join('');
  const spRows = Object.entries(data.bySalesperson)
    .map(([sp, d]) => `<tr><td>${sp}</td><td>${d.total}</td><td>${d.converted}</td><td>${d.total ? ((d.converted / d.total) * 100).toFixed(1) : 0}%</td></tr>`)
    .join('');
  const trendRows = data.dailyCounts
    .map((d) => `<tr><td>${d.date}</td><td>${d.count}</td></tr>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Bonzer Logistics — Enquiry Report</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
    h1 { font-size: 20px; color: #0f172a; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    h2 { font-size: 14px; color: #0f172a; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi { flex: 1; background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; }
    .kpi-val { font-size: 28px; font-weight: 800; color: #0f172a; }
    .kpi-label { font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; }
    .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; }
    @media print { body { padding: 16px; } }
    @page { margin: 20mm; }
  </style></head><body>
  <h1>Bonzer Logistics</h1>
  <div class="subtitle">Enquiry Report &nbsp;|&nbsp; ${periodLabel} &nbsp;|&nbsp; Generated: ${fmtDate(new Date().toISOString())}</div>

  <div class="kpi-row">
    <div class="kpi"><div class="kpi-val">${data.total}</div><div class="kpi-label">Total Enquiries</div></div>
    <div class="kpi"><div class="kpi-val">${data.byStatus['Confirmed'] || data.byStatus['Completed'] || 0}</div><div class="kpi-label">Confirmed</div></div>
    <div class="kpi"><div class="kpi-val">${data.byStatus['Pending'] || 0}</div><div class="kpi-label">Pending</div></div>
    <div class="kpi"><div class="kpi-val">${data.byStatus['Cancelled'] || 0}</div><div class="kpi-label">Cancelled</div></div>
  </div>

  <h2>Status Breakdown</h2>
  <table><thead><tr><th>Status</th><th>Count</th><th>Percentage</th></tr></thead><tbody>${statusRows}</tbody></table>

  <h2>Mode Breakdown</h2>
  <table><thead><tr><th>Mode</th><th>Count</th></tr></thead><tbody>${modeRows}</tbody></table>

  <h2>Salesperson Performance</h2>
  <table><thead><tr><th>Salesperson</th><th>Total</th><th>Converted</th><th>Conversion %</th></tr></thead><tbody>${spRows}</tbody></table>

  <h2>Daily Trend</h2>
  <table><thead><tr><th>Date</th><th>Enquiries</th></tr></thead><tbody>${trendRows}</tbody></table>

  <div class="footer">Bonzer Logistics &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; Page 1</div>
  <script>window.onload = function() { window.print(); }</script>
  </body></html>`;
}

// ─── Visit Report ─────────────────────────────────────────────────────────────

export type VisitRow = {
  id: number;
  customer_name?: string | null;
  visit_date?: string | null;
  status: string;
  created_at: string;
  salesperson_name?: string | null;
  next_followup_date?: string | null;
  contact_name?: string | null;
  location_address?: string | null;
  notes?: string | null;
};

export type VisitReportData = {
  range: ReportRange;
  start: Date;
  end: Date;
  records: VisitRow[];
  total: number;
  byStatus: Record<string, number>;
  bySalesperson: Record<string, { total: number; completed: number }>;
  uniqueCustomers: number;
  dailyCounts: { date: string; count: number }[];
};

export function computeVisitReport(
  all: VisitRow[],
  range: ReportRange,
  customStart?: string,
  customEnd?: string,
): VisitReportData {
  const { start, end } = getDateRange(range, customStart, customEnd);

  const records = all.filter((r) => {
    const d = new Date(r.visit_date || r.created_at);
    return d >= start && d <= end;
  });

  const byStatus: Record<string, number> = {};
  const bySalesperson: Record<string, { total: number; completed: number }> = {};
  const dailyMap: Record<string, number> = {};
  const customerSet = new Set<string>();

  for (const r of records) {
    const status = r.status || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    const sp = r.salesperson_name || 'Unassigned';
    if (!bySalesperson[sp]) bySalesperson[sp] = { total: 0, completed: 0 };
    bySalesperson[sp].total++;
    if (status.toLowerCase() === 'completed') bySalesperson[sp].completed++;

    if (r.customer_name) customerSet.add(r.customer_name);

    const dateKey = fmtDate(r.visit_date || r.created_at);
    dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1;
  }

  const dailyCounts = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    range, start, end, records,
    total: records.length,
    byStatus,
    bySalesperson,
    uniqueCustomers: customerSet.size,
    dailyCounts,
  };
}

export function exportVisitExcel(data: VisitReportData, periodLabel: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Summary
  const summaryRows = [
    ['Bonzer Logistics — Visit Report'],
    ['Period', periodLabel],
    ['Generated', fmtDate(new Date().toISOString())],
    [],
    ['SUMMARY'],
    ['Total Visits', data.total],
    ['Unique Customers', data.uniqueCustomers],
    [],
    ['STATUS BREAKDOWN'],
    ['Status', 'Count', 'Percentage'],
    ...Object.entries(data.byStatus).map(([s, c]) => [
      s, c, data.total ? `${((c / data.total) * 100).toFixed(1)}%` : '0%',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  // Sheet 2 — Detailed Records
  const detailRows = data.records.map((r) => ({
    Date: fmtDate(r.visit_date || r.created_at),
    Customer: r.customer_name || '',
    Status: r.status || '',
    'Contact Name': r.contact_name || '',
    Location: r.location_address || '',
    'Follow-up Date': fmtDate(r.next_followup_date),
    Salesperson: r.salesperson_name || '',
    Notes: r.notes || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Detailed Records');

  // Sheet 3 — Salesperson Performance
  const spRows = Object.entries(data.bySalesperson).map(([sp, d]) => ({
    Salesperson: sp,
    'Total Visits': d.total,
    'Completed': d.completed,
    'Completion %': d.total ? `${((d.completed / d.total) * 100).toFixed(1)}%` : '0%',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(spRows), 'Salesperson Performance');

  // Sheet 4 — Daily Trend
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(data.dailyCounts.map((d) => ({ Date: d.date, Visits: d.count }))),
    'Daily Trend',
  );

  const today = new Date();
  const dd = today.getDate().toString().padStart(2, '0');
  const mm = (today.getMonth() + 1).toString().padStart(2, '0');
  XLSX.writeFile(wb, `VisitReport_${dd}-${mm}-${today.getFullYear()}.xlsx`);
}

export function generateVisitPdfHtml(data: VisitReportData, periodLabel: string): string {
  const statusRows = Object.entries(data.byStatus)
    .map(([s, c]) => `<tr><td>${s}</td><td>${c}</td><td>${data.total ? ((c / data.total) * 100).toFixed(1) : 0}%</td></tr>`)
    .join('');
  const spRows = Object.entries(data.bySalesperson)
    .map(([sp, d]) => `<tr><td>${sp}</td><td>${d.total}</td><td>${d.completed}</td><td>${d.total ? ((d.completed / d.total) * 100).toFixed(1) : 0}%</td></tr>`)
    .join('');
  const trendRows = data.dailyCounts
    .map((d) => `<tr><td>${d.date}</td><td>${d.count}</td></tr>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Bonzer Logistics — Visit Report</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
    h1 { font-size: 20px; color: #0f172a; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    h2 { font-size: 14px; color: #0f172a; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi { flex: 1; background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; }
    .kpi-val { font-size: 28px; font-weight: 800; color: #0f172a; }
    .kpi-label { font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; }
    .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; }
    @media print { body { padding: 16px; } }
    @page { margin: 20mm; }
  </style></head><body>
  <h1>Bonzer Logistics</h1>
  <div class="subtitle">Visit Report &nbsp;|&nbsp; ${periodLabel} &nbsp;|&nbsp; Generated: ${fmtDate(new Date().toISOString())}</div>

  <div class="kpi-row">
    <div class="kpi"><div class="kpi-val">${data.total}</div><div class="kpi-label">Total Visits</div></div>
    <div class="kpi"><div class="kpi-val">${data.byStatus['completed'] || data.byStatus['Completed'] || 0}</div><div class="kpi-label">Completed</div></div>
    <div class="kpi"><div class="kpi-val">${data.uniqueCustomers}</div><div class="kpi-label">Unique Customers</div></div>
    <div class="kpi"><div class="kpi-val">${data.byStatus['cancelled'] || data.byStatus['Cancelled'] || 0}</div><div class="kpi-label">Cancelled</div></div>
  </div>

  <h2>Status Breakdown</h2>
  <table><thead><tr><th>Status</th><th>Count</th><th>Percentage</th></tr></thead><tbody>${statusRows}</tbody></table>

  <h2>Salesperson Performance</h2>
  <table><thead><tr><th>Salesperson</th><th>Total</th><th>Completed</th><th>Completion %</th></tr></thead><tbody>${spRows}</tbody></table>

  <h2>Daily Trend</h2>
  <table><thead><tr><th>Date</th><th>Visits</th></tr></thead><tbody>${trendRows}</tbody></table>

  <div class="footer">Bonzer Logistics &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; Page 1</div>
  <script>window.onload = function() { window.print(); }</script>
  </body></html>`;
}

export function openPdfInBrowser(html: string) {
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }
}
