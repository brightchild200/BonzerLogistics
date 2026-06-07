import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS } from '@/lib/types';

export function FormModal({ visible, title, onClose, onSubmit, submitLabel = 'Save', loading, children }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>{children}</ScrollView>
            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSubmit} style={[styles.submitBtn, loading && styles.disabled]} disabled={loading}>
                <Text style={styles.submitText}>{loading ? 'Saving...' : submitLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function FormField({ label, children, required, style }: any) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export function FormInput({ value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize, numberOfLines }: any) {
  return (
    <TextInput
      style={[styles.input, multiline && { height: (numberOfLines || 3) * 22, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  );
}

export function SelectButtons({ options, value, onChange }: any) {
  return (
    <View style={styles.selectRow}>
      {options.map((opt: any) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[styles.selectOpt, value === opt.value && styles.selectOptActive]}
        >
          <Text style={[styles.selectOptText, value === opt.value && styles.selectOptTextActive]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  kav: { width: '100%', maxWidth: 520 },
  sheet: { backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden', maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 6, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelBtn: { flex: 1, height: 40, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  submitBtn: { flex: 2, height: 40, borderRadius: 6, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.7 },
  submitText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  required: { color: COLORS.danger },
  input: { height: 40, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.white },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selectOpt: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  selectOptActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  selectOptText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  selectOptTextActive: { color: COLORS.primary, fontWeight: '600' },
});
