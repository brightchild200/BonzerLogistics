import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/types';
import { getStatusPresentation } from '@/lib/salesperson-mappers';

export function Badge({ label, color, bg }: any) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

export function LeadStatusBadge({ status }: { status: string }) {
  const config = getStatusPresentation(status);
  return <Badge label={config.label} color={config.color} bg={config.bg} />;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = getStatusPresentation(priority);
  return <Badge label={config.label} color={config.color} bg={config.bg} />;
}

export function StatusBadge({ status }: { status: string }) {
  const config = getStatusPresentation(status);
  return <Badge label={config.label} color={config.color} bg={config.bg} />;
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});
