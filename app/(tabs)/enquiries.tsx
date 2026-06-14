import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { StatusBadge } from '@/components/Badge';

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

      if (!session.salesperson && session.appUser?.role !== 'admin') {
        setSessionError('No salesperson profile is linked to this account yet.');
        setEnquiries([]);
        return;
      }

      setSessionError('');

      // Build query
      let query = supabase.from('enquiries').select('*');

      // For non-admin users, filter by sales_person_id
      if (session.appUser?.role !== 'admin') {
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

      setEnquiries(data || []);
      dbg('loadData → complete', { count: data?.length ?? 0 });
    } catch (e: unknown) {
      err('loadData → unexpected exception', e);
      setError('Failed to load enquiries. Please pull down to refresh.');
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  function handlePrint() {
    // TODO: Implement print functionality
    alert('Print functionality will be implemented');
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const filteredEnquiries = enquiries.filter(enquiry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (enquiry.customer_name?.toLowerCase().includes(query)) ||
      (enquiry.enquiry_no?.toLowerCase().includes(query)) ||
      (enquiry.commodity?.toLowerCase().includes(query)) ||
      (enquiry.pol?.toLowerCase().includes(query)) ||
      (enquiry.pod?.toLowerCase().includes(query))
    );
  });

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
        <TouchableOpacity style={styles.filterBtn}>
          <Filter size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

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
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first enquiry to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyBtn} onPress={handleCreateEnquiry}>
                <Plus size={16} color={COLORS.white} />
                <Text style={styles.emptyBtnText}>Create Enquiry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredEnquiries.map((enquiry) => (
              <View key={enquiry.id} style={styles.enquiryCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.enquiryInfo}>
                    <Text style={styles.enquiryNo}>
                      {enquiry.enquiry_no || `ENQ-${enquiry.id.toString().padStart(5, '0')}`}
                    </Text>
                    <Text style={styles.enquiryDate}>
                      {enquiry.enq_date
                        ? new Date(enquiry.enq_date).toLocaleDateString()
                        : new Date(enquiry.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <StatusBadge status={enquiry.status || 'Pending'} />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{enquiry.customer_name || 'Unknown Customer'}</Text>
                    <Text style={styles.route} numberOfLines={1}>
                      <MapPin size={12} color={COLORS.textLight} style={styles.icon} />
                      {enquiry.pol || 'N/A'} → {enquiry.pod || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cargoInfo}>
                    <Text style={styles.cargoDetail}>
                      <Package size={12} color={COLORS.textLight} style={styles.icon} />
                      {enquiry.commodity || 'N/A'}
                    </Text>
                    <Text style={styles.cargoDetail}>
                      <Truck size={12} color={COLORS.textLight} style={styles.icon} />
                      {enquiry.packages || '0'} {enquiry.packages_unit || 'packages'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.footerBtn}
                    onPress={() => handleViewEnquiry(enquiry.id)}
                  >
                    <Eye size={14} color={COLORS.primary} />
                    <Text style={styles.footerBtnText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.footerBtn}
                    onPress={() => handleEditEnquiry(enquiry.id)}
                  >
                    <Edit size={14} color={COLORS.primary} />
                    <Text style={styles.footerBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.footerBtn}>
                    <FileText size={14} color={COLORS.primary} />
                    <Text style={styles.footerBtnText}>Job</Text>
                  </TouchableOpacity>
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