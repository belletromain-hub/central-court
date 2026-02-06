import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WheelPicker from './WheelPicker';

interface AppleDatePickerProps {
  value: string; // "YYYY-MM-DD" format
  onChange: (date: string) => void;
  label?: string;
  minYear?: number;
  maxYear?: number;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTHS_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

export default function AppleDatePicker({
  value,
  onChange,
  label,
  minYear = 2024,
  maxYear = 2030,
}: AppleDatePickerProps) {
  // Parse current value or use today
  const parseDate = (dateStr: string) => {
    if (!dateStr) {
      const today = new Date();
      return {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      };
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    return { year, month, day };
  };
  
  const { year, month, day } = parseDate(value);
  
  // Generate years
  const yearItems = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => ({
      label: (minYear + i).toString(),
      value: minYear + i,
    })
  );
  
  // Generate months
  const monthItems = MONTHS_SHORT.map((name, i) => ({
    label: name,
    value: i + 1,
  }));
  
  // Generate days based on selected month/year
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m, 0).getDate();
  };
  
  const daysInMonth = getDaysInMonth(year, month);
  const dayItems = Array.from({ length: daysInMonth }, (_, i) => ({
    label: (i + 1).toString().padStart(2, '0'),
    value: i + 1,
  }));
  
  const formatDate = (y: number, m: number, d: number) => {
    const adjustedDay = Math.min(d, getDaysInMonth(y, m));
    return `${y}-${m.toString().padStart(2, '0')}-${adjustedDay.toString().padStart(2, '0')}`;
  };
  
  const handleYearChange = (newYear: string | number) => {
    const y = typeof newYear === 'string' ? parseInt(newYear) : newYear;
    onChange(formatDate(y, month, day));
  };
  
  const handleMonthChange = (newMonth: string | number) => {
    const m = typeof newMonth === 'string' ? parseInt(newMonth) : newMonth;
    onChange(formatDate(year, m, day));
  };
  
  const handleDayChange = (newDay: string | number) => {
    const d = typeof newDay === 'string' ? parseInt(newDay) : newDay;
    onChange(formatDate(year, month, d));
  };
  
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.pickerContainer}>
        <WheelPicker
          items={dayItems}
          selectedValue={Math.min(day, daysInMonth)}
          onValueChange={handleDayChange}
          width={60}
        />
        
        <WheelPicker
          items={monthItems}
          selectedValue={month}
          onValueChange={handleMonthChange}
          width={80}
        />
        
        <WheelPicker
          items={yearItems}
          selectedValue={year}
          onValueChange={handleYearChange}
          width={80}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
});
