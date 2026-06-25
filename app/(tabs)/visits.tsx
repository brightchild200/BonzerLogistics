/**
 * visits.tsx
 * Customer Visits screen — matches the Logistics CRM HTML design (code.html)
 * Supports: Expo (iOS / Android) + Web (react-native-web)
 *
 * Dependencies already in the project:
 *   expo-router, @supabase/supabase-js, lucide-react-native,
 *   expo-image-picker, expo-location
 *
 * Supabase bucket  : customer-visit-photos
 * Folder structure : customer-visit-photos/salesperson_{id}/{yyyy}/{mm}/visit_{visitId}_{epoch}.jpg
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
  FileText,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/Badge';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { hasRole } from '@/lib/permissions';

// ─── colour tokens (mirrored from the HTML design system) ────────────────────
const C = {
  primary: '#0052a1',
  primaryContainer: '#206bc4',
  primaryLight: '#d6e3ff',
  primaryMid: '#cfe5ff',
  onPrimary: '#ffffff',
  secondary: '#00629d',
  bg: '#f7f9fc',
  surface: '#f7f9fc',
  surfaceLowest: '#ffffff',
  surfaceLow: '#f2f4f7',
  surfaceContainer: '#eceef1',
  border: '#E2E8F0',
  borderMid: '#c2c6d4',
  text: '#191c1e',
  textMuted: '#475569',
  textLight: '#727783',
  won: '#10B981',
  wonBg: '#f0fdf4',
  wonBorder: '#d1fae5',
  followup: '#F59E0B',
  followupBg: '#fffbeb',
  followupBorder: '#fef3c7',
  lost: '#EF4444',
  new: '#206BC4',
  contacted: '#6366F1',
};

// ─── types ───────────────────────────────────────────────────────────────────
interface CustomerOption {
  id: number;
  name: string;
  contact?: string; // contact_person
}

type VisitStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

type VisitType = 'customer' | string;

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
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function avatarColor(name: string): string {
  const palette = [
    { bg: '#dbeafe', text: C.primary },
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#ede9fe', text: '#5b21b6' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#fee2e2', text: '#991b1b' },
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length;
  return palette[h % palette.length].bg;
}

function avatarTextColor(name: string): string {
  const palette = [C.primary, '#92400e', '#5b21b6', '#065f46', '#991b1b'];
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
      return { bg: C.wonBg, text: C.won, border: C.wonBorder, label: 'Completed' };
    case 'in_progress':
      return { bg: '#eff6ff', text: C.new, border: '#bfdbfe', label: 'In Progress' };
    case 'planned':
      return { bg: C.followupBg, text: C.followup, border: C.followupBorder, label: 'Planned' };
    case 'cancelled':
      return { bg: '#fef2f2', text: C.lost, border: '#fecaca', label: 'Cancelled' };
    default:
      return { bg: C.surfaceLow, text: C.textMuted, border: C.border, label: status };
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
          <View style={s.trendChip}>
            <TrendingUp size={12} color={C.won} />
            <Text style={[s.trendText, { color: C.won }]}>{trendLabel}</Text>
          </View>
        )}
        {trend === 'down' && (
          <View style={s.trendChip}>
            <TrendingDown size={12} color={C.lost} />
            <Text style={[s.trendText, { color: C.lost }]}>{trendLabel}</Text>
          </View>
        )}
        {trend === 'stable' && <Text style={s.trendStable}>{trendLabel}</Text>}
      </View>
    </View>
  );
}

function VisitCard({ visit, onView }: { visit: VisitRow; onView: (v: VisitRow) => void }) {
  const name = visit.customer_name ?? 'Unknown Customer';
  const ss = statusStyle(visit.status);
  const { date, time } = formatDate(visit.visit_start);
  const salespersonLabel = visit.salesperson_name ? `Salesperson: ${visit.salesperson_name}` : null;

  return (
    <View style={s.visitCard}>
      {/* Header row */}
      <View style={s.vcHeader}>
        <View style={[s.avatar, { backgroundColor: avatarColor(name) }]}>
          <Text style={[s.avatarText, { color: avatarTextColor(name) }]}>{initials(name)}</Text>
        </View>
        <View style={s.vcInfo}>
          <Text style={s.vcCustomer} numberOfLines={1}>
            {name}
          </Text>
          {visit.contact_name ? (
            <Text style={s.vcContact}>{visit.contact_name}</Text>
          ) : null}
          {salespersonLabel ? <Text style={s.vcContact}>{salespersonLabel}</Text> : null}
        </View>
        <View style={[s.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
          <Text style={[s.statusText, { color: ss.text }]}>{ss.label}</Text>
        </View>
      </View>

      {/* Date + Location */}
      <View style={s.vcMeta}>
        <View style={s.vcMetaItem}>
          <MapPin size={13} color={C.textLight} style={{ marginRight: 4 }} />
          <Text style={s.vcMetaText} numberOfLines={1}>
            {visit.location_address ?? visit.location_name ?? `${visit.latitude}, ${visit.longitude}`}
          </Text>
        </View>
        <Text style={s.vcDate}>
          {date} · {time}
        </Text>
      </View>

      {/* Remarks preview */}
      {visit.remarks ? (
        <Text style={s.vcRemarks} numberOfLines={2}>
          {visit.remarks}
        </Text>
      ) : null}

      {/* Action */}
      <TouchableOpacity style={s.vcAction} onPress={() => onView(visit)}>
        <FileText size={14} color={C.primary} />
        <Text style={s.vcActionText}>View Summary</Text>
      </TouchableOpacity>
    </View>
  );
}

// For web: table row layout
function VisitTableRow({ visit, onView }: { visit: VisitRow; onView: (v: VisitRow) => void }) {
  const name = visit.customer_name ?? 'Unknown';
  const ss = statusStyle(visit.status);
  const { date, time } = formatDate(visit.visit_start);
  return (
    <View style={s.tableRow}>
      {/* Customer */}
      <View style={[s.tableCell, { flex: 2.5 }]}>
        <View style={[s.avatar, { backgroundColor: avatarColor(name) }]}>
          <Text style={[s.avatarText, { color: avatarTextColor(name) }]}>{initials(name)}</Text>
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={s.tableCustomer} numberOfLines={1}>{name}</Text>
          {visit.contact_name ? <Text style={s.tableContact}>{visit.contact_name}</Text> : null}
        </View>
      </View>
      {/* Date */}
      <View style={[s.tableCell, { flex: 1.5 }]}>
        <View>
          <Text style={s.tableDate}>{date}</Text>
          <Text style={s.tableTime}>{time}</Text>
        </View>
      </View>
      {/* Location */}
      <View style={[s.tableCell, { flex: 3 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.tableAddr} numberOfLines={1}>
            {visit.location_address ?? visit.location_name ?? '—'}
          </Text>
          <Text style={s.tableCoords}>
            {visit.latitude.toFixed(4)}, {visit.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
      {/* Status */}
      <View style={[s.tableCell, { flex: 1.2 }]}>
        <View style={[s.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
          <Text style={[s.statusText, { color: ss.text }]}>{ss.label}</Text>
        </View>
      </View>
      {/* Action */}
      <View style={[s.tableCell, { flex: 1, justifyContent: 'flex-end' }]}>
        <TouchableOpacity style={s.tableAction} onPress={() => onView(visit)}>
          <Text style={s.tableActionText}>View Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Label with required indicator ───────────────────────────────────────────
function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Text style={ms.label}>{text}</Text>
      {required && <Text style={{ fontSize: 10, color: C.lost, marginLeft: 2, fontWeight: '700' }}>*</Text>}
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

      // Extra: runtime diagnostics to understand why “visit not stored”
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

      // Bypass strict Supabase typings (schema.ts is out-of-sync with real DB)
      const insertedRes: any = await (supabase as any)
        .from('sales_customer_visits' as any)
        .insert(payload as any)
        .select('id')
        .single();

      const inserted = insertedRes?.data;
      const insertError = insertedRes?.error;
      if (insertError) {
        console.error('[visits][fallback-debug] insert failed', {
          error: {
            message: insertError?.message,
            code: insertError?.code,
            details: insertError?.details,
            hint: insertError?.hint,
          },
          ...fallbackDebug,
        });
        throw insertError;
      }

      console.log('[visits] ── INSERT SUCCESS ─────────────────────');
      console.log('[visits] inserted id:', inserted?.id);
      console.log('[visits] full response:', JSON.stringify(inserted));


      // Upload photo if selected
      if (photoUri && spId && inserted?.id) {
        console.log('[visits] uploading photo for visit', inserted.id);
        const path = await uploadVisitPhoto(spId, inserted.id, photoUri);
        if (path) {
          await (supabase as any)
            .from('sales_customer_visits' as any)
            .update({ photo_path: path })
            .eq('id', inserted.id);
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
    errors[field] ? { borderColor: C.lost } : {},
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
              <View style={{ marginTop: 12 }}>
                <FieldLabel text="SELECT CUSTOMER" required />
                <TouchableOpacity
                  style={[ms.selectBox, errors.customer ? { borderColor: C.lost } : {}]}
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
              <View style={{ marginTop: 12 }}>
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

            <View style={{ marginTop: 14 }}>
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

            <View style={{ marginTop: 14 }}>
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

            <View style={{ marginTop: 14 }}>
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
            <Text style={{ fontSize: 12, color: C.textLight, marginBottom: 12, marginTop: -4 }}>
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
                  border: `1px solid ${errors.nextFollowupDate ? C.lost : C.border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: nextFollowupDate ? C.text : C.textLight,
                  backgroundColor: C.surfaceLowest,
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
              <Text style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>
                Selected: {toDisplayDate(nextFollowupDate)}
              </Text>
            ) : null}
            {errors.nextFollowupDate ? <Text style={ms.errText}>{errors.nextFollowupDate}</Text> : null}

            <View style={{ marginTop: 14 }}>
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
            <View style={[ms.sectionDivider, { marginBottom: 8 }]}>
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
            <View style={ms.gpsBox}>
              <View style={ms.gpsTop}>
                <View style={ms.gpsLeft}>
                  <MapPin size={16} color={C.primary} />
                  <Text style={ms.gpsTitle}>Location Capture</Text>
                </View>
                <View style={[ms.accuracyChip, gps.loading && { backgroundColor: C.followupBg }]}>
                  <View style={[ms.dot, { backgroundColor: gps.loading ? C.followup : C.won }]} />
                  <Text style={[ms.accuracyText, { color: gps.loading ? C.followup : C.won }]}>
                    {gps.loading ? 'Acquiring…' : 'Ready'}
                  </Text>
                </View>
              </View>
              {gps.loading ? (
                <ActivityIndicator size="small" color={C.primary} style={{ marginTop: 8 }} />
              ) : (
                <Text style={ms.gpsAddr} numberOfLines={2}>{gps.address ?? '—'}</Text>
              )}
            </View>

            {/* ── Photo Upload ── */}
            <TouchableOpacity style={ms.photoBox} onPress={pickPhoto}>
              <Camera size={28} color={photoUri ? C.primary : C.textLight} />
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
                  <View style={{ marginLeft: 10 }}>
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
  const ss = statusStyle(visit.status);
  const { date, time } = formatDate(visit.visit_start);

  return (
    <Modal visible={!!visit} animationType="slide" presentationStyle={IS_WEB ? 'overFullScreen' : 'pageSheet'} onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={[ms.sheet, { paddingTop: 0 }]}>
          <View style={[ms.sheetHeader, { paddingTop: IS_WEB ? 16 : 20 }]}>
            <View style={ms.sheetHeaderLeft}>
              <View style={[ms.sheetIcon, { backgroundColor: '#eff6ff' }]}>
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
              <View style={[s.avatar, { width: 48, height: 48, borderRadius: 12, backgroundColor: avatarColor(name) }]}>
                <Text style={[s.avatarText, { color: avatarTextColor(name), fontSize: 16 }]}>{initials(name)}</Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={vd.custName}>{name}</Text>
                {visit.contact_name ? <Text style={vd.custContact}>{visit.contact_name}</Text> : null}
              </View>
              <View style={[s.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                <Text style={[s.statusText, { color: ss.text }]}>{ss.label}</Text>
              </View>
            </View>

            <View style={vd.divider} />

            {/* Detail rows */}
            {[
              { label: 'Date & Time', value: `${date} · ${time}` },
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

    let query = (supabase as any)
      .from('sales_customer_visits' as any)
      .select(
        `id, customer_id, visit_start, location_name, location_address,
         latitude, longitude, accuracy_meters, remarks, status, outcome, photo_path,
         customer_master(id, name, contact_person)`,
        { count: 'exact' },
      )
      .order('visit_start', { ascending: false })
      .range(from, to);


    if (!canSeeTeamData && spId) query = query.eq('sales_person_id', spId);

    const { data, count } = await query;
    const salespersonIds = Array.from(new Set((data ?? []).map((v: any) => v.sales_person_id).filter((id): id is number => typeof id === 'number')));
    let salespersonMap: Record<number, string> = {};
    if (salespersonIds.length > 0) {
      const { data: salespersonRows } = await supabase.from('sales_persons').select('id, name').in('id', salespersonIds);
      salespersonMap = Object.fromEntries((salespersonRows ?? []).map((row) => [row.id, row.name]));
    }
    const mapped: VisitRow[] = (data ?? []).map((v: Record<string, unknown>) => {
      const cm = v.customer_master as { name?: string; contact_person?: string } | null;
      return {
        ...(v as unknown as VisitRow),
        customer_name: cm?.name,
        contact_name: cm?.contact_person,
        salesperson_name: v.sales_person_id ? (salespersonMap[Number(v.sales_person_id)] || null) : null,
      };
    });
    setVisits(mapped);
    setTotal(count ?? 0);

    // Also load all for stats (limit 200)
    if (pageNum === 1) {
      let allQ = (supabase as any)
        .from('sales_customer_visits' as any)
        .select('status, visit_start, visit_end')
        .order('visit_start', { ascending: false })
        .limit(200);
      if (!canSeeTeamData && spId) allQ = allQ.eq('sales_person_id', spId);
      const { data: allD } = await allQ;
      setAllVisits(allD ?? []);
    }
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
        [v.customer_name, v.contact_name, v.location_address, v.location_name, v.status, v.remarks]
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

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {/* Top Bar */}
      <View style={s.topbar}>
        <View>
          <Text style={s.pageTitle}>Customer Visits</Text>
          <Text style={s.pageSub}>Manage site visits · capture proof · track movements</Text>
        </View>
        <TouchableOpacity style={s.logBtn} onPress={() => setShowForm(true)}>
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
            style={[
              s.filterIconBtn,
              (filter.status || filter.customerName || filter.dateFrom || filter.dateTo)
                ? s.filterIconBtnActive
                : {},
            ]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Filter
              size={15}
              color={
                filter.status || filter.customerName || filter.dateFrom || filter.dateTo
                  ? C.onPrimary
                  : C.textMuted
              }
            />
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
            <Text style={[s.filterLabel, { marginTop: 10 }]}>CUSTOMER NAME</Text>
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
            <Text style={[s.filterLabel, { marginTop: 10 }]}>DATE RANGE</Text>
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

          {/* Table header (web only) */}
          {IS_WEB && (
            <View style={s.tableHeader}>
              {['Customer & Contact', 'Date & Time', 'Location', 'Status', 'Actions'].map((h, i) => (
                <Text
                  key={h}
                  style={[s.tableHeaderCell, i === 4 && { textAlign: 'right' },
                    i === 0 ? { flex: 2.5 } : i === 1 ? { flex: 1.5 } : i === 2 ? { flex: 3 } : i === 3 ? { flex: 1.2 } : { flex: 1 }]}
                >
                  {h}
                </Text>
              ))}
            </View>
          )}

          {/* Rows */}
          {loading && visits.length === 0 ? (
            <ActivityIndicator size="large" color={C.primary} style={{ padding: 40 }} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<MapPin size={28} color={C.textLight} />}
              title="No visits found"
              subtitle="Logged customer visits will appear here."
            />
          ) : IS_WEB ? (
            filtered.map((v, i) => (
              <View key={v.id}>
                <VisitTableRow visit={v} onView={setDetailVisit} />
                {i < filtered.length - 1 && <View style={{ height: 1, backgroundColor: C.border }} />}
              </View>
            ))
          ) : (
            filtered.map((v) => (
              <VisitCard key={v.id} visit={v} onView={setDetailVisit} />
            ))
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
    backgroundColor: C.surfaceLowest,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingTop: IS_WEB ? 14 : 52,
    ...(IS_WEB ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}),
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  pageSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logBtnText: { fontSize: 13, fontWeight: '700', color: C.onPrimary },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: C.surfaceLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    ...(IS_WEB ? { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } : {}),
  },
  statLabel: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.7, marginBottom: 6 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text },
  trendChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendText: { fontSize: 11, fontWeight: '700' },
  trendStable: { fontSize: 11, color: C.textMuted },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surfaceLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, outlineStyle: 'none' } as object,
  filterIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceLowest,
  },
  filterIconBtnActive: { backgroundColor: C.primary, borderColor: C.primary },

  // Filter panel
  filterPanel: {
    backgroundColor: C.surfaceLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 6,
    ...(IS_WEB ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}),
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterPanelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  filterClearBtn: { fontSize: 12, fontWeight: '700', color: C.primary },
  filterLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 6 },
  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  filterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.surfaceLowest,
    gap: 4,
  },
  filterInput: { flex: 1, fontSize: 13, color: C.text, outlineStyle: 'none' } as object,
  filterDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterDateSep: { fontSize: 14, color: C.textLight },

  // Panel
  panel: {
    backgroundColor: C.surfaceLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...(IS_WEB ? { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } : {}),
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surfaceLowest,
  },
  panelTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  panelSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  panelActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceLowest,
  },

  // Table (web)
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.surfaceLow,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeaderCell: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', flex: 1 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tableCell: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  tableCustomer: { fontSize: 14, fontWeight: '700', color: C.text },
  tableContact: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  tableDate: { fontSize: 13, color: C.text },
  tableTime: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  tableAddr: { fontSize: 12, color: C.text },
  tableCoords: { fontSize: 10, color: C.textMuted, fontVariant: ['tabular-nums'], marginTop: 2 } as object,
  tableAction: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  tableActionText: { fontSize: 13, fontWeight: '700', color: C.primary },

  // Visit card (mobile)
  visitCard: {
    margin: 12,
    marginTop: 0,
    backgroundColor: C.surfaceLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  vcHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800' },
  vcInfo: { flex: 1 },
  vcCustomer: { fontSize: 15, fontWeight: '700', color: C.text },
  vcContact: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  vcMeta: { gap: 4 },
  vcMetaItem: { flexDirection: 'row', alignItems: 'center' },
  vcMetaText: { fontSize: 12, color: C.textMuted, flex: 1 },
  vcDate: { fontSize: 12, color: C.textMuted },
  vcRemarks: { fontSize: 13, color: C.text, lineHeight: 19 },
  vcAction: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  vcActionText: { fontSize: 13, fontWeight: '700', color: C.primary },

  // Status badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },

  // Pagination
  pagination: {
    flexDirection: IS_WEB ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
    backgroundColor: C.surfaceLowest,
  },
  paginationInfo: { fontSize: 13, color: C.textMuted },
  pageButtons: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLowest,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
});

// Modal sheet styles
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    ...(IS_WEB ? { alignItems: 'center', justifyContent: 'center' } : {}),
  },
  sheet: {
    backgroundColor: C.surfaceLowest,
    borderTopLeftRadius: IS_WEB ? 16 : 20,
    borderTopRightRadius: IS_WEB ? 16 : 20,
    borderBottomLeftRadius: IS_WEB ? 16 : 0,
    borderBottomRightRadius: IS_WEB ? 16 : 0,
    maxHeight: IS_WEB ? '90%' : '92%',
    width: IS_WEB ? Math.min(SW * 0.9, 540) : '100%',
    paddingTop: IS_WEB ? 0 : 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  label: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.surfaceLowest,
  },
  selectVal: { fontSize: 14, color: C.text, flex: 1 },
  selectPlaceholder: { fontSize: 14, color: C.textLight, flex: 1 },
  textInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    outlineStyle: 'none',
  } as object,
  errText: { fontSize: 11, color: C.lost, marginTop: 4, marginLeft: 2 },
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: C.surfaceLow },
  toggleBtnActive: { backgroundColor: C.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  toggleTextActive: { color: C.onPrimary },
  sectionDivider: {
    marginTop: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.primary },
  textarea: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    minHeight: 80,
    textAlignVertical: 'top',
    outlineStyle: 'none',
  } as object,
  gpsBox: {
    backgroundColor: C.surfaceLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
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
    backgroundColor: C.wonBg,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  accuracyText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  gpsAddr: { fontSize: 13, fontWeight: '500', color: C.text },
  gpsCoords: { fontSize: 11, color: C.textMuted, fontVariant: ['tabular-nums'] } as object,
  photoBox: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surfaceLowest,
  },
  photoText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  photoHint: { fontSize: 10, fontWeight: '700', color: C.textLight, letterSpacing: 0.5, textTransform: 'uppercase' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 18,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: C.onPrimary },

  // Photo preview
  photoPreviewWrap: { marginTop: 12, gap: 8 },
  photoPreviewTitle: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  photoPreview: { width: '100%', height: 180, borderRadius: 10, backgroundColor: C.surfaceLow, borderWidth: 1, borderColor: C.border },
});

// Customer picker styles
const cp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: C.surfaceLowest, borderRadius: 16, width: '100%', maxWidth: 440, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 4, outlineStyle: 'none' } as object,
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text },
  itemContact: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  empty: { padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 },
});

// Visit detail styles
const vd = StyleSheet.create({
  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  custName: { fontSize: 17, fontWeight: '800', color: C.text },
  custContact: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, flex: 1 },
  detailValue: { fontSize: 13, color: C.text, flex: 2, textAlign: 'right' },
  remarks: { fontSize: 14, color: C.text, lineHeight: 21, marginTop: 8, padding: 14, backgroundColor: C.surfaceLow, borderRadius: 10 },
});
