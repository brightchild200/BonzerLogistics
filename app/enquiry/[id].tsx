  import React, { useState, useEffect, useCallback } from 'react';
  import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    TextInput,
    Alert,
    Share,
  } from 'react-native';
  import { useRouter, useLocalSearchParams } from 'expo-router';
  import {
    ArrowLeft,
    Edit2,
    Save,
    X,
    Printer,
    User,
    Building,
    Package,
    Truck,
    FileText,
    DollarSign,
    MessageSquare,
    Clock,
    Plus,
    Trash2,
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
    internal_notes: string | null;
    created_at: string;
    updated_at: string;
  };

  type ChargeRow = {
    id: string;
    description: string;
    amount: string;
    currency: string;
  };

  type ActivityRow = {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    user: string;
  };

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
    internal_notes: string;
  };

  const INITIAL_FORM: FormState = {
    enq_date: '',
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
    internal_notes: '',
  };

  const MODE_OPTIONS = [
    { id: 1, label: 'Sea Export' },
    { id: 2, label: 'Sea Import' },
    { id: 3, label: 'Air Export' },
    { id: 4, label: 'Air Import' },
  ];

  const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];

  const CURRENCY_OPTIONS = ['USD', 'INR', 'EUR', 'GBP'];

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

  function formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  // ─── Inline Edit Components ──────────────────────────────────────────────────

  function InlineInput({
    value,
    onChangeText,
    editable,
    placeholder,
    keyboardType = 'default',
    multiline = false,
  }: {
    value: string;
    onChangeText: (v: string) => void;
    editable: boolean;
    placeholder?: string;
    keyboardType?: any;
    multiline?: boolean;
  }) {
    if (!editable) {
      return <Text style={styles.viewValue}>{value || '-'}</Text>;
    }
    return (
      <TextInput
        style={[styles.editInput, multiline && styles.editInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    );
  }

  function InlineSelect({
    value,
    options,
    onChange,
    editable,
    renderOption,
  }: {
    value: string;
    options: string[] | { id: number; label: string }[];
    onChange: (v: string) => void;
    editable: boolean;
    renderOption?: (opt: any) => string;
  }) {
    const displayValue = renderOption
      ? (options as any[]).find((opt) => opt.label === value)?.label ?? value
      : value;

    if (!editable) {
      return <Text style={styles.viewValue}>{displayValue || '-'}</Text>;
    }

    return (
      <View style={styles.selectWrapper}>
        {options.map((opt, index) => {
          const isObj = typeof opt === 'object' && opt !== null;
          const label = isObj && renderOption ? (opt as any).label : String(opt);
          const isActive = isObj
            ? (opt as any).label === value
            : opt === value;
          return (
            <TouchableOpacity
              key={isObj && (opt as any).id ? (opt as any).id : index}
              style={[styles.selectBtn, isActive && styles.selectBtnActive]}
              onPress={() => onChange(isObj && renderOption ? (opt as any).label : String(opt))}
            >
              <Text style={[styles.selectBtnText, isActive && styles.selectBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ─── Screen ───────────────────────────────────────────────────────────────────

  export default function EnquiryDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [enquiry, setEnquiry] = useState<EnquiryRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sessionError, setSessionError] = useState('');

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Charges & Activity (local state for demo - can be connected to DB later)
    const [charges, setCharges] = useState<ChargeRow[]>([
      { id: '1', description: 'Freight Charges', amount: '1500', currency: 'USD' },
      { id: '2', description: 'Documentation', amount: '150', currency: 'USD' },
    ]);
    const [activities, setActivities] = useState<ActivityRow[]>([
      { id: '1', action: 'Created', description: 'Enquiry created', timestamp: new Date().toISOString(), user: 'System' },
      { id: '2', action: 'Viewed', description: 'Enquiry viewed by user', timestamp: new Date().toISOString(), user: 'User' },
    ]);

    const set = useCallback((key: keyof FormState) => (val: string) => {
      setForm((f) => ({ ...f, [key]: val }));
      setHasChanges(true);
    }, []);

    // ── Data loading ──────────────────────────────────────────────────────────

    const fetchEnquiry = useCallback(async () => {
      if (!id) return;
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
        if (!session.salesperson && !hasRole(session.roles, 'admin')) {
          setSessionError('No salesperson profile is linked to this account yet.');
          setLoading(false);
          return;
        }

        setSessionError('');

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

        // For non-admin users, verify they have access
        if (!hasRole(session.roles, 'admin') && data.sales_person_id !== session.salesperson?.id) {
          setError('You do not have permission to view this enquiry');
          setLoading(false);
          return;
        }

        setEnquiry(data);
        setForm({
          enq_date: data.enq_date?.split('T')[0] ?? '',
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
          internal_notes: data.internal_notes ?? '',
        });
        dbg('fetchEnquiry → complete', { enquiryId: data.id });
      } catch (e: unknown) {
        err('fetchEnquiry → unexpected exception', e);
        setError('Failed to load enquiry details');
      } finally {
        setLoading(false);
      }
    }, [id]);

    useEffect(() => {
      fetchEnquiry();
    }, [fetchEnquiry]);

    // ── Actions ───────────────────────────────────────────────────────────────

    function handleEdit() {
      setIsEditing(true);
      setHasChanges(false);
    }

    function handleCancelEdit() {
      if (hasChanges) {
        Alert.alert(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to discard them?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                if (enquiry) {
                  setForm({
                    enq_date: enquiry.enq_date?.split('T')[0] ?? '',
                    customer_name: enquiry.customer_name ?? '',
                    customer_address: enquiry.customer_address ?? '',
                    customer_gst: enquiry.customer_gst ?? '',
                    shipper: enquiry.shipper ?? '',
                    cnee: enquiry.cnee ?? '',
                    mode_id: enquiry.mode_id?.toString() ?? '',
                    pol_country: enquiry.pol_country ?? '',
                    pol: enquiry.pol ?? '',
                    pod_country: enquiry.pod_country ?? '',
                    pod: enquiry.pod ?? '',
                    commodity: enquiry.commodity ?? '',
                    packages: enquiry.packages ?? '',
                    packages_unit: enquiry.packages_unit ?? 'CTN',
                    gross_weight: enquiry.gross_weight ?? '',
                    gross_weight_unit: enquiry.gross_weight_unit ?? 'KGS',
                    cbm: enquiry.cbm ?? '',
                    status: enquiry.status ?? 'Pending',
                    internal_notes: enquiry.internal_notes ?? '',
                  });
                }
                setIsEditing(false);
                setHasChanges(false);
              },
            },
          ]
        );
      } else {
        setIsEditing(false);
      }
    }

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
          internal_notes: form.internal_notes.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from('enquiries')
          .update(payload)
          .eq('id', id);

        if (updateErr) {
          setError('Failed to update enquiry: ' + updateErr.message);
          setSaving(false);
          return;
        }

        // Add activity log
        const newActivity: ActivityRow = {
          id: Date.now().toString(),
          action: 'Updated',
          description: 'Enquiry details updated',
          timestamp: new Date().toISOString(),
          user: 'Current User',
        };
        setActivities((prev) => [newActivity, ...prev]);

        setIsEditing(false);
        setHasChanges(false);
        fetchEnquiry();
        Alert.alert('Success', 'Enquiry updated successfully.');
      } catch (e: any) {
        setError(e?.message ?? 'An unexpected error occurred.');
      } finally {
        setSaving(false);
      }
    }

    function handlePrint() {
      // Create a simple print-friendly view using Share
      const printContent = `
  ENQUIRY DETAILS
  ${'='.repeat(50)}

  Enquiry No: ${enquiry?.enquiry_no || '-'}
  Date: ${formatDate(enquiry?.enq_date || enquiry?.created_at)}
  Status: ${enquiry?.status || 'Pending'}

  CUSTOMER INFORMATION
  ${'='.repeat(50)}
  Customer: ${enquiry?.customer_name || '-'}
  Address: ${enquiry?.customer_address || '-'}
  GST: ${enquiry?.customer_gst || '-'}

  SHIPMENT DETAILS
  ${'='.repeat(50)}
  Mode: ${MODE_OPTIONS.find((m) => m.id === enquiry?.mode_id)?.label || '-'}
  POL: ${enquiry?.pol_country} ${enquiry?.pol ? `(${enquiry.pol})` : ''}
  POD: ${enquiry?.pod_country} ${enquiry?.pod ? `(${enquiry.pod})` : ''}

  CARGO DETAILS
  ${'='.repeat(50)}
  Commodity: ${enquiry?.commodity || '-'}
  Packages: ${enquiry?.packages || '0'} ${enquiry?.packages_unit || ''}
  Weight: ${enquiry?.gross_weight || '0'} ${enquiry?.gross_weight_unit || ''}
  CBM: ${enquiry?.cbm || '0'}

  SHIPPER & CONSIGNEE
  ${'='.repeat(50)}
  Shipper: ${enquiry?.shipper || '-'}
  Consignee: ${enquiry?.cnee || '-'}
      `.trim();

      Share.share({
        message: printContent,
        title: `Enquiry ${enquiry?.enquiry_no || id}`,
      }).catch(() => {
        // Fallback for web
        if (typeof window !== 'undefined') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`<pre>${printContent}</pre>`);
            printWindow.print();
          }
        }
      });
    }

    // ── Charges Management ───────────────────────────────────────────────────

    function addCharge() {
      const newCharge: ChargeRow = {
        id: Date.now().toString(),
        description: '',
        amount: '',
        currency: 'USD',
      };
      setCharges((prev) => [...prev, newCharge]);
      setHasChanges(true);
    }

    function updateCharge(id: string, field: keyof ChargeRow, value: string) {
      setCharges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
      setHasChanges(true);
    }

    function deleteCharge(id: string) {
      setCharges((prev) => prev.filter((c) => c.id !== id));
      setHasChanges(true);
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
          <StatusBadge status={form.status || 'Pending'} />
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          {!isEditing ? (
            <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
              <Edit2 size={16} color={COLORS.text} />
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={handleSave}
                disabled={saving}
              >
                <Save size={16} color={COLORS.white} />
                <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleCancelEdit}>
                <X size={16} color={COLORS.text} />
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
            <Printer size={16} color={COLORS.text} />
            <Text style={styles.actionBtnText}>Print</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Basic Information Card */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <FileText size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Basic Information</Text>
              </View>
              <View style={styles.grid}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Enquiry No</Text>
                  <Text style={styles.viewValue}>{enquiry.enquiry_no || '-'}</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Enquiry Date</Text>
                  <InlineInput
                    value={form.enq_date}
                    onChangeText={set('enq_date')}
                    editable={isEditing}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Status</Text>
                <InlineSelect
                  value={form.status}
                  options={STATUS_OPTIONS}
                  onChange={set('status')}
                  editable={isEditing}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sales Person</Text>
                <Text style={styles.viewValue}>{enquiry.seals_person || '-'}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Created</Text>
                <Text style={styles.viewValue}>{formatDateTime(enquiry.created_at)}</Text>
              </View>
              {enquiry.updated_at && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Last Updated</Text>
                  <Text style={styles.viewValue}>{formatDateTime(enquiry.updated_at)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Customer Information Card */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <User size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Customer Information</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Customer Name</Text>
                <InlineInput
                  value={form.customer_name}
                  onChangeText={set('customer_name')}
                  editable={isEditing}
                  placeholder="Customer or company name"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Address</Text>
                <InlineInput
                  value={form.customer_address}
                  onChangeText={set('customer_address')}
                  editable={isEditing}
                  multiline
                  placeholder="Customer address"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>GST Number</Text>
                <InlineInput
                  value={form.customer_gst}
                  onChangeText={set('customer_gst')}
                  editable={isEditing}
                  placeholder="GSTIN"
                />
              </View>
            </View>
          </View>

          {/* Shipment Details Card */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Truck size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Shipment Details</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Mode</Text>
                <InlineSelect
                  value={MODE_OPTIONS.find((m) => m.id.toString() === form.mode_id)?.label ?? ''}
                  options={MODE_OPTIONS}
                  onChange={(label) => {
                    const found = MODE_OPTIONS.find((m) => m.label === label);
                    if (found) set('mode_id')(found.id.toString());
                  }}
                  editable={isEditing}
                  renderOption={(opt: any) => opt.label}
                />
              </View>
              <View style={styles.grid}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>POL Country</Text>
                  <InlineInput
                    value={form.pol_country}
                    onChangeText={set('pol_country')}
                    editable={isEditing}
                    placeholder="Country"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Port of Loading</Text>
                  <InlineInput
                    value={form.pol}
                    onChangeText={set('pol')}
                    editable={isEditing}
                    placeholder="POL"
                  />
                </View>
              </View>
              <View style={styles.grid}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>POD Country</Text>
                  <InlineInput
                    value={form.pod_country}
                    onChangeText={set('pod_country')}
                    editable={isEditing}
                    placeholder="Country"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Port of Destination</Text>
                  <InlineInput
                    value={form.pod}
                    onChangeText={set('pod')}
                    editable={isEditing}
                    placeholder="POD"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Cargo Details - part of Shipment */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Package size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Cargo Details</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Commodity</Text>
                <InlineInput
                  value={form.commodity}
                  onChangeText={set('commodity')}
                  editable={isEditing}
                  placeholder="Description of cargo"
                />
              </View>
              <View style={styles.grid}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Packages</Text>
                  <InlineInput
                    value={form.packages}
                    onChangeText={set('packages')}
                    editable={isEditing}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <InlineInput
                    value={form.packages_unit}
                    onChangeText={set('packages_unit')}
                    editable={isEditing}
                    placeholder="CTN"
                  />
                </View>
              </View>
              <View style={styles.grid}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Gross Weight</Text>
                  <InlineInput
                    value={form.gross_weight}
                    onChangeText={set('gross_weight')}
                    editable={isEditing}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <InlineInput
                    value={form.gross_weight_unit}
                    onChangeText={set('gross_weight_unit')}
                    editable={isEditing}
                    placeholder="KGS"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>CBM</Text>
                <InlineInput
                  value={form.cbm}
                  onChangeText={set('cbm')}
                  editable={isEditing}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            </View>
          </View>

          {/* Shipper & Consignee */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Building size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Shipper & Consignee</Text>
              </View>
              <View style={styles.grid}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Shipper</Text>
                  <InlineInput
                    value={form.shipper}
                    onChangeText={set('shipper')}
                    editable={isEditing}
                    placeholder="Shipper name"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Consignee</Text>
                  <InlineInput
                    value={form.cnee}
                    onChangeText={set('cnee')}
                    editable={isEditing}
                    placeholder="Consignee name"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Charges Card */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <DollarSign size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Charges</Text>
                {isEditing && (
                  <TouchableOpacity style={styles.addBtn} onPress={addCharge}>
                    <Plus size={14} color={COLORS.white} />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.chargesTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
                  <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
                  <Text style={[styles.tableHeaderText, styles.colCurrency]}>Currency</Text>
                  {isEditing && <View style={styles.colAction} />}
                </View>
                {charges.map((charge) => (
                  <View key={charge.id} style={styles.tableRow}>
                    {isEditing ? (
                      <>
                        <TextInput
                          style={[styles.tableInput, styles.colDesc]}
                          value={charge.description}
                          onChangeText={(v) => updateCharge(charge.id, 'description', v)}
                          placeholder="Description"
                        />
                        <TextInput
                          style={[styles.tableInput, styles.colAmount]}
                          value={charge.amount}
                          onChangeText={(v) => updateCharge(charge.id, 'amount', v)}
                          placeholder="0.00"
                          keyboardType="numeric"
                        />
                        <View style={[styles.selectWrapperMini, styles.colCurrency]}>
                          {CURRENCY_OPTIONS.map((curr) => (
                            <TouchableOpacity
                              key={curr}
                              style={[
                                styles.selectBtnMini,
                                charge.currency === curr && styles.selectBtnActive,
                              ]}
                              onPress={() => updateCharge(charge.id, 'currency', curr)}
                            >
                              <Text
                                style={[
                                  styles.selectBtnTextMini,
                                  charge.currency === curr && styles.selectBtnTextActive,
                                ]}
                              >
                                {curr}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[styles.colAction, styles.deleteBtn]}
                          onPress={() => deleteCharge(charge.id)}
                        >
                          <Trash2 size={14} color={COLORS.danger} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.tableCell, styles.colDesc]}>
                          {charge.description || '-'}
                        </Text>
                        <Text style={[styles.tableCell, styles.colAmount]}>
                          {charge.amount || '0.00'}
                        </Text>
                        <Text style={[styles.tableCell, styles.colCurrency]}>
                          {charge.currency}
                        </Text>
                        <View style={styles.colAction} />
                      </>
                    )}
                  </View>
                ))}
                {charges.length === 0 && (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No charges added yet</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Internal Notes Card */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MessageSquare size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Internal Notes</Text>
              </View>
              <InlineInput
                value={form.internal_notes}
                onChangeText={set('internal_notes')}
                editable={isEditing}
                multiline
                placeholder="Add internal notes here..."
              />
            </View>
          </View>

          {/* Activity Timeline Card */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Clock size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Activity Timeline</Text>
              </View>
              <View style={styles.timeline}>
                {activities.map((activity, index) => (
                  <View
                    key={activity.id}
                    style={[
                      styles.timelineItem,
                      index === activities.length - 1 && styles.timelineItemLast,
                    ]}
                  >
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={styles.timelineAction}>{activity.action}</Text>
                        <Text style={styles.timelineTime}>
                          {formatDateTime(activity.timestamp)}
                        </Text>
                      </View>
                      <Text style={styles.timelineDesc}>{activity.description}</Text>
                      <Text style={styles.timelineUser}>by {activity.user}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Job Link */}
          {enquiry.job_id && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <FileText size={18} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Linked Job</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Job ID</Text>
                  <Text style={styles.viewValue}>
                    JOB-{enquiry.job_id.toString().padStart(5, '0')}
                  </Text>
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

    // Header
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

    // Action Bar
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
    actionBtnPrimary: {
      backgroundColor: COLORS.primary,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.text,
    },
    actionBtnTextPrimary: {
      color: COLORS.white,
    },

    // Scroll & Content
    scroll: { flex: 1 },
    content: { padding: 16, gap: 16 },

    // Section & Card
    section: {
      gap: 8,
    },
    card: {
      backgroundColor: COLORS.white,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 16,
      gap: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.text,
      flex: 1,
    },

    // Fields
    field: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    viewValue: {
      fontSize: 14,
      color: COLORS.text,
      fontWeight: '500',
    },
    editInput: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: COLORS.text,
      backgroundColor: COLORS.white,
    },
    editInputMulti: {
      height: 80,
      textAlignVertical: 'top',
    },

    // Grid
    grid: {
      flexDirection: 'row',
      gap: 12,
    },
    grid2: {
      flexDirection: 'row',
      gap: 12,
    },

    // Select
    selectWrapper: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    selectBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: COLORS.gray50,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    selectBtnActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    selectBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.text,
    },
    selectBtnTextActive: {
      color: COLORS.white,
    },

    // Add Button
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: COLORS.success,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    addBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.white,
    },

    // Charges Table
    chargesTable: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 8,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: COLORS.gray50,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    tableHeaderText: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.textMuted,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      alignItems: 'center',
    },
    tableCell: {
      fontSize: 13,
      color: COLORS.text,
    },
    tableInput: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontSize: 13,
      backgroundColor: COLORS.white,
    },
    colDesc: {
      flex: 2,
    },
    colAmount: {
      flex: 1,
    },
    colCurrency: {
      flex: 1,
    },
    colAction: {
      width: 32,
      alignItems: 'center',
    },
    deleteBtn: {
      justifyContent: 'center',
      padding: 4,
    },
    emptyRow: {
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: COLORS.textMuted,
    },
    selectWrapperMini: {
      flexDirection: 'row',
      gap: 2,
    },
    selectBtnMini: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: COLORS.gray50,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    selectBtnTextMini: {
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.text,
    },

    // Timeline
    timeline: {
      gap: 0,
    },
    timelineItem: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    timelineItemLast: {
      borderBottomWidth: 0,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: COLORS.primary,
      marginTop: 4,
    },
    timelineContent: {
      flex: 1,
      gap: 2,
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timelineAction: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.text,
    },
    timelineTime: {
      fontSize: 11,
      color: COLORS.textMuted,
    },
    timelineDesc: {
      fontSize: 13,
      color: COLORS.text,
    },
    timelineUser: {
      fontSize: 11,
      color: COLORS.textMuted,
    },
  });

  // ─── Print Styles (for @media print) ───────────────────────────────────────
  // These would typically be in a separate CSS file for web, but React Native
  // doesn't support @media print directly. The handlePrint function provides
  // a workaround using Share or a new window for printing.