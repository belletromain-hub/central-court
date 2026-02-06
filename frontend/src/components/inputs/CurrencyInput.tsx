import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  label?: string;
  value: number;
  onChange: (amount: number) => void;
  currency?: string;
  frequentAmounts?: number[];
}

export default function CurrencyInput({ label, value, onChange, currency = '€', frequentAmounts = [] }: Props) {
  const [text, setText] = useState(value > 0 ? value.toString() : '');

  const handleChange = (t: string) => {
    const clean = t.replace(/[^0-9.,]/g, '').replace(',', '.');
    setText(clean);
    const num = parseFloat(clean);
    if (!isNaN(num)) onChange(num);
    else if (clean === '') onChange(0);
  };

  const selectAmount = (amount: number) => {
    setText(amount.toString());
    onChange(amount);
  };

  const formatted = value > 0 ? `${value.toLocaleString('fr-FR')} ${currency}` : `0 ${currency}`;

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={s.displayBox}>
        <Text style={s.displayText}>{formatted}</Text>
      </View>
      {frequentAmounts.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>FRÉQUENTS</Text>
          <View style={s.amountsRow}>
            {frequentAmounts.map((a, i) => (
              <TouchableOpacity key={i} style={[s.amountBtn, value === a && s.amountBtnActive]} onPress={() => selectAmount(a)}>
                <Text style={[s.amountText, value === a && s.amountTextActive]}>{a} {currency}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      <TextInput
        style={s.input}
        value={text}
        onChangeText={handleChange}
        placeholder={`Montant en ${currency}`}
        placeholderTextColor="#9CA3AF"
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151' },
  displayBox: { alignItems: 'center', paddingVertical: 20 },
  displayText: { fontSize: 36, fontWeight: '800', color: '#111827' },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5 },
  amountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  amountBtnActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  amountText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  amountTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', backgroundColor: '#fff', textAlign: 'center' },
});
