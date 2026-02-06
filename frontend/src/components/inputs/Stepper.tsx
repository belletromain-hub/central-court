import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  quickValues?: number[];
  unit?: string;
}

export default function Stepper({ label, value, onChange, min = 0, max = 100, step = 1, quickValues, unit }: Props) {
  const dec = () => { if (value - step >= min) onChange(value - step); };
  const inc = () => { if (value + step <= max) onChange(value + step); };

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={s.stepperRow}>
        <TouchableOpacity style={[s.btn, value <= min && s.btnDisabled]} onPress={dec} disabled={value <= min}>
          <Text style={[s.btnText, value <= min && s.btnTextDisabled]}>−</Text>
        </TouchableOpacity>
        <View style={s.valueBox}>
          <Text style={s.valueText}>{value}{unit ? ` ${unit}` : ''}</Text>
        </View>
        <TouchableOpacity style={[s.btn, value >= max && s.btnDisabled]} onPress={inc} disabled={value >= max}>
          <Text style={[s.btnText, value >= max && s.btnTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
      {quickValues && quickValues.length > 0 && (
        <View style={s.quickRow}>
          {quickValues.map((qv, i) => (
            <TouchableOpacity key={i} style={[s.quickBtn, value === qv && s.quickBtnActive]} onPress={() => onChange(qv)}>
              <Text style={[s.quickText, value === qv && s.quickTextActive]}>{qv}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 10 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  btn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#2D5016', justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { backgroundColor: '#E5E7EB' },
  btnText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  btnTextDisabled: { color: '#9CA3AF' },
  valueBox: { minWidth: 80, alignItems: 'center' },
  valueText: { fontSize: 32, fontWeight: '800', color: '#111827' },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 4 },
  quickBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  quickBtnActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  quickText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  quickTextActive: { color: '#fff' },
});
