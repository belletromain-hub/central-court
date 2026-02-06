import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Shortcut { label: string; value: Date; }
interface Props {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  shortcuts?: Shortcut[];
  minDate?: Date;
  maxDate?: Date;
}

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function FluidDatePicker({ label, value, onChange, shortcuts, minDate }: Props) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(value ? value.getMonth() : today.getMonth());
  const [viewYear, setViewYear] = useState(value ? value.getFullYear() : today.getFullYear());

  const defaultShortcuts: Shortcut[] = shortcuts || [
    { label: "Aujourd'hui", value: today },
    { label: 'Demain', value: new Date(today.getTime() + 86400000) },
    { label: 'Ce week-end', value: (() => { const d = new Date(today); d.setDate(d.getDate() + (6 - d.getDay())); return d; })() },
    { label: 'Dans 1 semaine', value: new Date(today.getTime() + 7 * 86400000) },
  ];

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [viewMonth, viewYear]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (minDate && d < minDate) return;
    onChange(d);
  };

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    return new Date(viewYear, viewMonth, day) < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  };

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.shortcuts}>
        {defaultShortcuts.map((sc, i) => {
          const active = value && isSameDay(value, sc.value);
          return (
            <TouchableOpacity key={i} style={[s.chip, active && s.chipActive]} onPress={() => { onChange(sc.value); setViewMonth(sc.value.getMonth()); setViewYear(sc.value.getFullYear()); }}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{sc.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={s.calendar}>
        <View style={s.calHeader}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Text style={s.navText}>◀</Text></TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Text style={s.navText}>▶</Text></TouchableOpacity>
        </View>
        <View style={s.daysHeader}>
          {DAYS.map((d, i) => <Text key={i} style={s.dayLabel}>{d}</Text>)}
        </View>
        <View style={s.daysGrid}>
          {calendarDays.map((day, i) => {
            if (day === null) return <View key={i} style={s.dayCell} />;
            const date = new Date(viewYear, viewMonth, day);
            const isToday = isSameDay(date, today);
            const isSelected = value && isSameDay(date, value);
            const disabled = isDisabled(day);
            return (
              <TouchableOpacity key={i} style={[s.dayCell, isToday && s.todayCell, isSelected && s.selectedCell]} onPress={() => !disabled && selectDay(day)} disabled={disabled}>
                <Text style={[s.dayText, isToday && s.todayText, isSelected && s.selectedText, disabled && s.disabledText]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  shortcuts: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
  chipActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: '#fff' },
  calendar: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { padding: 8 },
  navText: { fontSize: 16, color: '#2D5016' },
  monthLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  daysHeader: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  dayText: { fontSize: 14, color: '#374151' },
  todayCell: { backgroundColor: '#F0F5EB' },
  todayText: { fontWeight: '700', color: '#2D5016' },
  selectedCell: { backgroundColor: '#2D5016' },
  selectedText: { color: '#fff', fontWeight: '700' },
  disabledText: { color: '#D1D5DB' },
});
