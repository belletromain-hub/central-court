import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';

interface Shortcut { label: string; value: { hour: number; minute: number }; }
interface Props {
  label?: string;
  value?: { hour: number; minute: number };
  onChange: (time: { hour: number; minute: number }) => void;
  shortcuts?: Shortcut[];
  commonTimes?: { hour: number; minute: number }[];
  minuteStep?: number;
}

const pad = (n: number) => n.toString().padStart(2, '0');

export default function FluidTimePicker({ label, value, onChange, shortcuts, commonTimes, minuteStep = 15 }: Props) {
  const now = new Date();
  const currentHour = value?.hour ?? now.getHours();
  const currentMinute = value?.minute ?? Math.round(now.getMinutes() / minuteStep) * minuteStep;

  const defaultShortcuts: Shortcut[] = shortcuts || [
    { label: 'Maintenant', value: { hour: now.getHours(), minute: Math.round(now.getMinutes() / 15) * 15 } },
    { label: 'Dans 1h', value: { hour: (now.getHours() + 1) % 24, minute: 0 } },
    { label: 'Ce soir', value: { hour: 18, minute: 0 } },
  ];

  const defaultCommon = commonTimes || [
    { hour: 9, minute: 0 }, { hour: 10, minute: 0 }, { hour: 12, minute: 0 },
    { hour: 14, minute: 0 }, { hour: 16, minute: 0 }, { hour: 18, minute: 0 },
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  const isActive = (h: number, m: number) => value && value.hour === h && value.minute === m;
  const isShortcutActive = (sc: Shortcut) => value && value.hour === sc.value.hour && value.minute === sc.value.minute;

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.shortcuts}>
        {defaultShortcuts.map((sc, i) => (
          <TouchableOpacity key={i} style={[s.chip, isShortcutActive(sc) && s.chipActive]} onPress={() => onChange(sc.value)}>
            <Text style={[s.chipText, isShortcutActive(sc) && s.chipTextActive]}>{sc.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.pickerRow}>
        <View style={s.pickerCol}>
          <Text style={s.pickerLabel}>Heure</Text>
          <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
            {hours.map(h => (
              <TouchableOpacity key={h} style={[s.pickerItem, currentHour === h && s.pickerItemActive]} onPress={() => onChange({ hour: h, minute: currentMinute })}>
                <Text style={[s.pickerItemText, currentHour === h && s.pickerItemTextActive]}>{pad(h)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <Text style={s.separator}>:</Text>
        <View style={s.pickerCol}>
          <Text style={s.pickerLabel}>Min</Text>
          <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
            {minutes.map(m => (
              <TouchableOpacity key={m} style={[s.pickerItem, currentMinute === m && s.pickerItemActive]} onPress={() => onChange({ hour: currentHour, minute: m })}>
                <Text style={[s.pickerItemText, currentMinute === m && s.pickerItemTextActive]}>{pad(m)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <Text style={s.commonLabel}>Heures courantes</Text>
      <View style={s.commonRow}>
        {defaultCommon.map((t, i) => (
          <TouchableOpacity key={i} style={[s.commonBtn, isActive(t.hour, t.minute) && s.commonBtnActive]} onPress={() => onChange(t)}>
            <Text style={[s.commonBtnText, isActive(t.hour, t.minute) && s.commonBtnTextActive]}>{pad(t.hour)}:{pad(t.minute)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  shortcuts: { flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
  chipActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: '#fff' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pickerCol: { alignItems: 'center', width: 80 },
  pickerLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase' },
  pickerScroll: { maxHeight: 150 },
  pickerItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginVertical: 2 },
  pickerItemActive: { backgroundColor: '#2D5016' },
  pickerItemText: { fontSize: 20, fontWeight: '500', color: '#374151', textAlign: 'center' },
  pickerItemTextActive: { color: '#fff', fontWeight: '700' },
  separator: { fontSize: 28, fontWeight: '700', color: '#374151', marginHorizontal: 8 },
  commonLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase' },
  commonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  commonBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  commonBtnActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  commonBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  commonBtnTextActive: { color: '#fff' },
});
