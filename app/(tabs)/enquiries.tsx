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
import {
  Search,
  Plus,
  Edit,
  FileText,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  Eye,
  CheckCircle,
  XCircle,
  Package,
  MapPin,
  Truck,
  X,
  ChevronDown,
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

function dbg(event: string, payload?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`${TAG} ${event}`, payload ?? '');
  }
}

function err(event: string, payload?: unknown) {
  console.error(`${TAG} ${event}`, payload ?? '');
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

      // Add search filter if query exists
      if (searchQuery) {
        query = query.or(
          `customer_name.ilike.%${searchQuery}%,enquiry_no.ilike.%${searchQuery}%,commodity.ilike.%${searchQuery}%`
        );
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
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply filters to enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(enquiry => {
      // Customer name filter
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
  }, [enquiries, filterCustomer, filterDate, filterMode, filterStatus]);

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

  function handleEditEnquiry(id: number) {
    router.push(`/enquiry/enquiry/${id}?edit=true`);
  }

  function handleExportExcel() {
    // TODO: Implement Excel export functionality
    alert('Excel export functionality will be implemented');
  }

  async function handlePrint(enquiry: EnquiryRow) {
    // Generate printable content for the enquiry
    const printContent = `
ENQUIRY DETAILS
===============
Enquiry No: ${enquiry.enquiry_no || 'N/A'}
Date: ${enquiry.enq_date ? new Date(enquiry.enq_date).toLocaleDateString() : 'N/A'}
Customer: ${enquiry.customer_name || 'N/A'}
Mode: ${enquiry.mode_name || 'N/A'}
Status: ${enquiry.status || 'N/A'}
Job ID: ${enquiry.job_id || 'N/A'}

Route: ${enquiry.pol || 'N/A'} → ${enquiry.pod || 'N/A'}
Commodity: ${enquiry.commodity || 'N/A'}
Packages: ${enquiry.packages || '0'} ${enquiry.packages_unit || ''}
Gross Weight: ${enquiry.gross_weight || '0'} ${enquiry.gross_weight_unit || ''}
    `.trim();

    // For web platform, use window.print
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Enquiry ${enquiry.enquiry_no || enquiry.id}</title></head>
            <body>
              <pre style="font-family: monospace; font-size: 12px; white-space: pre-wrap;">${printContent}</pre>
              <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else {
      // For mobile, show alert with content (print requires native modules)
      Alert.alert(
        'Print Enquiry',
        printContent,
        [{ text: 'OK' }]
      );
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
            placeholder="Search by customer, enquiry no, commodity..."
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
        <TouchableOpacity style={styles.actionBtn} onPress={handleExportExcel}>
          <Download size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
          <Printer size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Print</Text>
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
                ? 'Try adjusting your search or filters'
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
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
              <Text style={[styles.tableHeaderCell, styles.colEnqNo]}>Enquiry No.</Text>
              <Text style={[styles.tableHeaderCell, styles.colCustomer]}>Customer</Text>
              <Text style={[styles.tableHeaderCell, styles.colSalesperson]}>Salesperson</Text>
              <Text style={[styles.tableHeaderCell, styles.colMode]}>Mode</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
              <Text style={[styles.tableHeaderCell, styles.colJobId]}>Job ID</Text>
              <Text style={[styles.tableHeaderCell, styles.colActions]}>Actions</Text>
            </View>

            {/* Table Body */}
            {filteredEnquiries.map((enquiry) => (
              <View key={enquiry.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colDate]}>
                  {enquiry.enq_date
                    ? new Date(enquiry.enq_date).toLocaleDateString()
                    : '-'}
                </Text>
                <Text style={[styles.tableCell, styles.colEnqNo]}>
{enquiry.enquiry_no || `ENQ-${enquiry.id.toString().padStart(6, '0')}`}
                </Text>
                <Text style={[styles.tableCell, styles.colCustomer]} numberOfLines={1}>
                  {enquiry.customer_name || 'Unknown'}
                </Text>
                <Text style={[styles.tableCell, styles.colSalesperson]} numberOfLines={1}>
                  {enquiry.salesperson_name || 'Unassigned'}
                </Text>
                <Text style={[styles.tableCell, styles.colMode]}>
                  {enquiry.mode_name || 'N/A'}
                </Text>
                <View style={[styles.tableCell, styles.colStatus]}>
                  <StatusBadge status={enquiry.status || 'Pending'} />
                </View>
                <Text style={[styles.tableCell, styles.colJobId]}>
                  {enquiry.job_id ? `JOB-${enquiry.job_id.toString().padStart(5, '0')}` : '-'}
                </Text>
                <View style={[styles.tableCell, styles.colActions]}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleViewEnquiry(enquiry.id)}
                    >
                      <Eye size={12} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleEditEnquiry(enquiry.id)}
                    >
                      <Edit size={12} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleCancelEnquiry(enquiry)}
                    >
                      <XCircle size={12} color={enquiry.status === 'Cancelled' ? COLORS.textLight : COLORS.danger} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handlePrint(enquiry)}
                    >
                      <Printer size={12} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
  colActions: { width: 100, flexShrink: 0, justifyContent: 'flex-end' },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
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
