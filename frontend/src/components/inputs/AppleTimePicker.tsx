import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WheelPicker from './WheelPicker';

interface AppleTimePickerProps {
  value: string; // "HH:MM" format
  onChange: (time: string) => void;
  minuteStep?: number;
  label?: string;
}

export default function AppleTimePicker({
  value,
  onChange,
  minuteStep = 5,
  label,
}: AppleTimePickerProps) {
  // Parse current value
  const [hours, minutes] = value ? value.split(':').map(Number) : [9, 0];
  
  // Generate hours (0-23)
  const hourItems = Array.from({ length: 24 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i,
  }));
  
  // Generate minutes based on step
  const minuteItems = Array.from(
    { length: 60 / minuteStep },
    (_, i) => ({
      label: (i * minuteStep).toString().padStart(2, '0'),
      value: i * minuteStep,
    })
  );
  
  const handleHourChange = (newHour: string | number) => {
    const h = typeof newHour === 'string' ? parseInt(newHour) : newHour;
    const formattedTime = `${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(formattedTime);
  };
  
  const handleMinuteChange = (newMinute: string | number) => {
    const m = typeof newMinute === 'string' ? parseInt(newMinute) : newMinute;
    const formattedTime = `${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    onChange(formattedTime);
  };
  
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.pickerContainer}>
        <WheelPicker
          items={hourItems}
          selectedValue={hours}
          onValueChange={handleHourChange}
          width={80}
        />
        
        <Text style={styles.separator}>:</Text>
        
        <WheelPicker
          items={minuteItems}
          selectedValue={Math.round(minutes / minuteStep) * minuteStep}
          onValueChange={handleMinuteChange}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  separator: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2D5016',
    marginHorizontal: 4,
  },
});
