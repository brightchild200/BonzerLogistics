import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Platform, TextInput } from 'react-native';
import { Search, Users, Phone, Mail, BadgeCheck, Building2, MapPin } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, type SalesPersonRow } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/Badge';
import { mapSalesPerson } from '@/lib/salesperson-mappers';

export default function TeamScreen() {
  const [people, setPeople] = useState<SalesPersonRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function loadPeople() {
    const { data } = await supabase.from('sales_persons').select('*').order('created_at', { ascending: false });
    setPeople(data || []);
  }

  useFocusEffect(
    useCallback(() => {
      loadPeople();
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadPeople();
    setRefreshing(false);
  }

  const activeCount = people.filter((person) => person.is_active !== false).length;
  const filtered = useMemo(
    () =>
      people.filter((person) =>
        [person.name, person.email, person.department, person.designation, person.mobile]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [people, search],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.pageTitle}>Sales Team</Text>
          <Text style={styles.pageSub}>{activeCount} active</Text>
        </View>
        <View style={styles.countChip}>
          <Users size={16} color={COLORS.primary} />
          <Text style={styles.countChipText}>{people.length} total</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search team members..." placeholderTextColor={COLORS.textLight} />
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon={<Users size={28} color={COLORS.textLight} />} title="No team members found" subtitle="Try a different search or sync the sales_persons table." />
        ) : (
          filtered.map((person) => {
            const card = mapSalesPerson(person);
            return (
              <View key={person.id} style={styles.personCard}>
                <View style={styles.personHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{card.initials}</Text>
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{card.name}</Text>
                    <Text style={styles.personSubtitle}>{card.subtitle}</Text>
                    <Text style={styles.personMeta}>{card.meta}</Text>
                  </View>
                  <StatusBadge status={card.statusLabel} />
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaRow}>
                    <BadgeCheck size={13} color={COLORS.textMuted} />
                    <Text style={styles.metaText}>{person.designation || 'Designation not set'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Building2 size={13} color={COLORS.textMuted} />
                    <Text style={styles.metaText}>{person.department || 'Department not set'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Phone size={13} color={COLORS.textMuted} />
                    <Text style={styles.metaText}>{person.mobile || 'Mobile not set'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Mail size={13} color={COLORS.textMuted} />
                    <Text style={styles.metaText}>{person.email}</Text>
                  </View>
                </View>

                {person.address ? (
                  <View style={styles.addressRow}>
                    <MapPin size={13} color={COLORS.textMuted} />
                    <Text style={styles.addressText}>{person.address}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
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
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  countChipText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  scroll: { flex: 1 },
  content: { padding: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 42, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  personCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, padding: 14 },
  personHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  personInfo: { flex: 1, gap: 2 },
  personName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  personSubtitle: { fontSize: 12, color: COLORS.textMuted },
  personMeta: { fontSize: 11, color: COLORS.textLight },
  metaGrid: { gap: 8, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  addressText: { fontSize: 12, color: COLORS.textMuted, flex: 1, lineHeight: 18 },
});
