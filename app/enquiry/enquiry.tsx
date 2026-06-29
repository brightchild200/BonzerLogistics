import React, { useMemo, useState, useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ClipboardPlus, Send, Loader, Search, Plus, X } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/types';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { hasRole } from '@/lib/permissions';
import SearchModal from "../../components/SearchModal";

type ModeMasterRow = {
  id: number;
  mode_name: string;
  mode_code: string;
  port_type: 'AIR' | 'SEA' | null;
  requires_ports: boolean;
};

type CustomerMasterRow = {
  id: number;
  name: string;
  address: string | null;
  gst: string | null;
};

type ShipperMasterRow = {
  id: number;
  name: string;
  address: string | null;
  gst: string | null;
};

type ConsigneeMasterRow = {
  id: number;
  name: string;
  address: string | null;
  gst: string | null;
};

type PortRow = {
  id: number;
  country_name: string;
  location_name: string;
  location_type: "AIR" | "SEA";
  code: string;
};


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
  // usd_exchange_rate: string;
  // eur_exchange_rate: string;
  // gbp_exchange_rate: string;
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
      // usd_exchange_rate: '0.00',
      // eur_exchange_rate: '0.00',
      // gbp_exchange_rate: '0.00',
      status: 'Pending',
      cancel_remark: '',
      job_id: null,
    }),
    [],
  );

  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [loadingEnquiryNo, setLoadingEnquiryNo] = useState(true);

  const [MODE_OPTIONS, setMODE_OPTIONS] = useState<ModeMasterRow[]>([]);


  const [PORT_COUNTRIES, setPORT_COUNTRIES] = useState<string[]>([]);
  const [PORTS, setPORTS] = useState<PortRow[]>([]);

  const [polCountryModalVisible, setPolCountryModalVisible] = useState(false);
  const [polCountrySearch, setPolCountrySearch] = useState("");

  const [polModalVisible, setPolModalVisible] = useState(false);
  const [polSearch, setPolSearch] = useState("");

  const [podCountryModalVisible, setPodCountryModalVisible] = useState(false);
  const [podCountrySearch, setPodCountrySearch] = useState("");

  const [podModalVisible, setPodModalVisible] = useState(false);
  const [podSearch, setPodSearch] = useState("");

  const [POD_PORTS, setPOD_PORTS] = useState<PortRow[]>([]);

  const [SHIPPERS, setSHIPPERS] = useState<ShipperMasterRow[]>([]);
  const [shipperModalVisible, setShipperModalVisible] = useState(false);
  const [shipperQuery, setShipperQuery] = useState("");

  const [CONSIGNEES, setCONSIGNEES] = useState<ConsigneeMasterRow[]>([]);
  const [consigneeModalVisible, setConsigneeModalVisible] = useState(false);
  const [consigneeQuery, setConsigneeQuery] = useState("");

  const selectedMode = MODE_OPTIONS.find(
    (m) => m.id === form.mode_id
  );

  const filteredCountries = PORT_COUNTRIES.filter((country) =>
    country.toLowerCase().includes(polCountrySearch.toLowerCase())
  );

  const filteredPorts = PORTS.filter((port) =>
    port.location_name
      .toLowerCase()
      .includes(polSearch.toLowerCase())
  );

  const filteredPodCountries = PORT_COUNTRIES.filter((country) =>
    country.toLowerCase().includes(podCountrySearch.toLowerCase())
  );

  const filteredPodPorts = POD_PORTS.filter((port) =>
    port.location_name
      .toLowerCase()
      .includes(podSearch.toLowerCase())
  );


  const [CUSTOMERS, setCUSTOMERS] = useState<CustomerMasterRow[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);

  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return CUSTOMERS;
    return CUSTOMERS.filter((c) => c.name?.toLowerCase().includes(q));
  }, [CUSTOMERS, customerQuery]);

  const customerExactMatch = useMemo(
    () => CUSTOMERS.some((c) => c.name?.toLowerCase() === customerQuery.trim().toLowerCase()),
    [CUSTOMERS, customerQuery],
  );

  const shipperExactMatch = SHIPPERS.some(
    (s) =>
      s.name.trim().toLowerCase() ===
      shipperQuery.trim().toLowerCase()
  );

  const consigneeExactMatch = CONSIGNEES.some(
    (c) =>
      c.name.trim().toLowerCase() ===
      consigneeQuery.trim().toLowerCase()
  );

  const filteredShippers = SHIPPERS.filter((s) =>
    s.name.toLowerCase().includes(shipperQuery.toLowerCase())
  );

  const filteredConsignees = CONSIGNEES.filter((c) =>
    c.name.toLowerCase().includes(consigneeQuery.toLowerCase())
  );

  function openCustomerModal() {
    setCustomerQuery(form.customer_name || '');
    setCustomerModalVisible(true);
  }

  function selectExistingCustomer(c: CustomerMasterRow) {
    setForm((p) => ({
      ...p,
      customer_id: c.id,
      customer_name: c.name,
      customer_address: c.address ?? p.customer_address,
      customer_gst: c.gst ?? p.customer_gst,
    }));
    setCustomerModalVisible(false);
    setCustomerQuery('');
  }

  function selectExistingShipper(
    shipper: ShipperMasterRow
  ) {
    setForm((prev) => ({
      ...prev,
      shipper_id: shipper.id,
      shipper: shipper.name,
    }));

    setShipperModalVisible(false);
  }

  function selectExistingConsignee(
    cnee: ConsigneeMasterRow
  ) {
    setForm((prev) => ({
      ...prev,
      cnee_id: cnee.id,
      cnee: cnee.name,
    }));

    setConsigneeModalVisible(false);
  }



  function addNewCustomerName() {
    const trimmed = customerQuery.trim();
    if (!trimmed) return;
    // Local-only: not written to customer_master, just used for this enquiry.
    setForm((p) => ({ ...p, customer_id: null, customer_name: trimmed }));
    setCustomerModalVisible(false);
    setCustomerQuery('');
  }

  function addNewShipperName() {
    const name = shipperQuery.trim();

    setForm((prev) => ({
      ...prev,
      shipper_id: null,
      shipper: name,
    }));

    setShipperModalVisible(false);
  }

  function addNewConsigneeName() {
    const name = consigneeQuery.trim();

    setForm((prev) => ({
      ...prev,
      cnee_id: null,
      cnee: name,
    }));

    setConsigneeModalVisible(false);
  }


  // Fetch masters (mode_master, customer_master, shipper_master, consignee_master) on component mount
  useEffect(() => {
    async function fetchMasters() {
      try {
        const { data: modes, error: modesErr } = await (supabase as any)
          .from('mode_master')
          .select('id, mode_name, mode_code, port_type, requires_ports')
          .order('id', { ascending: true });

        if (modesErr) throw modesErr;
        setMODE_OPTIONS((modes ?? []) as ModeMasterRow[]);

        const { data: customers, error: customersErr } = await (supabase as any)
          .from('customer_master')
          .select('id, name, address, gst')
          .order('name', { ascending: true });

        const { data: shippers, error: shippersErr } = await (supabase as any)
          .from("shipper_master")
          .select("id,name,address,gst")
          .order("name");

        if (shippersErr) throw shippersErr;

        setSHIPPERS((shippers ?? []) as ShipperMasterRow[]);


        const { data: consignees, error: consigneesErr } = await (supabase as any)
          .from("consignee_master")
          .select("id,name,address,gst")
          .order("name");

        if (consigneesErr) throw consigneesErr;

        setCONSIGNEES((consignees ?? []) as ConsigneeMasterRow[]);


        console.log('[customer_master] error:', customersErr);
        console.log('[customer_master] data:', customers);
        if (customersErr) throw customersErr;
        setCUSTOMERS((customers ?? []) as CustomerMasterRow[]);

      } catch (e) {
        console.log('[enquiry] Failed to fetch masters:', e);
      } finally {
        setLoadingMasters(false);
      }
    }

    fetchMasters();
  }, []);

  useEffect(() => {
    async function fetchCountries() {
      if (!selectedMode?.requires_ports) {
        setPORT_COUNTRIES([]);
        setPORTS([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("port_master")
        .select("country_name")
        .eq("location_type", selectedMode.port_type);

      if (error) {
        console.log(error);
        return;
      }

      const countries: string[] = [
        ...new Set(
          ((data ?? []) as { country_name: string }[]).map(
            (x) => x.country_name
          )
        ),
      ].sort();

      setPORT_COUNTRIES(countries);
    }

    fetchCountries();
  }, [selectedMode]);

  useEffect(() => {
    async function fetchPorts() {
      if (!form.pol_country || !selectedMode?.port_type) {
        setPORTS([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("port_master")
        .select("*")
        .eq("location_type", selectedMode.port_type)
        .eq("country_name", form.pol_country)
        .order("location_name");

      if (error) {
        console.log(error);
        return;
      }

      setPORTS((data ?? []) as PortRow[]);
    }

    fetchPorts();
  }, [form.pol_country, selectedMode]);

  useEffect(() => {
    async function fetchPodPorts() {
      if (!form.pod_country || !selectedMode?.port_type) {
        setPOD_PORTS([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("port_master")
        .select("*")
        .eq("location_type", selectedMode.port_type)
        .eq("country_name", form.pod_country)
        .order("location_name");

      if (error) {
        console.log(error);
        return;
      }

      setPOD_PORTS((data ?? []) as PortRow[]);
    }

    fetchPodPorts();
  }, [form.pod_country, selectedMode]);


  // Fetch the next enquiry number on component mount
  useEffect(() => {
    async function fetchNextEnquiryNo() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        console.log('[enquiry] supabase.auth.getUser:', auth.user?.email ?? null);
        const session = await resolveSalespersonSession(auth.user?.email ?? null);
        console.log('[enquiry] resolveSalespersonSession:', { roles: session.roles, salesperson: session.salesperson });

        const salespersonId = session.salesperson?.id ?? null;

        // Fetch next enquiry number from backend.
        // If we have a salesperson id, pass it along (e.g. for per-salesperson numbering).
        // Otherwise (e.g. admin with no linked salesperson row) still ask the backend
        // for the next number instead of giving up.
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        const url = salespersonId
          ? `${apiUrl}/api/enquiries/next-enquiry-no?sales_person_id=${salespersonId}`
          : `${apiUrl}/api/enquiries/next-enquiry-no`;

        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          setForm(prev => ({ ...prev, enquiry_no: data.enquiry_no }));
        } else {
          console.log('[enquiry] next-enquiry-no request failed with status', response.status);
        }
      } catch (e) {
        console.log('[enquiry] Failed to fetch enquiry no:', e);
      } finally {
        setLoadingEnquiryNo(false);
      }
    }

    fetchNextEnquiryNo();
  }, []);

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
        roles: session.roles,
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

      const isAdmin = hasRole(session.roles, 'admin');
      if (!isAdmin && !session.salesperson) {
        const errorMsg = 'No salesperson profile is linked to this account yet.';
        console.error('[enquiry] Error:', errorMsg);
        setError(errorMsg);
        return;
      }

      let customerId = form.customer_id;

      if (!customerId && form.customer_name.trim()) {
        const { data, error } = await (supabase as any).rpc(
          "get_or_create_customer",
          {
            p_name: form.customer_name,
            p_gst: form.customer_gst,
            p_address: form.customer_address,
            p_sales_person_id: isAdmin
              ? (form.sales_person_id ?? null)
              : (form.sales_person_id ?? session.salesperson?.id ?? null),
          }
        );
      
        if (error) {
          console.error("[customer] RPC error:", error);
          throw error;
        }
      
        customerId = data;
      }

      const payload = {
        enquiry_no: form.enquiry_no.trim() || null,
        company_id: form.company_id ?? 6,
        enq_date: form.enq_date ? form.enq_date : null,
        customer_id: customerId,
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
        // usd_exchange_rate: Number(form.usd_exchange_rate) || 0,
        // eur_exchange_rate: Number(form.eur_exchange_rate) || 0,
        // gbp_exchange_rate: Number(form.gbp_exchange_rate) || 0,
        status: form.status || 'Pending',
        cancel_remark: form.cancel_remark.trim() || null,
        job_id: form.job_id,
      };

      console.log('[enquiry] session used for insert', {
        roles: session.roles,
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
              <FieldLabel>Enquiry No {loadingEnquiryNo && '(Loading...)'}</FieldLabel>
              {loadingEnquiryNo ? (
                <View style={[styles.input, styles.inputDisabled, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <Input
                  value={form.enquiry_no}
                  onChangeText={(t) => setForm((p) => ({ ...p, enquiry_no: t }))}
                  placeholder="Auto-generated"
                  editable={false}
                />
              )}
            </View>
            <View style={styles.field}>
              <FieldLabel>Enquiry Date</FieldLabel>
              <Input value={form.enq_date} onChangeText={(t) => setForm((p) => ({ ...p, enq_date: t }))} placeholder="YYYY-MM-DD" />
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.field}>
              <FieldLabel>Customer *</FieldLabel>
              {loadingMasters ? (
                <View style={[styles.input, styles.inputDisabled, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <TouchableOpacity style={styles.customerPickerField}
                  onPress={() => {
                    console.log(
                      '[Customers Retrieved]',
                      CUSTOMERS.map(c => c.name)
                    );
                    openCustomerModal();
                  }}>
                  <Text
                    style={[
                      styles.customerPickerText,
                      !form.customer_name && styles.customerPickerPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {form.customer_name || 'Search or add a customer'}
                  </Text>
                  <Search size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.field}>
              <FieldLabel>Customer GST</FieldLabel>
              <Input value={form.customer_gst} onChangeText={(t) => setForm((p) => ({ ...p, customer_gst: t }))} placeholder="GSTIN (optional)" />
            </View>
          </View>

          <SearchModal<CustomerMasterRow>
            visible={customerModalVisible}
            title="Select Customer"
            search={customerQuery}
            setSearch={setCustomerQuery}
            data={filteredCustomers}
            keyExtractor={(item) => String(item.id)}
            labelExtractor={(item) => item.name}
            subtitleExtractor={(item) => item.gst || ""}
            onSelect={selectExistingCustomer}
            onClose={() => setCustomerModalVisible(false)}
            showAddButton={
              customerQuery.trim().length > 0 && !customerExactMatch
            }
            addButtonText={`Add "${customerQuery.trim()}" as new customer`}
            onAddNew={addNewCustomerName}
          />


          <SearchModal<ShipperMasterRow>
            visible={shipperModalVisible}
            title="Select Shipper"
            search={shipperQuery}
            setSearch={setShipperQuery}
            data={filteredShippers}
            keyExtractor={(item) => String(item.id)}
            labelExtractor={(item) => item.name}
            subtitleExtractor={(item) => item.gst ?? ""}
            onSelect={selectExistingShipper}
            onClose={() => setShipperModalVisible(false)}
            showAddButton={
              shipperQuery.trim().length > 0 &&
              !shipperExactMatch
            }
            addButtonText={`Add "${shipperQuery.trim()}" as new shipper`}
            onAddNew={addNewShipperName}
          />

          <SearchModal<ConsigneeMasterRow>
            visible={consigneeModalVisible}
            title="Select Consignee"
            search={consigneeQuery}
            setSearch={setConsigneeQuery}
            data={filteredConsignees}
            keyExtractor={(item) => String(item.id)}
            labelExtractor={(item) => item.name}
            subtitleExtractor={(item) => item.gst ?? ""}
            onSelect={selectExistingConsignee}
            onClose={() => setConsigneeModalVisible(false)}
            showAddButton={
              consigneeQuery.trim().length > 0 &&
              !consigneeExactMatch
            }
            addButtonText={`Add "${consigneeQuery.trim()}" as new consignee`}
            onAddNew={addNewConsigneeName}
          />

          <SearchModal<string>
            visible={polCountryModalVisible}
            title="Select POL Country"
            search={polCountrySearch}
            setSearch={setPolCountrySearch}
            data={filteredCountries}
            keyExtractor={(item) => item}
            labelExtractor={(item) => item}
            onSelect={(country) => {
              setForm((prev) => ({
                ...prev,
                pol_country: country,
                pol: "",
                pod_country: "",
                pod: "",
              }));

              setPolCountryModalVisible(false);
            }}
            onClose={() => setPolCountryModalVisible(false)}
          />

          <SearchModal<PortRow>
            visible={polModalVisible}
            title="Select POL"
            search={polSearch}
            setSearch={setPolSearch}
            data={filteredPorts}
            keyExtractor={(item) => String(item.id)}
            labelExtractor={(item) => item.location_name}
            subtitleExtractor={(item) => item.code}
            onSelect={(port) => {
              setForm((prev) => ({
                ...prev,
                pol: port.location_name,
              }));

              setPolModalVisible(false);
            }}
            onClose={() => setPolModalVisible(false)}
          />

          <SearchModal<string>
            visible={podCountryModalVisible}
            title="Select POD Country"
            search={podCountrySearch}
            setSearch={setPodCountrySearch}
            data={filteredPodCountries}
            keyExtractor={(item) => item}
            labelExtractor={(item) => item}
            onSelect={(country) => {
              setForm((prev) => ({
                ...prev,
                pod_country: country,
                pod: "",
              }));

              setPodCountryModalVisible(false);
            }}
            onClose={() => setPodCountryModalVisible(false)}
          />

          <SearchModal<PortRow>
            visible={podModalVisible}
            title="Select POD"
            search={podSearch}
            setSearch={setPodSearch}
            data={filteredPodPorts}
            keyExtractor={(item) => String(item.id)}
            labelExtractor={(item) => item.location_name}
            subtitleExtractor={(item) => item.code}
            onSelect={(port) => {
              setForm((prev) => ({
                ...prev,
                pod: port.location_name,
              }));

              setPodModalVisible(false);
            }}
            onClose={() => setPodModalVisible(false)}
          />

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
              <TouchableOpacity
                style={styles.customerPickerField}
                onPress={() => setShipperModalVisible(true)}
              >
                <Text
                  style={[
                    styles.customerPickerText,
                    !form.shipper && styles.customerPickerPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {form.shipper || "Search or add a shipper"}
                </Text>

                <Search
                  size={16}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <FieldLabel>Cnee</FieldLabel>
              <TouchableOpacity
                style={styles.customerPickerField}
                onPress={() => setConsigneeModalVisible(true)}
              >
                <Text
                  style={[
                    styles.customerPickerText,
                    !form.cnee && styles.customerPickerPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {form.cnee || "Search or add a consignee"}
                </Text>

                <Search
                  size={16}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <FieldLabel>Mode *</FieldLabel>
            {loadingMasters ? (
              <View style={[styles.input, styles.inputDisabled, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : (
              <View style={styles.selectWrapper}>
                {MODE_OPTIONS.map((m) => {
                  const active = form.mode_id === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.selectBtn, active && styles.selectBtnActive]}
                      onPress={() => setForm((p) => ({ ...p, mode_id: m.id }))}
                    >
                      <Text style={[styles.selectBtnText, active && styles.selectBtnTextActive]}>
                        {m.mode_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.grid2}>
            <View style={styles.field}>
              <FieldLabel>POL Country</FieldLabel>
              <TouchableOpacity
                style={[
                  styles.customerPickerField,
                  !selectedMode?.requires_ports && styles.inputDisabled,
                ]}
                disabled={!selectedMode?.requires_ports}
                onPress={() => setPolCountryModalVisible(true)}
              >
                <Text
                  style={[
                    styles.customerPickerText,
                    !form.pol_country && styles.customerPickerPlaceholder,
                  ]}
                >
                  {form.pol_country || "Select Country"}
                </Text>

                <Search size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <FieldLabel>POL *</FieldLabel>
              <TouchableOpacity
                style={[
                  styles.customerPickerField,
                  !selectedMode?.requires_ports && styles.inputDisabled,
                ]}
                disabled={!selectedMode?.requires_ports}
                onPress={() => setPolModalVisible(true)}
              >
                <Text
                  style={[
                    styles.customerPickerText,
                    !form.pol && styles.customerPickerPlaceholder,
                  ]}
                >
                  {form.pol || "Select POL"}
                </Text>

                <Search size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>



          <View style={styles.grid2}>

            <View style={styles.field}>
              <FieldLabel>POD Country</FieldLabel>
              <TouchableOpacity
                style={[
                  styles.customerPickerField,
                  !selectedMode?.requires_ports && styles.inputDisabled,
                ]}
                disabled={!selectedMode?.requires_ports}
                onPress={() => setPodCountryModalVisible(true)}
              >
                <Text
                  style={[
                    styles.customerPickerText,
                    !form.pod_country && styles.customerPickerPlaceholder,
                  ]}
                >
                  {form.pod_country || "Select Country"}
                </Text>

                <Search size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <FieldLabel>POD *</FieldLabel>
              <TouchableOpacity
                style={[
                  styles.customerPickerField,
                  !selectedMode?.requires_ports && styles.inputDisabled,
                ]}
                disabled={!selectedMode?.requires_ports}
                onPress={() => setPodModalVisible(true)}
              >
                <Text
                  style={[
                    styles.customerPickerText,
                    !form.pod && styles.customerPickerPlaceholder,
                  ]}
                >
                  {form.pod || "Select POD"}
                </Text>

                <Search size={16} color={COLORS.textLight} />
              </TouchableOpacity>
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

          {/* <View style={styles.grid3}>
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
          </View> */}

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

  // Select buttons (mode/customer)
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

  // Customer searchable picker
  customerPickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    backgroundColor: COLORS.gray50,
    gap: 8,
  },
  customerPickerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  customerPickerPlaceholder: {
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    width: Platform.OS === 'web' ? 420 : '100%',
    maxHeight: '80%',
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.gray50,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addNewBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customerList: {
    maxHeight: 320,
  },
  customerListEmpty: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 13,
    paddingVertical: 16,
  },
  customerOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customerOptionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  customerOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  customerOptionTextActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});