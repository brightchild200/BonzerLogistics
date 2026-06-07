import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform, TextInput } from 'react-native';
import { BellRing, Search, MessageSquareText } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, type NotificationLogRow } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/Badge';
import { mapNotificationLog } from '@/lib/salesperson-mappers';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

export default function AlertsScreen() {
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function loadData() {
    const { data: auth } = await supabase.auth.getUser();
    const session = await resolveSalespersonSession(auth.user?.email ?? null);
    const query = supabase.from('notification_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (session.salesperson) {
      query.eq('sales_person_id', session.salesperson.id);
    }
    const { data } = await query;
    setLogs(data || []);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const filtered = useMemo(
    () =>
      logs.filter((entry) =>
        [entry.channel, entry.recipient_phone, entry.provider, entry.message, entry.status]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [logs, search],
  );

  const sentCount = logs.filter((entry) => ['sent', 'delivered', 'success', 'processed'].includes((entry.status || '').toLowerCase())).length;
  const failedCount = logs.filter((entry) => ['failed', 'error', 'rejected'].includes((entry.status || '').toLowerCase())).length;

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.pageTitle}>Notification Log</Text>
          <Text style={styles.pageSub}>{logs.length} recent messages</Text>
        </View>
        <View style={styles.countChip}>
          <BellRing size={16} color={COLORS.primary} />
          <Text style={styles.countChipText}>{sentCount} sent</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{sentCount}</Text>
            <Text style={styles.statLabel}>Sent</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>{failedCount}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{logs.length - sentCount - failedCount}</Text>
            <Text style={styles.statLabel}>Other</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search notifications..." placeholderTextColor={COLORS.textLight} />
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon={<MessageSquareText size={28} color={COLORS.textLight} />} title="No notification logs" subtitle="Sent alerts and reminder history will appear here." />
        ) : (
          filtered.map((entry) => {
            const card = mapNotificationLog(entry);
            return (
              <View key={entry.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logIcon}>
                    <BellRing size={14} color={COLORS.info} />
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logTitle}>{card.title}</Text>
                    <Text style={styles.logMeta}>{card.subtitle}</Text>
                  </View>
                  <StatusBadge status={card.statusLabel} />
                </View>
                <Text style={styles.logMessage}>{entry.message}</Text>
                <View style={styles.logFooter}>
                  <Text style={styles.logFooterText}>{card.detail}</Text>
                  {entry.provider_message_id ? <Text style={styles.logFooterText}>Provider ID: {entry.provider_message_id}</Text> : null}
                </View>
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
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statChip: { flex: 1, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', paddingVertical: 10 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 42, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  logCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, padding: 14 },
  logHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  logIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.infoLight, alignItems: 'center', justifyContent: 'center' },
  logInfo: { flex: 1, gap: 2 },
  logTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  logMeta: { fontSize: 12, color: COLORS.textMuted },
  logMessage: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  logFooter: { marginTop: 10, gap: 4 },
  logFooterText: { fontSize: 11, color: COLORS.textLight },
});
