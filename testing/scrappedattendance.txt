import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ClipboardPlus, Send } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { resolveSalespersonSession } from '@/lib/salesperson-session';


type FormState = {
  enquiry_no: string;
  company_id: number | null;
  enq_date: string;
  customer_id: number | null;
  customer_name: string;
  customer_address: string;
  customer_gst: string;
  shipper_id: number | null;
  shipper: string;
  cnee_id: number | null;
  cnee: string;
  sales_person_id: number | null;
  seals_person: string;
  mode_id: number | null;
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
  usd_exchange_rate: string;
  eur_exchange_rate: string;
  gbp_exchange_rate: string;
  status: string;
  cancel_remark: string;
  job_id: number | null;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  editable?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      keyboardType={keyboardType}
      editable={editable}
    />
  );
}

export default function EnquiryScreen() {
  const router = useRouter();

  const initialState: FormState = useMemo(
    () => ({
      enquiry_no: '',
      company_id: 6,
      enq_date: new Date().toISOString().split('T')[0],
      customer_id: null,
      customer_name: '',
      customer_address: '',
      customer_gst: '',
      shipper_id: null,
      shipper: '',
      cnee_id: null,
      cnee: '',
      sales_person_id: null,
      seals_person: '',
      mode_id: null,
      pol_country: '',
      pol: '',
      pod_country: '',
      pod: '',
      commodity: '',
      packages: '',
      packages_unit: '',
      gross_weight: '',
      gross_weight_unit: '',
      cbm: '',
      usd_exchange_rate: '0.00',
      eur_exchange_rate: '0.00',
      gbp_exchange_rate: '0.00',
      status: 'Pending',
      cancel_remark: '',
      job_id: null,
    }),
    [],
  );

  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleSubmit() {
    console.log('[enquiry] Starting form submission');
    setError('');
    setSubmitting(true);

    try {
      // Validate required fields
      if (!form.customer_name.trim()) {
        throw new Error('Customer name is required');
      }

      if (!form.pol.trim()) {
        throw new Error('POL (Port of Loading) is required');
      }

      if (!form.pod.trim()) {
        throw new Error('POD (Port of Destination) is required');
      }

      console.log('[enquiry] Form validation passed');

      const { data: auth } = await supabase.auth.getUser();
      console.log('[enquiry] Auth user retrieved:', auth.user?.email ?? null);

      const session = await resolveSalespersonSession(auth.user?.email ?? null);
      console.log('[enquiry] Session resolved:', {
        role: session.appUser?.role ?? null,
        hasSalesperson: !!session.salesperson,
        salespersonId: session.salesperson?.id ?? null,
      });

      // Admin users can create enquiries without a sales_persons mapping.
      if (!session.appUser) {
        const errorMsg = 'Unable to resolve user profile from `users` table.';
        console.error('[enquiry] Error:', errorMsg);
        setError(errorMsg);
        return;
      }

      const isAdmin = session.appUser.role === 'admin';
      if (!isAdmin && !session.salesperson) {
        const errorMsg = 'No salesperson profile is linked to this account yet.';
        console.error('[enquiry] Error:', errorMsg);
        setError(errorMsg);
        return;
      }

      const payload = {
        enquiry_no: form.enquiry_no.trim() || null,
        company_id: form.company_id ?? 6,
        enq_date: form.enq_date ? form.enq_date : null,
        customer_id: form.customer_id,
        customer_name: form.customer_name.trim() || null,
        customer_address: form.customer_address.trim() || null,
        customer_gst: form.customer_gst.trim() || null,
        shipper_id: form.shipper_id,
        shipper: form.shipper.trim() || null,
        cnee_id: form.cnee_id,
        cnee: form.cnee.trim() || null,
        // RLS note: sales_person_policy compares (sales_person_id)::text = CURRENT_USER.
        // So for non-admin users, we must set sales_person_id to the CURRENT_USER value.
        // For now we keep mapped id; if your CURRENT_USER != salesperson.id, update backend policy.
        sales_person_id: isAdmin ? (form.sales_person_id ?? null) : (form.sales_person_id ?? session.salesperson?.id ?? null),
        seals_person: form.seals_person.trim() || null,
        mode_id: form.mode_id,
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
        usd_exchange_rate: Number(form.usd_exchange_rate) || 0,
        eur_exchange_rate: Number(form.eur_exchange_rate) || 0,
        gbp_exchange_rate: Number(form.gbp_exchange_rate) || 0,
        status: form.status || 'Pending',
        cancel_remark: form.cancel_remark.trim() || null,
        job_id: form.job_id,
      };

      console.log('[enquiry] session used for insert', {
        role: session.appUser?.role ?? null,
        hasSalesperson: !!session.salesperson,
        salespersonId: session.salesperson?.id ?? null,
      });
       console.log(payload);
      console.log('[enquiry] insert payload', payload);

      // NOTE: schema.ts currently doesn't include `enquiries`, so we cast to `any` to avoid TS blocking.
      const { error: insertError, data } = await (supabase as any)
        .from('enquiries')
        .insert(payload)
        .select()
        .maybeSingle();

      console.log('[enquiry] insert result', { hasError: !!insertError, insertError: insertError ?? null, inserted: data ?? null });

      if (insertError) {
        console.error('[enquiry] Database insert error:', insertError);
        setError(`Database error: ${insertError.message}`);
        return;
      }

      console.log('[enquiry] Successfully inserted data:', data);

      // reset form after successful insert
      setForm(initialState);
      router.back();
    } catch (e: any) {
      console.error('[enquiry] submit exception', e);
      const errorMsg = e?.message ?? 'Failed to create enquiry.';
      setError(errorMsg);
      console.error('[enquiry] Error message:', errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.topbarCopy}>
          <Text style={styles.title}>Enquiry</Text>
          <Text style={styles.subtitle}>New enquiry details</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <ClipboardPlus size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Enquiry Information</Text>
          </View>

          <View style={styles.grid2}>
            <View style={styles.field}>
              <FieldLabel>Enquiry No</FieldLabel>
              <Input value={form.enquiry_no} onChangeText={(t) => setForm((p) => ({ ...p, enquiry_no: t }))} placeholder="Auto / manual" />
            </View>
            <View style={styles.field}>
              <FieldLabel>Enquiry Date</FieldLabel>
              <Input value={form.enq_date} onChangeText={(t) => setForm((p) => ({ ...p, enq_date: t }))} placeholder="YYYY-MM-DD" />
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.field}>
              <FieldLabel>Customer Name *</FieldLabel>
              <Input value={form.customer_name} onChangeText={(t) => setForm((p) => ({ ...p, customer_name: t }))} placeholder="Customer" />
            </View>
            <View style={styles.field}>
              <FieldLabel>Customer GST</FieldLabel>
              <Input value={form.customer_gst} onChangeText={(t) => setForm((p) => ({ ...p, customer_gst: t }))} placeholder="GSTIN (optional)" />
            </View>
          </View>

          <View style={styles.field}>
            <FieldLabel>Customer Address</FieldLabel>
            <TextInput
              style={styles.inputMultiline}
              value={form.customer_address}
              onChangeText={(t) => setForm((p) => ({ ...p, customer_address: t }))}
              placeholder="Address"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.grid2}>
            <View style={styles.field}>
              <FieldLabel>Shipper</FieldLabel>
              <Input value={form.shipper} onChangeText={(t) => setForm((p) => ({ ...p, shipper: t }))} placeholder="Shipper name" />
            </View>
            <View style={styles.field}>
              <FieldLabel>Cnee</FieldLabel>
              <Input value={form.cnee} onChangeText={(t) => setForm((p) => ({ ...p, cnee: t }))} placeholder="Consignee name" />
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.field}>
              <FieldLabel>POL Country</FieldLabel>
              <Input value={form.pol_country} onChangeText={(t) => setForm((p) => ({ ...p, pol_country: t }))} placeholder="Country" />
            </View>
            <View style={styles.field}>
              <FieldLabel>POL *</FieldLabel>
              <Input value={form.pol} onChangeText={(t) => setForm((p) => ({ ...p, pol: t }))} placeholder="Port / location" />
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.field}>
              <FieldLabel>POD Country</FieldLabel>
              <Input value={form.pod_country} onChangeText={(t) => setForm((p) => ({ ...p, pod_country: t }))} placeholder="Country" />
            </View>
            <View style={styles.field}>
              <FieldLabel>POD *</FieldLabel>
              <Input value={form.pod} onChangeText={(t) => setForm((p) => ({ ...p, pod: t }))} placeholder="Port / location" />
            </View>
          </View>

          <View style={styles.field}>
            <FieldLabel>Commodity</FieldLabel>
            <Input value={form.commodity} onChangeText={(t) => setForm((p) => ({ ...p, commodity: t }))} placeholder="Commodity" />
          </View>

          <View style={styles.grid3}>
            <View style={styles.field}>
              <FieldLabel>Packages</FieldLabel>
              <Input value={form.packages} onChangeText={(t) => setForm((p) => ({ ...p, packages: t }))} placeholder="e.g. 100" keyboardType="numeric" />
            </View>
            <View style={styles.field}>
              <FieldLabel>Unit</FieldLabel>
              <Input value={form.packages_unit} onChangeText={(t) => setForm((p) => ({ ...p, packages_unit: t }))} placeholder="CTN" />
            </View>
            <View style={styles.field}>
              <FieldLabel>CBM</FieldLabel>
              <Input value={form.cbm} onChangeText={(t) => setForm((p) => ({ ...p, cbm: t }))} placeholder="m³" keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.field}>
              <FieldLabel>Gross Weight</FieldLabel>
              <Input value={form.gross_weight} onChangeText={(t) => setForm((p) => ({ ...p, gross_weight: t }))} placeholder="e.g. 1250" keyboardType="numeric" />
            </View>
            <View style={styles.field}>
              <FieldLabel>Weight Unit</FieldLabel>
              <Input value={form.gross_weight_unit} onChangeText={(t) => setForm((p) => ({ ...p, gross_weight_unit: t }))} placeholder="KGS" />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.grid3}>
            <View style={styles.field}>
              <FieldLabel>USD Rate</FieldLabel>
              <Input value={form.usd_exchange_rate} onChangeText={(t) => setForm((p) => ({ ...p, usd_exchange_rate: t }))} placeholder="0.00" keyboardType="numeric" />
            </View>
            <View style={styles.field}>
              <FieldLabel>EUR Rate</FieldLabel>
              <Input value={form.eur_exchange_rate} onChangeText={(t) => setForm((p) => ({ ...p, eur_exchange_rate: t }))} placeholder="0.00" keyboardType="numeric" />
            </View>
            <View style={styles.field}>
              <FieldLabel>GBP Rate</FieldLabel>
              <Input value={form.gbp_exchange_rate} onChangeText={(t) => setForm((p) => ({ ...p, gbp_exchange_rate: t }))} placeholder="0.00" keyboardType="numeric" />
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Error: {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <Text style={styles.primaryBtnText}>Saving...</Text> : <View style={styles.btnRow}><Send size={18} color={COLORS.white} /><Text style={styles.primaryBtnText}>Save Enquiry</Text></View>}
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 14 : 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.gray50, alignItems: 'center', justifyContent: 'center' },
  topbarCopy: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { marginTop: 2, fontSize: 12, color: COLORS.textMuted },
  content: { padding: 16 },
  card: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  label: { fontSize: 11, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, height: 42, paddingHorizontal: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.gray50 },
  inputDisabled: { opacity: 0.6 },
  inputMultiline: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.gray50, minHeight: 90 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 160 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  errorBox: { backgroundColor: COLORS.dangerLight, borderLeftWidth: 3, borderLeftColor: COLORS.danger, borderRadius: 10, padding: 10 },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
  primaryBtn: { height: 52, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});