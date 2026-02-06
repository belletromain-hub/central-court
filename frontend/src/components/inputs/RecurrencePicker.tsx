import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
interface RecurrenceValue {
  type: RecurrenceType;
  weekDays?: number[]; // 0=Mon..6=Sun
  monthDay?: number;
  endAfter?: number;
  endDate?: string;
}
interface Props {
  label?: string;
  value: RecurrenceValue;
  onChange: (val: RecurrenceValue) => void;
}

const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function RecurrencePicker({ label, value, onChange }: Props) {
  const setType = (type: RecurrenceType) => {
    onChange({ ...value, type, weekDays: type === 'weekly' ? (value.weekDays?.length ? value.weekDays : [0]) : undefined });
  };

  const toggleDay = (day: number) => {
    const current = value.weekDays || [];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    if (next.length === 0) return;
    onChange({ ...value, weekDays: next });
  };

  const setEndAfter = (n: number) => onChange({ ...value, endAfter: n, endDate: undefined });

  const options: { type: RecurrenceType; label: string }[] = [
    { type: 'none', label: 'Ne pas répéter' },
    { type: 'daily', label: 'Tous les jours' },
    { type: 'weekly', label: 'Toutes les semaines' },
    { type: 'monthly', label: 'Tous les mois' },
  ];

  const getDayNames = () => {
    if (!value.weekDays || value.weekDays.length === 0) return '';
    const names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    return value.weekDays.map(d => names[d]).join(' et ');
  };

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}

      {options.map((opt) => {
        const active = value.type === opt.type;
        return (
          <View key={opt.type}>
            <TouchableOpacity style={[s.optionCard, active && s.optionCardActive]} onPress={() => setType(opt.type)}>
              <View style={[s.radio, active && s.radioActive]}>
                {active && <View style={s.radioDot} />}
              </View>
              <View style={s.optionContent}>
                <Text style={[s.optionLabel, active && s.optionLabelActive]}>{opt.label}</Text>
                {active && opt.type === 'weekly' && (
                  <Text style={s.optionSub}>Tous les {getDayNames()}</Text>
                )}
              </View>
            </TouchableOpacity>

            {active && opt.type === 'weekly' && (
              <View style={s.daysRow}>
                {DAYS_SHORT.map((d, i) => {
                  const sel = (value.weekDays || []).includes(i);
                  return (
                    <TouchableOpacity key={i} style={[s.dayBtn, sel && s.dayBtnActive]} onPress={() => toggleDay(i)}>
                      <Text style={[s.dayBtnText, sel && s.dayBtnTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {value.type !== 'none' && (
        <View style={s.endSection}>
          <Text style={s.endLabel}>Fin après :</Text>
          <View style={s.endRow}>
            {[5, 10, 20].map(n => (
              <TouchableOpacity key={n} style={[s.endBtn, value.endAfter === n && s.endBtnActive]} onPress={() => setEndAfter(n)}>
                <Text style={[s.endBtnText, value.endAfter === n && s.endBtnTextActive]}>{n} fois</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.endBtn, !value.endAfter && s.endBtnActive]} onPress={() => onChange({ ...value, endAfter: undefined, endDate: undefined })}>
              <Text style={[s.endBtnText, !value.endAfter && s.endBtnTextActive]}>Jamais</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  optionCardActive: { borderColor: '#2D5016', backgroundColor: '#F0F5EB' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#2D5016' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2D5016' },
  optionContent: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '500', color: '#374151' },
  optionLabelActive: { fontWeight: '600', color: '#2D5016' },
  optionSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  daysRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20 },
  dayBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  dayBtnActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  dayBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dayBtnTextActive: { color: '#fff' },
  endSection: { marginTop: 8 },
  endLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  endRow: { flexDirection: 'row', gap: 8 },
  endBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  endBtnActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  endBtnText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  endBtnTextActive: { color: '#fff' },
});
