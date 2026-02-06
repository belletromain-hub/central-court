import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WheelPicker from './WheelPicker';

interface Option {
  label: string;
  value: string;
  icon?: string;
}

interface AppleOptionPickerProps {
  options: Option[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  label?: string;
}

export default function AppleOptionPicker({
  options,
  selectedValue,
  onValueChange,
  label,
}: AppleOptionPickerProps) {
  const items = options.map(opt => ({
    label: opt.icon ? `${opt.icon} ${opt.label}` : opt.label,
    value: opt.value,
  }));
  
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.pickerContainer}>
        <WheelPicker
          items={items}
          selectedValue={selectedValue}
          onValueChange={(val) => onValueChange(val as string)}
          width={220}
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
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
