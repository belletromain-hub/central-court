import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Template { emoji: string; label: string; }
interface Props {
  label?: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  suggestions?: string[];
  recentValues?: string[];
  templates?: Template[];
  maxLength?: number;
}

export default function SmartTextInput({ label, value, onChange, placeholder, suggestions = [], recentValues = [], templates = [], maxLength }: Props) {
  const [focused, setFocused] = useState(false);

  const filtered = useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 5);
  }, [value, suggestions]);

  const showSuggestions = focused && value.length > 0 && filtered.length > 0;
  const showRecent = focused && value.length === 0 && recentValues.length > 0;
  const showTemplates = !focused && value.length === 0 && templates.length > 0;

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}

      {showTemplates && (
        <View style={s.templateSection}>
          <Text style={s.sectionLabel}>Templates</Text>
          {templates.map((t, i) => (
            <TouchableOpacity key={i} style={s.templateRow} onPress={() => onChange(t.label)}>
              <Text style={s.templateEmoji}>{t.emoji}</Text>
              <Text style={s.templateText}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[s.inputWrapper, focused && s.inputFocused]}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || 'Saisir...'}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          maxLength={maxLength}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange('')} style={s.clearBtn}>
            <Text style={s.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && (
        <View style={s.dropdown}>
          <Text style={s.sectionLabel}>Suggestions</Text>
          {filtered.map((item, i) => (
            <TouchableOpacity key={i} style={s.suggestionRow} onPress={() => { onChange(item); setFocused(false); }}>
              <Text style={s.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showRecent && (
        <View style={s.dropdown}>
          <Text style={s.sectionLabel}>Récents</Text>
          {recentValues.slice(0, 5).map((item, i) => (
            <TouchableOpacity key={i} style={s.suggestionRow} onPress={() => { onChange(item); setFocused(false); }}>
              <Text style={s.recentIcon}>🕐</Text>
              <Text style={s.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 14 },
  inputFocused: { borderColor: '#2D5016', borderWidth: 2 },
  input: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 12 },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 16, color: '#9CA3AF' },
  dropdown: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 4 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, gap: 8 },
  suggestionText: { fontSize: 14, color: '#374151' },
  recentIcon: { fontSize: 14 },
  templateSection: { gap: 6 },
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  templateEmoji: { fontSize: 20 },
  templateText: { fontSize: 15, fontWeight: '500', color: '#374151' },
});
