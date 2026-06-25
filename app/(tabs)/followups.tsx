import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Platform, TextInput } from 'react-native';
import { Plus, CalendarClock, CheckCircle, Circle, Trash2, Clock } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, type SalesFollowupRow } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { FormModal, FormField, FormInput, SelectButtons } from '@/components/FormModal';
import { StatusBadge } from '@/components/Badge';
import { mapSalesFollowup } from '@/lib/salesperson-mappers';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function FollowupsScreen() {
  const [followups, setFollowups] = useState<SalesFollowupRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    followup_at: new Date().toISOString().slice(0, 16),
    location_name: '',
    notes: '',
    status: 'scheduled',
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  async function loadData() {
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);

    const query = supabase.from('sales_followups').select('*').order('followup_at', { ascending: true });
    if (session.salesperson) {
      query.eq('sales_person_id', session.salesperson.id);
    }

    const { data } = await query;
    setFollowups(data || []);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function toggleStatus(followup: SalesFollowupRow) {
    const current = (followup.status || '').toLowerCase();
    const nextStatus = ['completed', 'complete', 'done', 'closed'].includes(current) ? 'scheduled' : 'completed';
    await supabase.from('sales_followups').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', followup.id);
    loadData();
  }

  async function deleteFollowup(id: number) {
    await supabase.from('sales_followups').delete().eq('id', id);
    loadData();
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);

    // Resolve salesperson id — works for both regular salesperson and admin users
    let salespersonId: number | null = session.salesperson?.id ?? null;
    if (!salespersonId && session.appUser) {
      const { data: spRow } = await supabase
        .from('sales_persons')
        .select('id')
        .eq('user_id', session.appUser.id)
        .maybeSingle();
      salespersonId = spRow?.id ?? null;
    }

    if (!salespersonId) {
      console.warn('[handleSave] No salesperson record found for this user.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('sales_followups').insert({
      sales_person_id: salespersonId,
      title: form.title.trim(),
      followup_at: new Date(form.followup_at).toISOString(),
      location_name: form.location_name.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    } as any);

    if (error) {
      console.error('[handleSave] Insert failed:', error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    setForm({
      title: '',
      followup_at: new Date().toISOString().slice(0, 16),
      location_name: '',
      notes: '',
      status: 'scheduled',
    });
    loadData();
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const filtered = useMemo(
    () =>
      followups.filter((followup) =>
        [followup.title, followup.location_name, followup.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [followups, search],
  );

  const pendingCount = followups.filter((followup) => !['completed', 'complete', 'done', 'closed'].includes((followup.status || '').toLowerCase())).length;
  const todayCount = followups.filter((followup) => !['completed', 'complete', 'done', 'closed'].includes((followup.status || '').toLowerCase()) && followup.followup_at.startsWith(new Date().toISOString().split('T')[0])).length;

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.pageTitle}>Follow-ups</Text>
          <Text style={styles.pageSub}>{pendingCount} pending</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={18} color={COLORS.white} />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{todayCount}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>{followups.filter((followup) => !['completed', 'complete', 'done', 'closed'].includes((followup.status || '').toLowerCase()) && new Date(followup.followup_at) < new Date()).length}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{followups.filter((followup) => ['completed', 'complete', 'done', 'closed'].includes((followup.status || '').toLowerCase())).length}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search follow-ups..." placeholderTextColor={COLORS.textLight} />
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon={<CalendarClock size={28} color={COLORS.textLight} />} title="No follow-ups" subtitle="Schedule your first follow-up from this tab." />
        ) : (
          filtered.map((followup) => {
            const card = mapSalesFollowup(followup);
            return (
              <View key={followup.id} style={styles.fuRow}>
                <TouchableOpacity style={styles.checkCircle} onPress={() => toggleStatus(followup)}>
                  {['completed', 'complete', 'done', 'closed'].includes((followup.status || '').toLowerCase()) ? <CheckCircle size={22} color={COLORS.success} /> : <Circle size={22} color={COLORS.textLight} />}
                </TouchableOpacity>
                <View style={styles.fuBody}>
                  <View style={styles.fuTitleRow}>
                    <Text style={[styles.fuTitle, ['completed', 'complete', 'done', 'closed'].includes((followup.status || '').toLowerCase()) && styles.fuCompleted]}>{card.title}</Text>
                    <StatusBadge status={card.statusLabel} />
                  </View>
                  <Text style={styles.fuSub}>{card.subtitle}</Text>
                  <View style={styles.fuMeta}>
                    <Clock size={11} color={COLORS.textMuted} />
                    <Text style={styles.fuTime}>{card.detail}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteFollowup(followup.id)}>
                  <Trash2 size={14} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <FormModal visible={showModal} title="Schedule Follow-up" onClose={() => setShowModal(false)} onSubmit={handleSave} loading={saving}>
        <FormField label="Title" required>
          <FormInput value={form.title} onChangeText={(v: string) => setForm((f) => ({ ...f, title: v }))} placeholder="Follow up call" />
        </FormField>
        <FormField label="Follow-up Time" required>
          <FormInput value={form.followup_at} onChangeText={(v: string) => setForm((f) => ({ ...f, followup_at: v }))} placeholder="2026-06-06T10:00" />
        </FormField>
        <FormField label="Location">
          <FormInput value={form.location_name} onChangeText={(v: string) => setForm((f) => ({ ...f, location_name: v }))} placeholder="Client office or site name" />
        </FormField>
        <FormField label="Status">
          <SelectButtons options={STATUS_OPTIONS} value={form.status} onChange={(v: string) => setForm((f) => ({ ...f, status: v }))} />
        </FormField>
        <FormField label="Notes">
          <FormInput value={form.notes} onChangeText={(v: string) => setForm((f) => ({ ...f, notes: v }))} placeholder="Details..." multiline numberOfLines={2} />
        </FormField>
      </FormModal>
    </View>
  );
}

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
  pageTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  pageSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  scroll: { flex: 1 },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statChip: { flex: 1, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', paddingVertical: 10 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  searchRow: { backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 42, justifyContent: 'center', marginBottom: 14 },
  searchInput: { fontSize: 14, color: COLORS.text },
  fuRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  checkCircle: { paddingTop: 2 },
  fuBody: { flex: 1, gap: 6 },
  fuTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  fuTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  fuCompleted: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  fuSub: { fontSize: 12, color: COLORS.textMuted },
  fuMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fuTime: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
});
