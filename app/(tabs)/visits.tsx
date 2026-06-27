/**
 * visits.tsx
 * Customer Visits screen — premium enterprise UI (Linear / Stripe / Vercel inspired)
 * Supports: Expo (iOS / Android) + Web (react-native-web)
 *
 * Dependencies already in the project:
 *   expo-router, @supabase/supabase-js, lucide-react-native,
 *   expo-image-picker, expo-location
 *
 * Supabase bucket  : customer-visit-photos
 * Folder structure : customer-visit-photos/salesperson_{id}/{yyyy}/{mm}/visit_{visitId}_{epoch}.jpg
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
  FileText,
  BarChart2,
  FileDown,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import {
  computeVisitReport,
  exportVisitExcel,
  generateVisitPdfHtml,
  openPdfInBrowser,
  rangeLabel,
  type ReportRange,
} from '@/lib/reportService';
import { EmptyState } from '@/components/EmptyState';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { hasRole } from '@/lib/permissions';

// ─── design tokens — premium enterprise palette ──────────────────────────────
// Soft neutral slate background, white surfaces, blue/slate primary,
// emerald success, amber warning, red reserved for critical/destructive only.
const C = {
  // Brand
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primarySoft: '#EFF6FF',
  primarySoftBorder: '#BFDBFE',
  onPrimary: '#FFFFFF',

  // Secondary accent (used for "in progress" / informational states)
  accent: '#4F46E5',
  accentSoft: '#EEF2FF',
  accentSoftBorder: '#C7D2FE',

  // Neutrals
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceMuted: '#F8FAFC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  text: '#0F172A',
  textMuted: '#475569',
  textLight: '#94A3B8',

  // Semantic
  success: '#059669',
  successSoft: '#ECFDF5',
  successSoftBorder: '#A7F3D0',

  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningSoftBorder: '#FDE68A',

  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  dangerSoftBorder: '#FECACA',

  // legacy aliases kept so any external references don't break
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F1F5F9',
  surfaceContainer: '#F1F5F9',
  borderMid: '#CBD5E1',
  won: '#059669',
  wonBg: '#ECFDF5',
  wonBorder: '#A7F3D0',
  followup: '#D97706',
  followupBg: '#FFFBEB',
  followupBorder: '#FDE68A',
  lost: '#DC2626',
  new: '#2563EB',
  contacted: '#4F46E5',
};

const SHADOW_SM = IS_WEB_SHADOW('0 1px 2px rgba(15,23,42,0.06)');
const SHADOW_MD = IS_WEB_SHADOW('0 4px 12px rgba(15,23,42,0.08)');

function IS_WEB_SHADOW(boxShadow: string) {
  return Platform.OS === 'web'
    ? { boxShadow }
    : {
        elevation: 2,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      };
}

// ─── types ───────────────────────────────────────────────────────────────────
interface CustomerOption {
  id: number;
  name: string;
  contact?: string; // contact_person
}

type VisitStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

interface VisitRow {
  id: number;
  customer_id: number | null;
  customer_name?: string;
  contact_name?: string;
  visit_start: string;
  location_name: string | null;
  location_address: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  remarks: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  outcome: string | null;
  photo_path: string | null;
  next_followup_date?: string | null;
  next_followup_time?: string | null;
  contact_person_name?: string | null;
  contact_person_mobile?: string | null;
  contact_person_email?: string | null;
  contact_person_designation?: string | null;
  salesperson_name?: string | null;
}

interface GPSState {
  loading: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
}

interface FilterState {
  status: string; // '' | 'planned' | 'in_progress' | 'completed' | 'cancelled'
  customerName: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

const PAGE_SIZE = 10;
const { width: SW } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

// ─── helpers ─────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function avatarColor(name: string): string {
  const palette = [
    { bg: '#DBEAFE', text: '#1D4ED8' },
    { bg: '#FEF3C7', text: '#92400E' },
    { bg: '#EDE9FE', text: '#5B21B6' },
    { bg: '#D1FAE5', text: '#065F46' },
    { bg: '#FCE7F3', text: '#9D174D' },
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length;
  return palette[h % palette.length].bg;
}

function avatarTextColor(name: string): string {
  const palette = ['#1D4ED8', '#92400E', '#5B21B6', '#065F46', '#9D174D'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length;
  return palette[h % palette.length];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Convert YYYY-MM-DD → DD/MM/YYYY for display */
function toDisplayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Convert DD/MM/YYYY → YYYY-MM-DD for storage */
function toIsoDate(display: string): string {
  if (!display) return '';
  const [d, m, y] = display.split('/');
  if (!d || !m || !y) return display;
  return `${y}-${m}-${d}`;
}

function statusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
      return { bg: C.successSoft, text: C.success, border: C.successSoftBorder, dot: C.success, label: 'Completed' };
    case 'in_progress':
      return { bg: C.accentSoft, text: C.accent, border: C.accentSoftBorder, dot: C.accent, label: 'In Progress' };
    case 'planned':
      return { bg: C.warningSoft, text: C.warning, border: C.warningSoftBorder, dot: C.warning, label: 'Planned' };
    case 'cancelled':
      return { bg: C.dangerSoft, text: C.danger, border: C.dangerSoftBorder, dot: C.danger, label: 'Cancelled' };
    default:
      return { bg: C.surfaceSubtle, text: C.textMuted, border: C.border, dot: C.textLight, label: status };
  }
}

async function uploadVisitPhoto(
  salespersonId: number,
  visitId: number,
  uri: string,
): Promise<string | null> {
  try {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const epoch = Math.floor(Date.now() / 1000);
    const path = `salesperson_${salespersonId}/${yyyy}/${mm}/visit_${visitId}_${epoch}.jpg`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error } = await supabase.storage
      .from('customer-visit-photos')
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

    if (error) throw error;
    return path;
  } catch (e) {
    console.error('Photo upload error:', e);
    return null;
  }
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  trend,
  trendLabel,
}: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
}) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label.toUpperCase()}</Text>
      <View style={s.statRow}>
        <Text style={s.statValue}>{value}</Text>
        {trend === 'up' && (
          <View style={[s.trendChip, { backgroundColor: C.successSoft }]}>
            <TrendingUp size={12} color={C.success} />
            <Text style={[s.trendText, { color: C.success }]}>{trendLabel}</Text>
          </View>
        )}
        {trend === 'down' && (
          <View style={[s.trendChip, { backgroundColor: C.dangerSoft }]}>
            <TrendingDown size={12} color={C.danger} />
            <Text style={[s.trendText, { color: C.danger }]}>{trendLabel}</Text>
          </View>
        )}
        {trend === 'stable' && <Text style={s.trendStable}>{trendLabel}</Text>}
      </View>
    </View>
  );
}

// Fixed column widths so the table can scroll horizontally as one thin line
// on narrow (mobile) viewports while staying perfectly aligned with its header.
const COL = {
  customer: 220,
  contact: 170,
  mobile: 150,
  datetime: 160,
  status: 120,
  actions: 140,
};
const TABLE_MIN_WIDTH =
  COL.customer + COL.contact + COL.mobile + COL.datetime + COL.status + COL.actions;

function VisitTableHeader() {
  return (
    <View style={[s.tableHeader, { width: TABLE_MIN_WIDTH }]}>
      <Text style={[s.tableHeaderCell, { width: COL.customer }]}>Customer</Text>
      <Text style={[s.tableHeaderCell, { width: COL.contact }]}>Contact Person</Text>
      <Text style={[s.tableHeaderCell, { width: COL.mobile }]}>Mobile</Text>
      <Text style={[s.tableHeaderCell, { width: COL.datetime }]}>Date &amp; Time</Text>
      <Text style={[s.tableHeaderCell, { width: COL.status }]}>Status</Text>
      <Text style={[s.tableHeaderCell, { width: COL.actions, textAlign: 'right' }]}>Actions</Text>
    </View>
  );
}

// Single thin-line visit row — identical shape on web and mobile, the only
// difference is the surrounding ScrollView scrolls horizontally on mobile.
function VisitRowItem({ visit, onView }: { visit: VisitRow; onView: (v: VisitRow) => void }) {
  const name = visit.customer_name ?? 'Unknown Customer';
  const contact = visit.contact_name ?? '—';
  const mobile = visit.contact_person_mobile ?? '—';
  const ss = statusStyle(visit.status);
  const { date, time } = formatDate(visit.visit_start);

  return (
    <View style={[s.tableRow, { width: TABLE_MIN_WIDTH }]}>
      {/* Customer */}
      <View style={[s.tableCell, { width: COL.customer }]}>
        <View style={[s.avatar, { backgroundColor: avatarColor(name) }]}>
          <Text style={[s.avatarText, { color: avatarTextColor(name) }]}>{initials(name)}</Text>
        </View>
        <Text style={s.tableCustomer} numberOfLines={1}>{name}</Text>
      </View>

      {/* Contact person */}
      <View style={[s.tableCell, { width: COL.contact }]}>
        <Text style={s.tableMuted} numberOfLines={1}>{contact}</Text>
      </View>

      {/* Mobile */}
      <View style={[s.tableCell, { width: COL.mobile }]}>
        <Phone size={11} color={C.textLight} style={{ marginRight: 5 }} />
        <Text style={s.tableMuted} numberOfLines={1}>{mobile}</Text>
      </View>

      {/* Date & Time */}
      <View style={[s.tableCell, { width: COL.datetime, flexDirection: 'column', alignItems: 'flex-start' }]}>
        <Text style={s.tableDate}>{date}</Text>
        <Text style={s.tableTime}>{time}</Text>
      </View>

      {/* Status */}
      <View style={[s.tableCell, { width: COL.status }]}>
        <View style={[s.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
          <View style={[s.statusDot, { backgroundColor: ss.dot }]} />
          <Text style={[s.statusText, { color: ss.text }]}>{ss.label}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[s.tableCell, { width: COL.actions, justifyContent: 'flex-end' }]}>
        <TouchableOpacity style={s.tableAction} onPress={() => onView(visit)} activeOpacity={0.7}>
          <FileText size={13} color={C.primary} />
          <Text style={s.tableActionText}>Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Label with required indicator ───────────────────────────────────────────
function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Text style={ms.label}>{text}</Text>
      {required && <Text style={{ fontSize: 11, color: C.danger, marginLeft: 3, fontWeight: '700' }}>*</Text>}
    </View>
  );
}

// ─── Log Visit Modal (Form) ───────────────────────────────────────────────────
function LogVisitModal({
  visible,
  customers,
  salespersonId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  customers: CustomerOption[];
  salespersonId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Customer
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [isNewProspect, setIsNewProspect] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Remarks
  const [remarks, setRemarks] = useState('');

  // Photo UX
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // GPS
  const [gps, setGps] = useState<GPSState>({
    loading: true, latitude: null, longitude: null, accuracy: null, address: null,
  });

  // Follow-up fields
  const [nextFollowupDate, setNextFollowupDate] = useState(''); // YYYY-MM-DD
  const [nextFollowupTime, setNextFollowupTime] = useState(''); // HH:mm (optional)

  // Person spoke to
  const [contactName, setContactName] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (!visible) return;
    setSelectedCustomer(null);
    setIsNewProspect(false);
    setNewCustomerName('');
    setRemarks('');
    setPhotoUri(null);
    setErrors({});
    setNextFollowupDate('');
    setNextFollowupTime('');
    setContactName('');
    setContactMobile('');
    setContactEmail('');
    setContactDesignation('');

    // Acquire GPS
    setGps({ loading: true, latitude: null, longitude: null, accuracy: null, address: null });
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGps((g) => ({ ...g, loading: false, address: 'Location permission denied' }));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const rev = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
      });
      const r = rev[0];
      const addr = r
        ? [r.street, r.district, r.city, r.region].filter(Boolean).join(', ')
        : `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
      setGps({
        loading: false,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        address: addr,
      });
    })();
  }, [visible]);

  const filteredCustomers = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch],
  );

  async function pickPhoto() {
    console.log('[visits] pickPhoto started');
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      console.log('[visits] photo selected', { uri: res.assets[0].uri });
    } else {
      console.log('[visits] photo pick canceled');
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    // Customer validation
    if (isNewProspect) {
      if (!newCustomerName.trim()) errs.newCustomerName = 'Customer name is required';
    } else {
      if (!selectedCustomer) errs.customer = 'Please select a customer';
    }

    // Follow-up date — OPTIONAL. Only validate format if something was entered.
    if (nextFollowupDate.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextFollowupDate)) {
        errs.nextFollowupDate = 'Invalid date — please use the date picker';
      }
    }

    // Follow-up time — optional, validate format only if provided
    if (nextFollowupTime.trim() && !/^\d{2}:\d{2}$/.test(nextFollowupTime)) {
      errs.nextFollowupTime = 'Use format HH:MM (24h)';
    }

    // Contact person — only name and mobile are required; email + designation optional
    if (!contactName.trim()) errs.contactName = 'Name of person spoke to is required';
    if (!contactMobile.trim()) errs.contactMobile = 'Contact number is required';
    if (contactEmail.trim() && !/^[^@]+@[^@]+\.[^@]+$/.test(contactEmail.trim())) {
      errs.contactEmail = 'Enter a valid email';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      console.log('[visits] validation failed', errs);
    } else {
      console.log('[visits] validation passed');
    }
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields.');
      return;
    }
    if (!gps.latitude || !gps.longitude) {
      Alert.alert('GPS Required', 'Waiting for location. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const session = await resolveSalespersonSession(auth.user?.email ?? null);
      const spId = session.salesperson?.id ?? salespersonId;

      const payload: Record<string, unknown> = {
        sales_person_id: spId,
        // Existing customer OR new prospect
        customer_id: isNewProspect ? null : (selectedCustomer?.id ?? null),
        customer_name: isNewProspect ? newCustomerName.trim() : (selectedCustomer?.name ?? null),
        // Location
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy_meters: gps.accuracy,

        location_address: gps.address,
        // Remarks
        remarks: remarks.trim() || null,
        // Status
        status: 'completed',
        visit_start: new Date().toISOString(),
        visit_end: new Date().toISOString(),
        // Follow-up
        next_followup_date: nextFollowupDate.trim() || null,
        next_followup_time: nextFollowupTime.trim() || null,
        // Contact person
        contact_person_name: contactName.trim(),
        contact_person_mobile: contactMobile.trim(),
        contact_person_email: contactEmail.trim(),
        contact_person_designation: contactDesignation.trim(),
      };

      console.log('[visits] ── SAVE ATTEMPT ──────────────────────');
      console.log('[visits] auth user:', auth.user?.email);
      console.log('[visits] salesperson id:', spId);
      console.log('[visits] payload:', JSON.stringify(payload, null, 2));

      // Extra: runtime diagnostics to understand why "visit not stored"
      const fallbackDebug = {
        time: new Date().toISOString(),
        platform: Platform.OS,
        spId,
        hasGPS: { lat: gps.latitude, lng: gps.longitude, accuracy: gps.accuracy },
        photoSelected: !!photoUri,
        payloadKeys: Object.keys(payload),
        payloadSample: {
          customer_id: (payload as any).customer_id,
          sales_person_id: (payload as any).sales_person_id,
          status: (payload as any).status,
          visit_start: (payload as any).visit_start,
        },
      };

      console.log('[visits][fallback-debug] before insert', fallbackDebug);

      // Use RPC so visit + follow-up are created consistently
      // Function: public.create_customer_visit_with_followup (see existing_schema)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'create_customer_visit_with_followup',
        {
          p_sales_person_id: (payload as any).sales_person_id,
          p_user_id: session.appUser?.id ?? null,
          p_customer_id: (payload as any).customer_id ?? null,
          p_job_id: (payload as any).job_id ?? null,
          p_visit_type: (payload as any).visit_type ?? 'customer',
          p_visit_start: (payload as any).visit_start,
          p_latitude: (payload as any).latitude,
          p_longitude: (payload as any).longitude,
          p_accuracy_meters: (payload as any).accuracy_meters,
          p_location_name: (payload as any).location_name ?? null,
          p_location_address: (payload as any).location_address,
          p_remarks: (payload as any).remarks,
          p_customer_name: (payload as any).customer_name,
          p_contact_person_name: (payload as any).contact_person_name,
          p_contact_person_mobile: (payload as any).contact_person_mobile,
          p_contact_person_email: (payload as any).contact_person_email,
          p_contact_person_designation: (payload as any).contact_person_designation,
          p_next_followup_date: (payload as any).next_followup_date ?? null,
          p_next_followup_time: (payload as any).next_followup_time ?? null,
        },
      );

      if (rpcError) {
        console.error('[visits][fallback-debug] rpc failed', {
          error: {
            message: rpcError?.message,
            code: rpcError?.code,
            details: (rpcError as any)?.details,
            hint: (rpcError as any)?.hint,
          },
          ...fallbackDebug,
          rpcData,
        });
        throw rpcError;
      }

      const inserted = rpcData as any;
      console.log('[visits] ── RPC SUCCESS ─────────────────────');
      console.log('[visits] visit_id:', inserted?.visit_id);
      console.log('[visits] followup_id:', inserted?.followup_id);

      const visitId = inserted?.visit_id as number | undefined;

      // Upload photo if selected
      if (photoUri && spId && visitId) {
        console.log('[visits] uploading photo for visit', visitId);
        const path = await uploadVisitPhoto(spId, visitId, photoUri);
        if (path) {
          await (supabase as any)
            .from('sales_customer_visits' as any)
            .update({ photo_path: path })
            .eq('id', visitId);
          console.log('[visits] photo uploaded:', path);
        } else {
          console.warn('[visits] photo upload failed, visit saved without photo');
        }
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const errMsg = (err as any)?.message ?? (err as any)?.details ?? JSON.stringify(err) ?? 'Could not save visit.';
      const errCode = (err as any)?.code ?? '';
      console.error('[visits] ── INSERT FAILED ──────────────────────');
      console.error('[visits] error object:', JSON.stringify(err));
      Alert.alert(
        'Save Failed',
        errCode === '42501'
          ? 'Permission denied (RLS). Please contact your administrator.'
          : `Could not save visit: ${errMsg}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = (field: string) => [
    ms.textInput,
    errors[field] ? { borderColor: C.danger } : {},
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={IS_WEB ? 'overFullScreen' : 'pageSheet'} onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Header */}
          <View style={ms.sheetHeader}>
            <View style={ms.sheetHeaderLeft}>
              <View style={ms.sheetIcon}>
                <Navigation size={18} color={C.primary} />
              </View>
              <Text style={ms.sheetTitle}>Log New Visit</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <X size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Customer Type Toggle ── */}
            <FieldLabel text="CUSTOMER TYPE" required />
            <View style={ms.toggleRow}>
              <TouchableOpacity
                style={[ms.toggleBtn, !isNewProspect && ms.toggleBtnActive]}
                onPress={() => { setIsNewProspect(false); setNewCustomerName(''); }}
              >
                <Text style={[ms.toggleText, !isNewProspect && ms.toggleTextActive]}>Existing Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ms.toggleBtn, isNewProspect && ms.toggleBtnActive]}
                onPress={() => { setIsNewProspect(true); setSelectedCustomer(null); }}
              >
                <Text style={[ms.toggleText, isNewProspect && ms.toggleTextActive]}>New Prospect</Text>
              </TouchableOpacity>
            </View>

            {/* Existing Customer picker */}
            {!isNewProspect && (
              <View style={{ marginTop: 14 }}>
                <FieldLabel text="SELECT CUSTOMER" required />
                <TouchableOpacity
                  style={[ms.selectBox, errors.customer ? { borderColor: C.danger } : {}]}
                  onPress={() => setShowCustomerPicker(true)}
                >
                  <Text style={selectedCustomer ? ms.selectVal : ms.selectPlaceholder}>
                    {selectedCustomer ? selectedCustomer.name : 'Search and select customer…'}
                  </Text>
                  <ChevronRight size={16} color={C.textLight} />
                </TouchableOpacity>
                {errors.customer ? <Text style={ms.errText}>{errors.customer}</Text> : null}
              </View>
            )}

            {/* New Prospect name */}
            {isNewProspect && (
              <View style={{ marginTop: 14 }}>
                <FieldLabel text="PROSPECT / COMPANY NAME" required />
                <TextInput
                  style={inputStyle('newCustomerName')}
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                  placeholder="Enter company or prospect name…"
                  placeholderTextColor={C.textLight}
                />
                {errors.newCustomerName ? <Text style={ms.errText}>{errors.newCustomerName}</Text> : null}
              </View>
            )}

            {/* ── Contact Person ── */}
            <View style={ms.sectionDivider}>
              <Text style={ms.sectionTitle}>Contact Person</Text>
            </View>

            <FieldLabel text="NAME" required />
            <TextInput
              style={inputStyle('contactName')}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Full name of person you spoke to…"
              placeholderTextColor={C.textLight}
            />
            {errors.contactName ? <Text style={ms.errText}>{errors.contactName}</Text> : null}

            <View style={{ marginTop: 16 }}>
              <FieldLabel text="MOBILE / CONTACT" required />
              <TextInput
                style={inputStyle('contactMobile')}
                value={contactMobile}
                onChangeText={setContactMobile}
                placeholder="+91 XXXXXXXXXX"
                placeholderTextColor={C.textLight}
                keyboardType="phone-pad"
              />
              {errors.contactMobile ? <Text style={ms.errText}>{errors.contactMobile}</Text> : null}
            </View>

            <View style={{ marginTop: 16 }}>
              <FieldLabel text="EMAIL (OPTIONAL)" />
              <TextInput
                style={inputStyle('contactEmail')}
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="email@company.com"
                placeholderTextColor={C.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.contactEmail ? <Text style={ms.errText}>{errors.contactEmail}</Text> : null}
            </View>

            <View style={{ marginTop: 16 }}>
              <FieldLabel text="DESIGNATION (OPTIONAL)" />
              <TextInput
                style={inputStyle('contactDesignation')}
                value={contactDesignation}
                onChangeText={setContactDesignation}
                placeholder="e.g. Purchase Manager, Director…"
                placeholderTextColor={C.textLight}
              />
              {errors.contactDesignation ? <Text style={ms.errText}>{errors.contactDesignation}</Text> : null}
            </View>

            {/* ── Follow-up ── */}
            <View style={ms.sectionDivider}>
              <Text style={ms.sectionTitle}>Next Follow-up</Text>
            </View>
            <Text style={{ fontSize: 12, color: C.textLight, marginBottom: 14, marginTop: -6 }}>
              Optional: schedule a follow-up reminder for this visit
            </Text>

            <FieldLabel text="FOLLOW-UP DATE (OPTIONAL)" />
            {IS_WEB ? (
              <input
                type="date"
                value={nextFollowupDate}
                onChange={(e: any) => setNextFollowupDate(e.target.value)}
                style={{
                  width: '100%',
                  border: `1px solid ${errors.nextFollowupDate ? C.danger : C.border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: nextFollowupDate ? C.text : C.textLight,
                  backgroundColor: C.surface,
                  outline: 'none',
                  boxSizing: 'border-box',
                } as any}
              />
            ) : (
              <TextInput
                style={inputStyle('nextFollowupDate')}
                value={nextFollowupDate ? toDisplayDate(nextFollowupDate) : ''}
                onChangeText={(val) => {
                  // Accept DD/MM/YYYY input and convert to YYYY-MM-DD internally
                  const cleaned = val.replace(/[^0-9/]/g, '');
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
                    setNextFollowupDate(toIsoDate(cleaned));
                  } else {
                    // Store partial input as-is until complete
                    setNextFollowupDate(cleaned);
                  }
                }}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={C.textLight}
                keyboardType="numeric"
              />
            )}
            {nextFollowupDate ? (
              <Text style={{ fontSize: 11, color: C.textLight, marginTop: 5 }}>
                Selected: {toDisplayDate(nextFollowupDate)}
              </Text>
            ) : null}
            {errors.nextFollowupDate ? <Text style={ms.errText}>{errors.nextFollowupDate}</Text> : null}

            <View style={{ marginTop: 16 }}>
              <FieldLabel text="FOLLOW-UP TIME (OPTIONAL)" />
              <TextInput
                style={inputStyle('nextFollowupTime')}
                value={nextFollowupTime}
                onChangeText={setNextFollowupTime}
                placeholder="HH:MM  (e.g. 14:30)"
                placeholderTextColor={C.textLight}
                keyboardType="numeric"
              />
              {errors.nextFollowupTime ? <Text style={ms.errText}>{errors.nextFollowupTime}</Text> : null}
            </View>

            {/* ── Remarks ── */}
            <View style={[ms.sectionDivider, { marginBottom: 10 }]}>
              <Text style={ms.sectionTitle}>Visit Remarks</Text>
            </View>
            <TextInput
              style={ms.textarea}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Enter meeting notes, action items, or remarks…"
              placeholderTextColor={C.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* ── Location Address ── */}
            {/* Location Capture (silent): keep capturing GPS internally, but don't show "acquiring" UI or address to user. */}
            <View style={{ height: 0, overflow: 'hidden' }}>
              {gps.loading ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : null}
            </View>

            {/* ── Photo Upload ── */}
            <TouchableOpacity style={ms.photoBox} onPress={pickPhoto}>
              <Camera size={26} color={photoUri ? C.primary : C.textLight} />
              <Text style={ms.photoText}>
                {photoUri ? '✓ Photo selected — tap to change' : 'Choose photo (site evidence)'}
              </Text>
              <Text style={ms.photoHint}>MAXIMUM 5MB</Text>
            </TouchableOpacity>

            {/* Photo Preview */}
            {photoUri ? (
              <View style={ms.photoPreviewWrap}>
                <Text style={ms.photoPreviewTitle}>Preview</Text>
                {(() => {
                  const RN = require('react-native');
                  const Image = RN.Image;
                  return (
                    <Image
                      source={{ uri: photoUri }}
                      style={ms.photoPreview}
                      resizeMode="cover"
                    />
                  );
                })()}
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[ms.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={C.onPrimary} />
              ) : (
                <>
                  <CheckCircle size={18} color={C.onPrimary} />
                  <Text style={ms.submitText}>Save Visit</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* Customer Picker Sub-Modal */}
      <Modal
        visible={showCustomerPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCustomerPicker(false)}
      >
        <View style={cp.overlay}>
          <View style={cp.sheet}>
            <View style={cp.header}>
              <Text style={cp.title}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <X size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={cp.searchRow}>
              <Search size={15} color={C.textLight} />
              <TextInput
                style={cp.searchInput}
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search customers…"
                placeholderTextColor={C.textLight}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredCustomers}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={cp.item}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerSearch('');
                    setShowCustomerPicker(false);
                  }}
                >
                  <View style={[s.avatar, { backgroundColor: avatarColor(item.name), width: 34, height: 34 }]}>
                    <Text style={[s.avatarText, { color: avatarTextColor(item.name), fontSize: 11 }]}>
                      {initials(item.name)}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={cp.itemName}>{item.name}</Text>
                    {item.contact ? <Text style={cp.itemContact}>{item.contact}</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.border }} />}
              ListEmptyComponent={<Text style={cp.empty}>No customers found.</Text>}
              style={{ maxHeight: 360 }}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ─── Visit Detail Modal ───────────────────────────────────────────────────────
function VisitDetailModal({ visit, onClose }: { visit: VisitRow | null; onClose: () => void }) {
  if (!visit) return null;
  const name = visit.customer_name ?? 'Unknown Customer';
  const contact = visit.contact_name ?? null;
  const ss = statusStyle(visit.status);
  const { date, time } = formatDate(visit.visit_start);

  return (
    <Modal visible={!!visit} animationType="slide" presentationStyle={IS_WEB ? 'overFullScreen' : 'pageSheet'} onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={[ms.sheet, { paddingTop: 0 }]}>
          <View style={[ms.sheetHeader, { paddingTop: IS_WEB ? 16 : 20 }]}>
            <View style={ms.sheetHeaderLeft}>
              <View style={[ms.sheetIcon, { backgroundColor: C.primarySoft }]}>
                <FileText size={18} color={C.primary} />
              </View>
              <Text style={ms.sheetTitle}>Visit Summary</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <X size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={ms.body} showsVerticalScrollIndicator={false}>
            {/* Customer */}
            <View style={vd.customerRow}>
              <View style={[s.avatar, { width: 48, height: 48, borderRadius: 14, backgroundColor: avatarColor(name) }]}>
                <Text style={[s.avatarText, { color: avatarTextColor(name), fontSize: 16 }]}>{initials(name)}</Text>
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={vd.custName}>{name}</Text>
                {contact ? <Text style={vd.custContact}>{contact}</Text> : null}
              </View>
              <View style={[s.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                <View style={[s.statusDot, { backgroundColor: ss.dot }]} />
                <Text style={[s.statusText, { color: ss.text }]}>{ss.label}</Text>
              </View>
            </View>

            <View style={vd.divider} />

            {/* Detail rows */}
            {[
              { label: 'Date & Time', value: `${date} · ${time}` },
              visit.contact_person_mobile ? { label: 'Contact Mobile', value: visit.contact_person_mobile } : null,
              visit.contact_person_email ? { label: 'Contact Email', value: visit.contact_person_email } : null,
              visit.contact_person_designation ? { label: 'Designation', value: visit.contact_person_designation } : null,
              { label: 'Location', value: visit.location_address ?? visit.location_name ?? '—' },
              { label: 'Coordinates', value: `${visit.latitude.toFixed(6)}, ${visit.longitude.toFixed(6)}` },
              visit.accuracy_meters ? { label: 'GPS Accuracy', value: `±${Math.round(visit.accuracy_meters)}m` } : null,
              visit.outcome ? { label: 'Outcome', value: visit.outcome.replace(/_/g, ' ') } : null,
            ]
              .filter(Boolean)
              .map((row, i) => (
                <View key={i} style={vd.detailRow}>
                  <Text style={vd.detailLabel}>{row!.label}</Text>
                  <Text style={vd.detailValue}>{row!.value}</Text>
                </View>
              ))}

            {visit.remarks ? (
              <>
                <View style={vd.divider} />
                <Text style={ms.label}>REMARKS</Text>
                <Text style={vd.remarks}>{visit.remarks}</Text>
              </>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────


// ─── Report Modal Styles ──────────────────────────────────────────────────────

const rs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  box: { backgroundColor: C.white, borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  radioRowActive: { borderColor: C.primary, backgroundColor: C.primaryLight ?? '#e8f0fb' },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: C.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  radioLabel: { fontSize: 14, color: C.text },
  radioLabelActive: { fontWeight: '700', color: C.primary },
  customRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  dateInput: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text },
  error: { fontSize: 12, color: C.lost ?? '#d63939', marginTop: 8 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 14, borderRadius: 10, marginTop: 20 },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: C.white },
  summaryBox: { maxHeight: 360 },
  periodLabel: { fontSize: 13, color: C.textMuted, marginBottom: 16, fontStyle: 'italic' },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  kpiBox: { flex: 1, minWidth: 70, backgroundColor: C.surfaceLowest ?? '#f8fafc', borderRadius: 10, padding: 12, alignItems: 'center' },
  kpiVal: { fontSize: 22, fontWeight: '800', color: C.primary },
  kpiLabel: { fontSize: 10, color: C.textMuted, marginTop: 2, textTransform: 'uppercase' },
  subheading: { fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 6, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  dataLabel: { fontSize: 13, color: C.text },
  dataVal: { fontSize: 13, color: C.textMuted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceLowest ?? '#f8fafc' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },
  backBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  backBtnText: { fontSize: 13, color: C.textMuted },
});
export default function CustomerVisitsScreen() {
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [salespersonId, setSalespersonId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState<ReportRange>('monthly');
  const [reportCustomStart, setReportCustomStart] = useState('');
  const [reportCustomEnd, setReportCustomEnd] = useState('');
  const [reportData, setReportData] = useState<ReturnType<typeof computeVisitReport> | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState('');
  const [detailVisit, setDetailVisit] = useState<VisitRow | null>(null);

  // Filter panel
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    status: '', customerName: '', dateFrom: '', dateTo: '',
  });

  // Stats derived from current loaded visits (full list, not paginated)
  const [allVisits, setAllVisits] = useState<VisitRow[]>([]);

  async function loadCustomers() {
    const { data } = await (supabase as any)
      .from('customer_master' as any)
      .select('id, name, contact_person')
      .order('name');

    const rows = (data ?? []) as any[];
    setCustomers(
      rows.map((c) => ({
        id: Number(c.id),
        name: String(c.name ?? ''),
        contact: c.contact_person ? String(c.contact_person) : undefined,
      })),
    );
  }

  async function loadVisits(pageNum = 1) {
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);
    const spId = session.salesperson?.id ?? null;
    setSalespersonId(spId);
    const canSeeTeamData = hasRole(session.roles, 'admin') || hasRole(session.roles, 'sales_manager');

    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // NOTE: sales_customer_visits stores customer_name + contact_person_*
    // directly on the row (needed for "new prospect" visits where
    // customer_id is null). These are now selected explicitly and used as
    // the primary source, with the customer_master join kept only as a
    // fallback for older rows that predate these columns being populated.
    let query = (supabase as any)
      .from('sales_customer_visits' as any)
      .select(
        `id, customer_id, customer_name, visit_start, location_name, location_address,
         latitude, longitude, accuracy_meters, remarks, status, outcome, photo_path,
         sales_person_id, next_followup_date, next_followup_time,
         contact_person_name, contact_person_mobile, contact_person_email,
         contact_person_designation`,
        { count: 'exact' },
      )
      .order('visit_start', { ascending: false })
      .range(from, to);

    if (!canSeeTeamData && spId) query = query.eq('sales_person_id', spId);

    const { data, count } = await query;

    const visitsRaw = (data ?? []) as any[];

    // salesperson name map
    const salespersonIds = Array.from(
      new Set(visitsRaw.map((v) => v.sales_person_id).filter((id): id is number => typeof id === 'number')),
    );
    let salespersonMap: Record<number, string> = {};
    if (salespersonIds.length > 0) {
      const { data: salespersonRows } = await supabase
        .from('sales_persons')
        .select('id, name')
        .in('id', salespersonIds);
      salespersonMap = Object.fromEntries((salespersonRows ?? []).map((row) => [row.id, row.name]));
    }

    // customer_master fallback map — only used when the visit row itself
    // is missing customer_name / contact_person_name (older records).
    const customerIds = Array.from(
      new Set(
        visitsRaw
          .filter((v) => !v.customer_name || !v.contact_person_name)
          .map((v) => v.customer_id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );
    let customerMap: Record<number, { name?: string; contact_person?: string }> = {};
    if (customerIds.length > 0) {
      const { data: customerRows } = await supabase
        .from('customer_master')
        .select('id, name, contact_person')
        .in('id', customerIds);
      customerMap = Object.fromEntries(
        (customerRows ?? []).map((row) => [row.id, { name: row.name, contact_person: row.contact_person }]),
      );
    }

    const mapped: VisitRow[] = visitsRaw.map((v) => {
      const cm = v.customer_id ? customerMap[v.customer_id] : undefined;
      return {
        ...(v as unknown as VisitRow),
        // Prefer the columns stored directly on the visit row (works for
        // both existing customers and new prospects); fall back to the
        // customer_master join only when the row itself has no value.
        customer_name: v.customer_name ?? cm?.name ?? undefined,
        contact_name: v.contact_person_name ?? cm?.contact_person ?? undefined,
        salesperson_name: v.sales_person_id ? (salespersonMap[Number(v.sales_person_id)] || null) : null,
      };
    });

    setVisits(mapped);
    setTotal(count ?? 0);

    // Stats (limit 200)
    let allQ = (supabase as any)
      .from('sales_customer_visits' as any)
      .select('status, visit_start, visit_end');

    if (!canSeeTeamData && spId) allQ = allQ.eq('sales_person_id', spId);

    allQ = allQ.order('visit_start', { ascending: false }).limit(200);

    const { data: allD, error: allErr } = await allQ;
    if (allErr) console.error('[visits] stats query failed', allErr);
    setAllVisits((allD ?? []) as any);
  }

  async function loadAll(pageNum = 1) {
    setLoading(true);
    await Promise.all([loadVisits(pageNum), loadCustomers()]);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      loadAll(1);
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    setPage(1);
    await loadAll(1);
    setRefreshing(false);
  }

  // Stats
  const monthlyTotal = allVisits.filter((v) => {
    const d = new Date(v.visit_start);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const completedVisits = allVisits.filter((v) => v.status === 'completed');
  const conversionCount = allVisits.filter((v) => (v as VisitRow).outcome === 'converted').length;
  const conversionRate = completedVisits.length > 0 ? ((conversionCount / completedVisits.length) * 100).toFixed(1) : '0.0';

  // Avg duration in minutes
  const durationsMin = completedVisits
    .filter((v) => (v as VisitRow & { visit_end?: string }).visit_end)
    .map((v) => {
      const vv = v as VisitRow & { visit_end: string };
      return (new Date(vv.visit_end).getTime() - new Date(vv.visit_start).getTime()) / 60000;
    });
  const avgDuration = durationsMin.length > 0 ? Math.round(durationsMin.reduce((a, b) => a + b, 0) / durationsMin.length) : 0;

  // Search + filter (client-side on loaded page)
  const filtered = useMemo(() => {
    return visits.filter((v) => {
      // Text search across key fields
      const textMatch =
        search.trim() === '' ||
        [v.customer_name, v.contact_name, v.contact_person_mobile, v.location_address, v.location_name, v.status, v.remarks]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());

      // Status filter
      const statusMatch = filter.status === '' || v.status === filter.status;

      // Customer name filter
      const custMatch =
        filter.customerName.trim() === '' ||
        (v.customer_name ?? '').toLowerCase().includes(filter.customerName.toLowerCase());

      // Date range filter
      let dateMatch = true;
      if (filter.dateFrom) {
        dateMatch = dateMatch && v.visit_start >= filter.dateFrom;
      }
      if (filter.dateTo) {
        // Add one day to dateTo to make it inclusive
        const toDate = new Date(filter.dateTo);
        toDate.setDate(toDate.getDate() + 1);
        dateMatch = dateMatch && v.visit_start < toDate.toISOString();
      }

      return textMatch && statusMatch && custMatch && dateMatch;
    });
  }, [visits, search, filter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function goPage(p: number) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    loadVisits(p);
  }

  const hasActiveFilters = !!(filter.status || filter.customerName || filter.dateFrom || filter.dateTo);

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {/* Top Bar */}
      <View style={s.topbar}>
        <View>
          <Text style={s.pageTitle}>Customer Visits</Text>
          <Text style={s.pageSub}>Manage site visits · capture proof · track movements</Text>
        </View>
        <TouchableOpacity style={s.reportBtn} onPress={() => { setReportData(null); setShowReportModal(true); }}>
            <BarChart2 size={15} color={C.primary} />
            <Text style={s.reportBtnText}>Generate Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logBtn} onPress={() => setShowForm(true)} activeOpacity={0.9}>
          <Plus size={16} color={C.onPrimary} />
          <Text style={s.logBtnText}>Log New Visit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={s.statsRow}>
          <StatCard label="Total Visits (Monthly)" value={monthlyTotal} trend="up" trendLabel="+12%" />
          <StatCard label="Avg. Visit Duration" value={avgDuration > 0 ? `${avgDuration}m` : '—'} trend="stable" trendLabel="Stable" />
          <StatCard label="Conversion Rate" value={`${conversionRate}%`} trend="down" trendLabel="-2.1%" />
        </View>

        {/* Search + Filter */}
        <View style={s.searchRow}>
          <Search size={15} color={C.textLight} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search visits or customers…"
            placeholderTextColor={C.textLight}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ marginRight: 4 }}>
              <X size={15} color={C.textLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.filterIconBtn, hasActiveFilters && s.filterIconBtnActive]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Filter size={15} color={hasActiveFilters ? C.onPrimary : C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Filter Panel */}
        {showFilters && (
          <View style={s.filterPanel}>
            <View style={s.filterPanelHeader}>
              <Text style={s.filterPanelTitle}>FILTER VISITS</Text>
              <TouchableOpacity
                onPress={() => {
                  setFilter({ status: '', customerName: '', dateFrom: '', dateTo: '' });
                }}
              >
                <Text style={s.filterClearBtn}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Status chips */}
            <Text style={s.filterLabel}>STATUS</Text>
            <View style={s.filterChipsRow}>
              {['', 'planned', 'in_progress', 'completed', 'cancelled'].map((st) => {
                const isActive = filter.status === st;
                const label = st === '' ? 'All' : statusStyle(st).label;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[
                      s.filterChip,
                      isActive && { backgroundColor: C.primary, borderColor: C.primary },
                    ]}
                    onPress={() => setFilter((f) => ({ ...f, status: st }))}
                  >
                    <Text style={[s.filterChipText, isActive && { color: C.onPrimary }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Customer name */}
            <Text style={[s.filterLabel, { marginTop: 12 }]}>CUSTOMER NAME</Text>
            <View style={s.filterInputRow}>
              <TextInput
                style={s.filterInput}
                value={filter.customerName}
                onChangeText={(v) => setFilter((f) => ({ ...f, customerName: v }))}
                placeholder="Filter by customer name…"
                placeholderTextColor={C.textLight}
              />
              {filter.customerName.length > 0 && (
                <TouchableOpacity onPress={() => setFilter((f) => ({ ...f, customerName: '' }))}>
                  <X size={13} color={C.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {/* Date range */}
            <Text style={[s.filterLabel, { marginTop: 12 }]}>DATE RANGE</Text>
            <View style={s.filterDateRow}>
              <View style={[s.filterInputRow, { flex: 1 }]}>
                <TextInput
                  style={[s.filterInput, { flex: 1 }]}
                  value={filter.dateFrom}
                  onChangeText={(v) => setFilter((f) => ({ ...f, dateFrom: v }))}
                  placeholder="From YYYY-MM-DD"
                  placeholderTextColor={C.textLight}
                  keyboardType="numeric"
                />
              </View>
              <Text style={s.filterDateSep}>—</Text>
              <View style={[s.filterInputRow, { flex: 1 }]}>
                <TextInput
                  style={[s.filterInput, { flex: 1 }]}
                  value={filter.dateTo}
                  onChangeText={(v) => setFilter((f) => ({ ...f, dateTo: v }))}
                  placeholder="To YYYY-MM-DD"
                  placeholderTextColor={C.textLight}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* Visit History Panel */}
        <View style={s.panel}>
          {/* Panel header */}
          <View style={s.panelHeader}>
            <View>
              <Text style={s.panelTitle}>Visit History</Text>
              <Text style={s.panelSub}>Track recent client interactions and field reports.</Text>
            </View>
            <View style={s.panelActions}>
              <TouchableOpacity style={s.iconBtn}>
                <Filter size={16} color={C.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn}>
                <Download size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rows */}
          {loading && visits.length === 0 ? (
            <ActivityIndicator size="large" color={C.primary} style={{ padding: 48 }} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<MapPin size={28} color={C.textLight} />}
              title="No visits found"
              subtitle="Logged customer visits will appear here."
            />
          ) : (
            // Single thin-line row, identical on web and mobile — wrapped in a
            // horizontal ScrollView so it stays one line even on narrow screens.
            <ScrollView horizontal showsHorizontalScrollIndicator={IS_WEB}>
              <View>
                <VisitTableHeader />
                {filtered.map((v, i) => (
                  <View key={v.id}>
                    <VisitRowItem visit={v} onView={setDetailVisit} />
                    {i < filtered.length - 1 && (
                      <View style={{ height: 1, backgroundColor: C.border, width: TABLE_MIN_WIDTH }} />
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <View style={s.pagination}>
              <Text style={s.paginationInfo}>
                Showing <Text style={{ fontWeight: '700', color: C.text }}>{filtered.length}</Text> of{' '}
                <Text style={{ fontWeight: '700', color: C.text }}>{total}</Text> visits
              </Text>
              <View style={s.pageButtons}>
                <TouchableOpacity
                  style={[s.pageBtn, page === 1 && s.pageBtnDisabled]}
                  onPress={() => goPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft size={14} color={page === 1 ? C.textLight : C.textMuted} />
                  <Text style={[s.pageBtnText, page === 1 && { color: C.textLight }]}>Prev</Text>
                </TouchableOpacity>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[s.pageBtn, page === p && s.pageBtnActive]}
                    onPress={() => goPage(p)}
                  >
                    <Text style={[s.pageBtnText, page === p && { color: C.onPrimary, fontWeight: '700' }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[s.pageBtn, page === totalPages && s.pageBtnDisabled]}
                  onPress={() => goPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <Text style={[s.pageBtnText, page === totalPages && { color: C.textLight }]}>Next</Text>
                  <ChevronRight size={14} color={page === totalPages ? C.textLight : C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB for mobile */}
      {!IS_WEB && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
          <Plus size={26} color={C.onPrimary} />
        </TouchableOpacity>
      )}

      {/* Modals */}
      <LogVisitModal
        visible={showForm}
        customers={customers}
        salespersonId={salespersonId}
        onClose={() => setShowForm(false)}
        onSaved={onRefresh}
      />
      <VisitDetailModal visit={detailVisit} onClose={() => setDetailVisit(null)} />
    </View>
  );
}

// ─── StyleSheets ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Top bar
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingTop: IS_WEB ? 16 : 52,
    ...SHADOW_SM,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  pageSub: { fontSize: 13, color: C.textMuted, marginTop: 3 },

  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
    marginRight: 8,
  },
  reportBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    ...SHADOW_SM,
  },
  logBtnText: { fontSize: 13, fontWeight: '600', color: C.onPrimary },

  scroll: { flex: 1 },
  content: { padding: 24, gap: 16, maxWidth: IS_WEB ? 1200 : undefined, width: '100%', alignSelf: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 16, flexWrap: IS_WEB ? 'nowrap' : 'wrap' },
  statCard: {
    flex: 1,
    minWidth: IS_WEB ? undefined : '46%',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    ...SHADOW_SM,
  },
  statLabel: { fontSize: 10, fontWeight: '600', color: C.textMuted, letterSpacing: 0.6, marginBottom: 10 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  statValue: { fontSize: 24, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  trendChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  trendText: { fontSize: 11, fontWeight: '700' },
  trendStable: { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, outlineStyle: 'none' } as object,
  filterIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  filterIconBtnActive: { backgroundColor: C.primary, borderColor: C.primary },

  // Filter panel
  filterPanel: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 6,
    ...SHADOW_SM,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterPanelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  filterClearBtn: { fontSize: 12, fontWeight: '600', color: C.primary },
  filterLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceSubtle,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  filterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.surface,
    gap: 6,
  },
  filterInput: { flex: 1, fontSize: 13, color: C.text, outlineStyle: 'none' } as object,
  filterDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterDateSep: { fontSize: 14, color: C.textLight },

  // Panel
  panel: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...SHADOW_MD,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  panelTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  panelSub: { fontSize: 12, color: C.textMuted, marginTop: 3 },
  panelActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },

  // Thin single-line table (shared by web + mobile, horizontally scrollable)
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
  },
  tableCell: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  tableCustomer: { fontSize: 13, fontWeight: '600', color: C.text, marginLeft: 10, flexShrink: 1 },
  tableMuted: { fontSize: 13, color: C.textMuted },
  tableDate: { fontSize: 13, color: C.text, fontWeight: '500' },
  tableTime: { fontSize: 12, color: C.textLight, marginTop: 1 },
  tableAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: C.primarySoft,
  },
  tableActionText: { fontSize: 12, fontWeight: '700', color: C.primary },

  avatar: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700' },

  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Pagination
  pagination: {
    flexDirection: IS_WEB ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 12,
    backgroundColor: C.surface,
  },
  paginationInfo: { fontSize: 13, color: C.textMuted },
  pageButtons: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    gap: 2,
  },
  pageBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: '500', color: C.textMuted },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
});

// Modal sheet styles
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
    ...(IS_WEB ? { alignItems: 'center', justifyContent: 'center' } : {}),
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: IS_WEB ? 16 : 20,
    borderTopRightRadius: IS_WEB ? 16 : 20,
    borderBottomLeftRadius: IS_WEB ? 16 : 0,
    borderBottomRightRadius: IS_WEB ? 16 : 0,
    maxHeight: IS_WEB ? '90%' : '92%',
    width: IS_WEB ? Math.min(SW * 0.9, 540) : '100%',
    paddingTop: IS_WEB ? 0 : 8,
    ...SHADOW_MD,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 22, paddingTop: 20 },
  label: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: C.surface,
  },
  selectVal: { fontSize: 14, color: C.text, flex: 1 },
  selectPlaceholder: { fontSize: 14, color: C.textLight, flex: 1 },
  textInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.surface,
    outlineStyle: 'none',
  } as object,
  errText: { fontSize: 11, color: C.danger, marginTop: 5, marginLeft: 2 },
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: C.surfaceSubtle },
  toggleBtnActive: { backgroundColor: C.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  toggleTextActive: { color: C.onPrimary },
  sectionDivider: {
    marginTop: 22,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.primary },
  textarea: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.surface,
    minHeight: 84,
    textAlignVertical: 'top',
    outlineStyle: 'none',
  } as object,
  gpsBox: {
    backgroundColor: C.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginTop: 16,
    gap: 6,
  },
  gpsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsTitle: { fontSize: 13, fontWeight: '700', color: C.primary },
  accuracyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: C.successSoft,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  accuracyText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  gpsAddr: { fontSize: 13, fontWeight: '500', color: C.text },
  gpsCoords: { fontSize: 11, color: C.textMuted, fontVariant: ['tabular-nums'] } as object,
  photoBox: {
    marginTop: 18,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 22,
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surfaceMuted,
  },
  photoText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  photoHint: { fontSize: 10, fontWeight: '700', color: C.textLight, letterSpacing: 0.5, textTransform: 'uppercase' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 20,
    ...SHADOW_SM,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: C.onPrimary },

  // Photo preview
  photoPreviewWrap: { marginTop: 14, gap: 8 },
  photoPreviewTitle: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  photoPreview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: C.surfaceSubtle, borderWidth: 1, borderColor: C.border },
});

// Customer picker styles
const cp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: C.surface, borderRadius: 16, width: '100%', maxWidth: 440, overflow: 'hidden', ...SHADOW_MD },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 4, outlineStyle: 'none' } as object,
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text },
  itemContact: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  empty: { padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 },
});

// Visit detail styles
const vd = StyleSheet.create({
  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  custName: { fontSize: 17, fontWeight: '700', color: C.text },
  custContact: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 9, gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, flex: 1 },
  detailValue: { fontSize: 13, color: C.text, flex: 2, textAlign: 'right' },
  remarks: { fontSize: 14, color: C.text, lineHeight: 21, marginTop: 10, padding: 16, backgroundColor: C.surfaceSubtle, borderRadius: 12 },
});