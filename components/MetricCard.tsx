import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/types';

export function MetricCard({ title, value, subtitle, color = COLORS.primary, style, icon, trend }: any) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>{icon}</View>}
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {trend && (
        <View style={styles.trendRow}>
          <Text style={[styles.trend, { color: trend.positive ? COLORS.success : COLORS.danger }]}>{trend.positive ? '+' : ''}{trend.value}</Text>
          <Text style={styles.trendLabel}> vs last week</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  value: { fontSize: 28, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 12, color: COLORS.textMuted },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  trend: { fontSize: 12, fontWeight: '600' },
  trendLabel: { fontSize: 12, color: COLORS.textMuted },
});
