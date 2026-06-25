import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as XLSX from 'xlsx';
import {
  Search,
  Plus,
  Filter,
  Download,
  Printer,
  XCircle,
  Package,
  X,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { hasRole } from '@/lib/permissions';
import { StatusBadge } from '@/components/Badge';

// Mode mapping (from mode_master table)
const MODE_MAP: Record<number, string> = {
  1: 'Sea Export',
  2: 'Sea Import',
  3: 'Air Export',
  4: 'Air Import',
};

// Status options for filter
const STATUS_OPTIONS = ['All', 'Pending', 'Confirmed', 'Cancelled', 'Completed'];
// Mode options for filter
const MODE_OPTIONS = ['All', 'Sea Export', 'Sea Import', 'Air Export', 'Air Import'];

// ─── Types ────────────────────────────────────────────────────────────────────

type EnquiryRow = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAG = '[EnquiriesScreen]';


// ─── Date Utilities ───────────────────────────────────────────────────────────

/** Format any date string/ISO to DD/MM/YYYY for display. Returns '-' if invalid. */
function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function dbg(event: string, payload?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`${TAG} ${event}`, payload ?? '');
  }
}

function err(event: string, payload?: unknown) {
  console.error(`${TAG} ${event}`, payload ?? '');
}

// ─── ERP-style Row: single-click selects, double-click opens ─────────────────

type EnquiryRowProps = {
  enquiry: EnquiryRow;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
};

function EnquiryRow({ enquiry, selected, onSelect, onOpen }: EnquiryRowProps) {
  const lastTap = React.useRef<number>(0);
  const [hovered, setHovered] = React.useState(false);

  function handlePress() {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      // Double-click / double-tap → open
      onOpen();
    } else {
      // Single click → select
      onSelect();
    }
    lastTap.current = now;
  }

  const rowStyle = [
    styles.tableRow,
    hovered && !selected && styles.tableRowHovered,
    selected && styles.tableRowSelected,
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      {...(Platform.OS === 'web' ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        style: [...rowStyle, { cursor: 'pointer' } as any],
      } : { style: rowStyle })}
    >
      <Text style={[styles.tableCell, styles.colDate, selected && styles.tableCellSelected]}>
        {formatDate(enquiry.enq_date)}
      </Text>
      <Text style={[styles.tableCell, styles.colEnqNo, selected && styles.tableCellSelected]}>
        {enquiry.enquiry_no || `ENQ-${enquiry.id.toString().padStart(6, '0')}`}
      </Text>
      <Text style={[styles.tableCell, styles.colCustomer, selected && styles.tableCellSelected]} numberOfLines={1}>
        {enquiry.customer_name || 'Unknown'}
      </Text>
      <Text style={[styles.tableCell, styles.colSalesperson, selected && styles.tableCellSelected]} numberOfLines={1}>
        {enquiry.salesperson_name || 'Unassigned'}
      </Text>
      <Text style={[styles.tableCell, styles.colMode, selected && styles.tableCellSelected]}>
        {enquiry.mode_name || 'N/A'}
      </Text>
      <View style={styles.colStatus}>
        <StatusBadge status={enquiry.status || 'Pending'} />
      </View>
      <Text style={[styles.tableCell, styles.colJobId, selected && styles.tableCellSelected]}>
        {enquiry.job_id ? `JOB-${enquiry.job_id.toString().padStart(5, '0')}` : '-'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EnquiriesScreen() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [sessionError, setSessionError] = useState('');

  // Filter states
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMode, setFilterMode] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Filter modal visibility
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    dbg('loadData → start');
    setError('');

    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        err('loadData → supabase.auth.getUser() failed', authErr);
        setSessionError('Authentication error. Please sign in again.');
        return;
      }

      const session = await resolveSalespersonSession(auth.user?.email ?? null);
      dbg('loadData → resolveSalespersonSession()', {
        hasSalesperson: !!session.salesperson,
        hasAppUser: !!session.appUser,
      });

      if (!session.salesperson && !hasRole(session.roles, 'admin')) {
        setSessionError('No salesperson profile is linked to this account yet.');
        setEnquiries([]);
        return;
      }

      setSessionError('');
      const canSeeTeamData = hasRole(session.roles, 'admin') || hasRole(session.roles, 'sales_manager');

      // Build query
      let query = supabase.from('enquiries').select('*');

      // For non-admin users, filter by sales_person_id
      if (!canSeeTeamData) {
        query = query.eq('sales_person_id', session.salesperson?.id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        err('loadData → query failed', fetchError);
        setError(`Failed to load enquiries: ${fetchError.message}`);
        return;
      }

      const salespersonIds = Array.from(new Set((data || []).map((row) => row.sales_person_id).filter((id): id is number => typeof id === 'number')));
      let salespersonMap: Record<number, string> = {};
      if (salespersonIds.length > 0) {
        const { data: salespersonRows } = await supabase
          .from('sales_persons')
          .select('id, name')
          .in('id', salespersonIds);
        salespersonMap = Object.fromEntries((salespersonRows || []).map((row) => [row.id, row.name]));
      }

      // Map mode_id to mode_name
      const enquiriesWithMode = (data || []).map(enq => ({
        ...enq,
        mode_name: enq.mode_id ? MODE_MAP[enq.mode_id] || 'Unknown' : 'N/A',
        salesperson_name: enq.sales_person_id ? (salespersonMap[enq.sales_person_id] || null) : null,
      }));

      setEnquiries(enquiriesWithMode);
      dbg('loadData → complete', { count: data?.length ?? 0 });
    } catch (e: unknown) {
      err('loadData → unexpected exception', e);
      setError('Failed to load enquiries. Please pull down to refresh.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply search + filters to enquiries (all client-side)
  const filteredEnquiries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return enquiries.filter(enquiry => {
      // Search across all text fields
      if (q) {
        const haystack = [
          enquiry.enquiry_no,
          enquiry.customer_name,
          enquiry.shipper,
          enquiry.cnee,
          enquiry.pol,
          enquiry.pod,
          enquiry.commodity,
          enquiry.packages,
          enquiry.gross_weight,
          enquiry.status,
          enquiry.mode_name,
          enquiry.salesperson_name,
          enquiry.job_id ? `JOB-${enquiry.job_id.toString().padStart(5, '0')}` : '',
          formatDate(enquiry.enq_date),
          formatDate(enquiry.created_at),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Customer name filter (from advanced filters panel)
      if (filterCustomer && !enquiry.customer_name?.toLowerCase().includes(filterCustomer.toLowerCase())) {
        return false;
      }
      // Date filter
      if (filterDate) {
        const enqDate = enquiry.enq_date ? new Date(enquiry.enq_date).toISOString().split('T')[0] : '';
        if (enqDate !== filterDate) return false;
      }
      // Mode filter
      if (filterMode !== 'All') {
        if (enquiry.mode_name !== filterMode) return false;
      }
      // Status filter
      if (filterStatus !== 'All') {
        if (enquiry.status !== filterStatus) return false;
      }
      return true;
    });
  }, [enquiries, searchQuery, filterCustomer, filterDate, filterMode, filterStatus]);

  // ── Refresh ───────────────────────────────────────────────────────────────

  async function onRefresh() {
    dbg('onRefresh → start');
    setRefreshing(true);
    try {
      await loadData();
      dbg('onRefresh → complete');
    } catch (e: unknown) {
      err('onRefresh → loadData threw during pull-to-refresh', e);
      setError('Refresh failed. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleCreateEnquiry() {
    router.push('/enquiry/enquiry');
  }

  function handleViewEnquiry(id: number) {
    router.push(`/enquiry/enquiry/${id}`);
  }


  function handleExportExcel() {
    if (filteredEnquiries.length === 0) {
      alert('No enquiries to export.');
      return;
    }

    const rows = filteredEnquiries.map(enq => ({
      'Date': formatDate(enq.enq_date),
      'Enquiry No': enq.enquiry_no || `ENQ-${enq.id.toString().padStart(6, '0')}`,
      'Customer Name': enq.customer_name || '',
      'Salesperson': enq.salesperson_name || '',
      'Shipper': enq.shipper || '',
      'Consignee': enq.cnee || '',
      'POL': enq.pol || '',
      'POD': enq.pod || '',
      'Mode': enq.mode_name || '',
      'Commodity': enq.commodity || '',
      'Packages': enq.packages || '',
      'Gross Weight': enq.gross_weight || '',
      'Status': enq.status || '',
      'Job ID': enq.job_id ? `JOB-${enq.job_id.toString().padStart(5, '0')}` : '',
      'Created At': formatDate(enq.created_at),
      'Updated At': formatDate(enq.updated_at),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');

    const today = new Date();
    const dd = today.getDate().toString().padStart(2, '0');
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = today.getFullYear();
    const filename = `Enquiries_${dd}-${mm}-${yyyy}.xlsx`;

    XLSX.writeFile(wb, filename);
  }

  function handlePrintAll() {
    if (filteredEnquiries.length === 0) {
      Alert.alert('Nothing to Print', 'No enquiries are currently visible.');
      return;
    }

    if (Platform.OS === 'web') {
      const today = new Date().toLocaleDateString('en-GB');
      const rows = filteredEnquiries.map((enq, i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
          <td>${formatDate(enq.enq_date)}</td>
          <td>${enq.enquiry_no || `ENQ-${enq.id.toString().padStart(6, '0')}`}</td>
          <td>${enq.customer_name || '-'}</td>
          <td>${enq.mode_name || '-'}</td>
          <td>${enq.pol || '-'} → ${enq.pod || '-'}</td>
          <td>${enq.commodity || '-'}</td>
          <td>${enq.status || '-'}</td>
          <td>${enq.job_id ? `JOB-${enq.job_id.toString().padStart(5, '0')}` : '-'}</td>
        </tr>`
      ).join('');

      const html = `<html><head><title>Enquiries – ${today}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
          h2 { font-size: 16px; margin-bottom: 4px; }
          p { margin: 0 0 12px; color: #64748b; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #0f172a; color: #fff; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
          td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; }
          @media print { body { padding: 0; } }
        </style></head>
        <body>
          <h2>Enquiries Report</h2>
          <p>Printed: ${today} &nbsp;|&nbsp; ${filteredEnquiries.length} record(s)</p>
          <table>
            <thead><tr>
              <th>Date</th><th>Enquiry No</th><th>Customer</th>
              <th>Mode</th><th>Route</th><th>Commodity</th>
              <th>Status</th><th>Job ID</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body></html>`;

      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    } else {
      Alert.alert('Print', `${filteredEnquiries.length} enquiry(s) ready to print. Use the web version for full print support.`);
    }
  }

  async function handleCancelEnquiry(enquiry: EnquiryRow) {
    if (enquiry.status === 'Cancelled') {
      Alert.alert('Already Cancelled', 'This enquiry is already cancelled.');
      return;
    }

    Alert.prompt(
      'Cancel Enquiry',
      'Please enter a reason for cancellation:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async (remark?: string) => {
            try {
              const { error: updateError } = await supabase
                .from('enquiries')
                .update({
                  status: 'Cancelled',
                  cancel_remark: remark || 'Cancelled by user',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', enquiry.id);

              if (updateError) {
                Alert.alert('Error', 'Failed to cancel enquiry: ' + updateError.message);
                return;
              }

              // Refresh data
              loadData();
              Alert.alert('Success', 'Enquiry cancelled successfully.');
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel enquiry.');
            }
          },
        },
      ],
      'plain-text'
    );
  }

  function clearFilters() {
    setFilterCustomer('');
    setFilterDate('');
    setFilterMode('All');
    setFilterStatus('All');
  }

  function hasActiveFilters() {
    return filterCustomer !== '' || filterDate !== '' || filterMode !== 'All' || filterStatus !== 'All';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.pageTitle}>Enquiries</Text>
          <Text style={styles.pageSubtitle}>Manage customer shipment enquiries</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleCreateEnquiry}
        >
          <Plus size={18} color={COLORS.white} />
          <Text style={styles.primaryBtnText}>New Enquiry</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, enquiry no, mode, status, date..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={showFilters ? COLORS.white : COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      {showFilters && (
        <View style={styles.filtersSection}>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Customer</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Customer name"
                value={filterCustomer}
                onChangeText={setFilterCustomer}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Date</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="YYYY-MM-DD"
                value={filterDate}
                onChangeText={setFilterDate}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Mode</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {MODE_OPTIONS.map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.chip, filterMode === mode && styles.chipActive]}
                      onPress={() => setFilterMode(mode)}
                    >
                      <Text style={[styles.chipText, filterMode === mode && styles.chipTextActive]}>
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {STATUS_OPTIONS.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.chip, filterStatus === status && styles.chipActive]}
                      onPress={() => setFilterStatus(status)}
                    >
                      <Text style={[styles.chipText, filterStatus === status && styles.chipTextActive]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          {hasActiveFilters() && (
            <TouchableOpacity style={styles.clearFilterBtn} onPress={clearFilters}>
              <X size={14} color={COLORS.danger} />
              <Text style={styles.clearFilterText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportExcel}>
          <Download size={15} color={COLORS.white} />
          <Text style={styles.exportBtnText}>Export Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.printBtn} onPress={handlePrintAll}>
          <Printer size={15} color={COLORS.text} />
          <Text style={styles.printBtnText}>Print</Text>
        </TouchableOpacity>
      </View>

      {/* Session error */}
      {sessionError ? (
        <View style={styles.errorBox}>
          <XCircle size={14} color={COLORS.danger} />
          <Text style={styles.errorText}>{sessionError}</Text>
        </View>
      ) : null}

      {/* Runtime error */}
      {error ? (
        <View style={styles.errorBox}>
          <XCircle size={14} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* Enquiries List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {filteredEnquiries.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No enquiries found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || hasActiveFilters()
                ? 'No matching enquiries found'
                : 'Create your first enquiry to get started'}
            </Text>
            {!searchQuery && !hasActiveFilters() && (
              <TouchableOpacity style={styles.emptyBtn} onPress={handleCreateEnquiry}>
                <Plus size={16} color={COLORS.white} />
                <Text style={styles.emptyBtnText}>Create Enquiry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {/* Helper hint */}
            <View style={styles.tableHint}>
              <Text style={styles.tableHintText}>Single-click to select  •  Double-click to open enquiry</Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
              <Text style={[styles.tableHeaderCell, styles.colEnqNo]}>Enquiry No.</Text>
              <Text style={[styles.tableHeaderCell, styles.colCustomer]}>Customer</Text>
              <Text style={[styles.tableHeaderCell, styles.colSalesperson]}>Salesperson</Text>
              <Text style={[styles.tableHeaderCell, styles.colMode]}>Mode</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
              <Text style={[styles.tableHeaderCell, styles.colJobId]}>Job ID</Text>
            </View>

            {/* Table Body */}
            {filteredEnquiries.map((enquiry) => (
              <EnquiryRow
                key={enquiry.id}
                enquiry={enquiry}
                selected={selectedId === enquiry.id}
                onSelect={() => setSelectedId(enquiry.id)}
                onOpen={() => handleViewEnquiry(enquiry.id)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  pageSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Filter section styles
  filtersSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    gap: 4,
  },
  filterField: {
    gap: 4,
  },
  filterLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.gray50,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearFilterText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },

  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  printBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  errorBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 6,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  errorText: { fontSize: 13, color: COLORS.danger, flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  scroll: { flex: 1 },
  content: { paddingBottom: 24 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  listContainer: {
    gap: 12,
    paddingHorizontal: 16,
  },

  // Table styles
  tableContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray50,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: COLORS.text,
  },
  colDate: { width: 70, flexShrink: 0 },
  colEnqNo: { width: 90, flexShrink: 0 },
  colCustomer: { flex: 1, minWidth: 100 },
  colSalesperson: { width: 120, flexShrink: 0 },
  colMode: { width: 80, flexShrink: 0 },
  colStatus: { width: 80, flexShrink: 0 },
  colJobId: { width: 70, flexShrink: 0 },

  tableRowHovered: {
    backgroundColor: COLORS.gray50,
  },
  tableRowSelected: {
    backgroundColor: COLORS.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tableCellSelected: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },

  tableHint: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.gray50,
  },
  tableHintText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  // Card styles (kept for fallback)
  enquiryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  enquiryInfo: {
    gap: 4,
  },
  enquiryNo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  enquiryDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  cardBody: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  customerInfo: {
    gap: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 13,
    color: COLORS.textMuted,
    gap: 4,
  },
  icon: {
    marginTop: 2,
  },

  cargoInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  cargoDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 13,
    color: COLORS.textMuted,
    gap: 4,
  },

  cardFooter: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.gray50,
  },
  footerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
