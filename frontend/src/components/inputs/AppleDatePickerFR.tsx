/**
 * AppleDatePickerFR - Date picker style Apple avec format français
 * Format d'entrée/sortie: JJ/MM/AAAA
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WheelPicker from './WheelPicker';

interface AppleDatePickerFRProps {
  value: string; // "JJ/MM/AAAA" format
  onChange: (date: string) => void;
  label?: string;
  minYear?: number;
  maxYear?: number;
}

const MONTHS_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

export default function AppleDatePickerFR({
  value,
  onChange,
  label,
  minYear = 2020,
  maxYear = 2030,
}: AppleDatePickerFRProps) {
  // Parse current value (JJ/MM/AAAA) or use today
  const parseDate = (dateStr: string) => {
    if (!dateStr || dateStr === '--') {
      const today = new Date();
      return {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      };
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      return { 
        year: isNaN(year) ? new Date().getFullYear() : year, 
        month: isNaN(month) ? new Date().getMonth() + 1 : month, 
        day: isNaN(day) ? new Date().getDate() : day 
      };
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
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
    return `${adjustedDay.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
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
