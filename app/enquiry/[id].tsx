import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Edit,
  Printer,
  FileText,
  CheckCircle,
  X,
  MapPin,
  Package,
  Truck,
  User,
  Building,
  DollarSign,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { hasRole } from '@/lib/permissions';
import { StatusBadge } from '@/components/Badge';

// ─── Types ────────────────────────────────────────────────────────────────────

type EnquiryRow = {
  id: number;
  enquiry_no: string | null;
  company_id: number | null;
  enq_date: string | null;
  customer_id: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_gst: string | null;
  shipper_id: number | null;
  shipper: string | null;
  cnee_id: number | null;
  cnee: string | null;
  sales_person_id: number | null;
  seals_person: string | null;
  mode_id: number | null;
  pol_country: string | null;
  pol: string | null;
  pod_country: string | null;
  pod: string | null;
  commodity: string | null;
  packages: string | null;
  packages_unit: string | null;
  gross_weight: string | null;
  gross_weight_unit: string | null;
  cbm: string | null;
  usd_exchange_rate: number | null;
  eur_exchange_rate: number | null;
  gbp_exchange_rate: number | null;
  status: string | null;
  cancel_remark: string | null;
  job_id: number | null;
  created_at: string;
  updated_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAG = '[EnquiryDetailScreen]';

function dbg(event: string, payload?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`${TAG} ${event}`, payload ?? '');
  }
}

function err(event: string, payload?: unknown) {
  console.error(`${TAG} ${event}`, payload ?? '');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EnquiryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [enquiry, setEnquiry] = useState<EnquiryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionError, setSessionError] = useState('');

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    const fetchEnquiry = async () => {
      dbg('fetchEnquiry → start', { id });
      setLoading(true);
      setError('');

      try {
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          err('fetchEnquiry → supabase.auth.getUser() failed', authErr);
          setSessionError('Authentication error. Please sign in again.');
          setLoading(false);
          return;
        }

        const session = await resolveSalespersonSession(auth.user?.email ?? null);
        dbg('fetchEnquiry → resolveSalespersonSession()', {
          hasSalesperson: !!session.salesperson,
          hasAppUser: !!session.appUser,
        });

        if (!session.salesperson && !hasRole(session.roles, 'admin')) {
          setSessionError('No salesperson profile is linked to this account yet.');
          setLoading(false);
          return;
        }

        setSessionError('');

        // Fetch the specific enquiry
        const { data, error: fetchError } = await supabase
          .from('enquiries')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) {
          err('fetchEnquiry → query failed', fetchError);
          setError(`Failed to load enquiry: ${fetchError.message}`);
          setLoading(false);
          return;
        }

        if (!data) {
          setError('Enquiry not found');
          setLoading(false);
          return;
        }

        // For non-admin users, verify they have access to this enquiry
        if (!hasRole(session.roles, 'admin') && data.sales_person_id !== session.salesperson?.id) {
          setError('You do not have permission to view this enquiry');
          setLoading(false);
          return;
        }

        setEnquiry(data);
        dbg('fetchEnquiry → complete', { enquiryId: data.id });
      } catch (e: unknown) {
        err('fetchEnquiry → unexpected exception', e);
        setError('Failed to load enquiry details');
      } finally {
        setLoading(false);
      }
    };

    fetchEnquiry();
  }, [id]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleEdit() {
    router.push(`/enquiry/${id}?edit=true`);
  }

  function handlePrint() {
    // TODO: Implement print functionality
    alert('Print functionality will be implemented');
  }

  function handleConfirm() {
    // TODO: Implement confirm functionality
    alert('Confirm functionality will be implemented');
  }

  function handleCancel() {
    // TODO: Implement cancel functionality
    alert('Cancel functionality will be implemented');
  }

  function handleCreateJob() {
    // TODO: Implement job creation functionality
    alert('Create job functionality will be implemented');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || sessionError) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorBox}>
          <X size={24} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error || sessionError}</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!enquiry) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorBox}>
          <X size={24} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Enquiry Not Found</Text>
          <Text style={styles.errorText}>The requested enquiry could not be found.</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Enquiry Details</Text>
          <Text style={styles.headerSubtitle}>
            {enquiry.enquiry_no || `ENQ-${enquiry.id.toString().padStart(5, '0')}`}
          </Text>
        </View>
        <StatusBadge status={enquiry.status || 'Pending'} />
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
          <Edit size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
          <Printer size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleConfirm}>
          <CheckCircle size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCancel}>
          <X size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCreateJob}>
          <FileText size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Create Job</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Enquiry Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Enquiry Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Enquiry Date</Text>
              <Text style={styles.infoValue}>
                {enquiry.enq_date
                  ? new Date(enquiry.enq_date).toLocaleDateString()
                  : new Date(enquiry.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer</Text>
              <Text style={styles.infoValue}>{enquiry.customer_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer Address</Text>
              <Text style={styles.infoValue}>{enquiry.customer_address || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer GST</Text>
              <Text style={styles.infoValue}>{enquiry.customer_gst || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sales Person</Text>
              <Text style={styles.infoValue}>{enquiry.seals_person || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge status={enquiry.status || 'Pending'} />
            </View>
          </View>
        </View>

        {/* Shipment Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shipment Details</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mode</Text>
              <Text style={styles.infoValue}>{
                enquiry.mode_id === 1 ? 'Sea Export' :
                enquiry.mode_id === 2 ? 'Sea Import' :
                enquiry.mode_id === 3 ? 'Air Export' :
                enquiry.mode_id === 4 ? 'Air Import' : 'N/A'
              }</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>POL Country</Text>
              <Text style={styles.infoValue}>{enquiry.pol_country || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Port of Loading</Text>
              <Text style={styles.infoValue}>{enquiry.pol || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>POD Country</Text>
              <Text style={styles.infoValue}>{enquiry.pod_country || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Port of Destination</Text>
              <Text style={styles.infoValue}>{enquiry.pod || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Cargo Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cargo Details</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Commodity</Text>
              <Text style={styles.infoValue}>{enquiry.commodity || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Packages</Text>
              <Text style={styles.infoValue}>
                {enquiry.packages || '0'} {enquiry.packages_unit || 'packages'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gross Weight</Text>
              <Text style={styles.infoValue}>
                {enquiry.gross_weight || '0'} {enquiry.gross_weight_unit || 'KGS'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CBM</Text>
              <Text style={styles.infoValue}>{enquiry.cbm || '0'} m³</Text>
            </View>
          </View>
        </View>

        {/* Shipper & Consignee */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shipper & Consignee</Text>
          </View>
          <View style={[styles.card, styles.twoColumn]}>
            <View style={styles.column}>
              <Text style={styles.columnTitle}>Shipper</Text>
              <Text style={styles.columnValue}>{enquiry.shipper || 'N/A'}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.columnTitle}>Consignee</Text>
              <Text style={styles.columnValue}>{enquiry.cnee || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Exchange Rates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exchange Rates</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>USD Rate</Text>
              <Text style={styles.infoValue}>{enquiry.usd_exchange_rate?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>EUR Rate</Text>
              <Text style={styles.infoValue}>{enquiry.eur_exchange_rate?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>GBP Rate</Text>
              <Text style={styles.infoValue}>{enquiry.gbp_exchange_rate?.toFixed(2) || '0.00'}</Text>
            </View>
          </View>
        </View>

        {/* Job Link */}
        {enquiry.job_id && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Linked Job</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Job ID</Text>
                <Text style={styles.infoValue}>JOB-{enquiry.job_id.toString().padStart(5, '0')}</Text>
              </View>
            </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 24,
  },
  errorBox: {
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'web' ? 14 : 50,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  actionBar: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },

  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 16,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columnValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
});
