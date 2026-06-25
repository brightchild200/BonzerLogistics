import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, ChevronDown } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  enq_date: string;
  customer_name: string;
  customer_address: string;
  customer_gst: string;
  shipper: string;
  cnee: string;
  mode_id: string;
  pol_country: string;
  pol: string;
  pod_country: string;
  pod: string;
  commodity: string;
  packages: string;
  packages_unit: string;
  gross_weight: string;
  gross_weight_unit: string;
  cbm: string;
  status: string;
};

const INITIAL_FORM: FormState = {
  enq_date: new Date().toISOString().split('T')[0],
  customer_name: '',
  customer_address: '',
  customer_gst: '',
  shipper: '',
  cnee: '',
  mode_id: '',
  pol_country: '',
  pol: '',
  pod_country: '',
  pod: '',
  commodity: '',
  packages: '',
  packages_unit: 'CTN',
  gross_weight: '',
  gross_weight_unit: 'KGS',
  cbm: '',
  status: 'Pending',
};

const MODE_OPTIONS = [
  { id: 1, label: 'Sea Export' },
  { id: 2, label: 'Sea Import' },
  { id: 3, label: 'Air Export' },
  { id: 4, label: 'Air Import' },
];

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  editable = true,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMulti, !editable && styles.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      editable={editable}
    />
  );
}

function SelectButtons({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.selectRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.selectBtn, value === opt && styles.selectBtnActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.selectBtnText, value === opt && styles.selectBtnTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EnquiryFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [enquiryNo, setEnquiryNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ── Load existing enquiry for edit ────────────────────────────────────────

  useEffect(() => {
    if (isEdit) {
      loadEnquiry();
    } else {
      fetchNextEnquiryNo();
    }
  }, [id]);

  async function fetchNextEnquiryNo() {
    try {
      const { data } = await supabase
        .from('enquiries')
        .select('enquiry_no')
        .not('enquiry_no', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let next = 1;
      if (data?.enquiry_no) {
        const match = data.enquiry_no.match(/ENQ-(\d+)/);
        if (match) next = parseInt(match[1], 10) + 1;
      }
      setEnquiryNo(`ENQ-${next.toString().padStart(6, '0')}`);
    } catch {
      setEnquiryNo('ENQ-000001');
    }
  }

  async function loadEnquiry() {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('enquiries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !data) {
        setError('Failed to load enquiry.');
        setLoading(false);
        return;
      }

      setEnquiryNo(data.enquiry_no || '');
      setForm({
        enq_date: data.enq_date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
        customer_name: data.customer_name ?? '',
        customer_address: data.customer_address ?? '',
        customer_gst: data.customer_gst ?? '',
        shipper: data.shipper ?? '',
        cnee: data.cnee ?? '',
        mode_id: data.mode_id?.toString() ?? '',
        pol_country: data.pol_country ?? '',
        pol: data.pol ?? '',
        pod_country: data.pod_country ?? '',
        pod: data.pod ?? '',
        commodity: data.commodity ?? '',
        packages: data.packages ?? '',
        packages_unit: data.packages_unit ?? 'CTN',
        gross_weight: data.gross_weight ?? '',
        gross_weight_unit: data.gross_weight_unit ?? 'KGS',
        cbm: data.cbm ?? '',
        status: data.status ?? 'Pending',
      });
    } catch {
      setError('Failed to load enquiry.');
    } finally {
      setLoading(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!form.mode_id) {
      setError('Please select a mode.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: auth } = await supabase.auth.getUser();
      const session = await resolveSalespersonSession(auth.user?.email ?? null);

      if (!session.salesperson) {
        setError('No salesperson profile linked to this account.');
        setSaving(false);
        return;
      }

      const payload = {
        enq_date: form.enq_date || new Date().toISOString().split('T')[0],
        customer_name: form.customer_name.trim(),
        customer_address: form.customer_address.trim() || null,
        customer_gst: form.customer_gst.trim() || null,
        shipper: form.shipper.trim() || null,
        cnee: form.cnee.trim() || null,
        mode_id: form.mode_id ? Number(form.mode_id) : null,
        pol_country: form.pol_country.trim() || null,
        pol: form.pol.trim() || null,
        pod_country: form.pod_country.trim() || null,
        pod: form.pod.trim() || null,
        commodity: form.commodity.trim() || null,
        packages: form.packages.trim() || null,
        packages_unit: form.packages_unit.trim() || null,
        gross_weight: form.gross_weight.trim() || null,
        gross_weight_unit: form.gross_weight_unit.trim() || null,
        cbm: form.cbm.trim() || null,
        status: form.status,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error: updateErr } = await supabase
          .from('enquiries')
          .update(payload)
          .eq('id', id);

        if (updateErr) {
          setError('Failed to update enquiry: ' + updateErr.message);
          setSaving(false);
          return;
        }
        Alert.alert('Success', 'Enquiry updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error: insertErr } = await supabase.from('enquiries').insert({
          ...payload,
          enquiry_no: enquiryNo,
          sales_person_id: session.salesperson.id,
        });

        if (insertErr) {
          setError('Failed to create enquiry: ' + insertErr.message);
          setSaving(false);
          return;
        }
        Alert.alert('Success', 'Enquiry created successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      setError(e?.message ?? 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Enquiry' : 'New Enquiry'}</Text>
          {enquiryNo ? (
            <Text style={styles.headerSub}>{enquiryNo}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={16} color={COLORS.white} />
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Enquiry Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enquiry Information</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <FieldLabel>Enquiry Date</FieldLabel>
              <Input value={form.enq_date} onChangeText={set('enq_date')} placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.field}>
              <FieldLabel required>Customer Name</FieldLabel>
              <Input value={form.customer_name} onChangeText={set('customer_name')} placeholder="Customer or company name" />
            </View>
            <View style={styles.field}>
              <FieldLabel>Customer Address</FieldLabel>
              <Input value={form.customer_address} onChangeText={set('customer_address')} placeholder="Address" multiline />
            </View>
            <View style={styles.field}>
              <FieldLabel>Customer GST</FieldLabel>
              <Input value={form.customer_gst} onChangeText={set('customer_gst')} placeholder="GSTIN" />
            </View>
            <View style={styles.field}>
              <FieldLabel>Status</FieldLabel>
              <SelectButtons options={STATUS_OPTIONS} value={form.status} onChange={set('status')} />
            </View>
          </View>
        </View>

        {/* Shipment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipment Details</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <FieldLabel required>Mode</FieldLabel>
              <SelectButtons
                options={MODE_OPTIONS.map((m) => m.label)}
                value={MODE_OPTIONS.find((m) => m.id.toString() === form.mode_id)?.label ?? ''}
                onChange={(label) => {
                  const found = MODE_OPTIONS.find((m) => m.label === label);
                  if (found) set('mode_id')(found.id.toString());
                }}
              />
            </View>
            <View style={styles.grid2}>
              <View style={[styles.field, { flex: 1 }]}>
                <FieldLabel>POL Country</FieldLabel>
                <Input value={form.pol_country} onChangeText={set('pol_country')} placeholder="Country" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <FieldLabel>Port of Loading</FieldLabel>
                <Input value={form.pol} onChangeText={set('pol')} placeholder="POL" />
              </View>
            </View>
            <View style={styles.grid2}>
              <View style={[styles.field, { flex: 1 }]}>
                <FieldLabel>POD Country</FieldLabel>
                <Input value={form.pod_country} onChangeText={set('pod_country')} placeholder="Country" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <FieldLabel>Port of Destination</FieldLabel>
                <Input value={form.pod} onChangeText={set('pod')} placeholder="POD" />
              </View>
            </View>
          </View>
        </View>

        {/* Shipper & Consignee */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipper & Consignee</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <FieldLabel>Shipper</FieldLabel>
              <Input value={form.shipper} onChangeText={set('shipper')} placeholder="Shipper name" />
            </View>
            <View style={styles.field}>
              <FieldLabel>Consignee</FieldLabel>
              <Input value={form.cnee} onChangeText={set('cnee')} placeholder="Consignee name" />
            </View>
          </View>
        </View>

        {/* Cargo Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cargo Details</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <FieldLabel>Commodity</FieldLabel>
              <Input value={form.commodity} onChangeText={set('commodity')} placeholder="Describe the cargo" />
            </View>
            <View style={styles.grid2}>
              <View style={[styles.field, { flex: 2 }]}>
                <FieldLabel>Packages</FieldLabel>
                <Input value={form.packages} onChangeText={set('packages')} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <FieldLabel>Unit</FieldLabel>
                <Input value={form.packages_unit} onChangeText={set('packages_unit')} placeholder="CTN" />
              </View>
            </View>
            <View style={styles.grid2}>
              <View style={[styles.field, { flex: 2 }]}>
                <FieldLabel>Gross Weight</FieldLabel>
                <Input value={form.gross_weight} onChangeText={set('gross_weight')} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <FieldLabel>Unit</FieldLabel>
                <Input value={form.gross_weight_unit} onChangeText={set('gross_weight_unit')} placeholder="KGS" />
              </View>
            </View>
            <View style={styles.field}>
              <FieldLabel>CBM</FieldLabel>
              <Input value={form.cbm} onChangeText={set('cbm')} placeholder="0.00" keyboardType="numeric" />
            </View>
          </View>
        </View>

        {/* Save button at bottom */}
        <TouchableOpacity
          style={[styles.bottomSaveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={18} color={COLORS.white} />
          <Text style={styles.bottomSaveBtnText}>{saving ? 'Saving...' : isEdit ? 'Update Enquiry' : 'Create Enquiry'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'web' ? 14 : 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },

  errorBox: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  errorText: { fontSize: 13, color: COLORS.danger },

  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  required: { color: COLORS.danger },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  inputDisabled: { backgroundColor: COLORS.gray50, color: COLORS.textMuted },

  grid2: { flexDirection: 'row', gap: 10 },

  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  selectBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  selectBtnTextActive: { color: COLORS.white },

  bottomSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  bottomSaveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
