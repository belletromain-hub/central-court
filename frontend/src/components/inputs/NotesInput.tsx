import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface Template { emoji: string; title: string; content: string; }
interface Props {
  label?: string;
  value: string;
  onChange: (text: string) => void;
  templates?: Template[];
  placeholder?: string;
}

export default function NotesInput({ label, value, onChange, templates = [], placeholder }: Props) {
  const [showEditor, setShowEditor] = useState(value.length > 0);

  const defaultTemplates: Template[] = templates.length > 0 ? templates : [
    { emoji: '💪', title: 'Points à travailler', content: '• \n• \n• ' },
    { emoji: '🎯', title: 'Objectifs de la session', content: '1. \n2. \n3. ' },
    { emoji: '📊', title: 'Statistiques du match', content: 'Aces: \nDouble fautes: \nPoints gagnants: ' },
  ];

  const applyTemplate = (tpl: Template) => {
    onChange(tpl.content);
    setShowEditor(true);
  };

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}

      {!showEditor && (
        <View style={s.templateSection}>
          <Text style={s.sectionLabel}>TEMPLATES</Text>
          {defaultTemplates.map((tpl, i) => (
            <TouchableOpacity key={i} style={s.templateCard} onPress={() => applyTemplate(tpl)}>
              <Text style={s.templateEmoji}>{tpl.emoji}</Text>
              <Text style={s.templateTitle}>{tpl.title}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.freeNoteBtn} onPress={() => setShowEditor(true)}>
            <Text style={s.freeNoteText}>✏️ Note libre...</Text>
          </TouchableOpacity>
        </View>
      )}

      {showEditor && (
        <View style={s.editorSection}>
          <TextInput
            style={s.textArea}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder || 'Écris tes notes ici...'}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            autoFocus={value.length === 0}
          />
          <View style={s.editorActions}>
            {value.length > 0 && (
              <TouchableOpacity style={s.clearBtn} onPress={() => { onChange(''); setShowEditor(false); }}>
                <Text style={s.clearText}>Effacer</Text>
              </TouchableOpacity>
            )}
            <Text style={s.charCount}>{value.length} caractères</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 10 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151' },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 6 },
  templateSection: { gap: 6 },
  templateCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  templateEmoji: { fontSize: 22 },
  templateTitle: { fontSize: 15, fontWeight: '500', color: '#374151' },
  freeNoteBtn: { padding: 14, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  freeNoteText: { fontSize: 14, color: '#6B7280' },
  editorSection: { gap: 8 },
  textArea: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', minHeight: 120, lineHeight: 22 },
  editorActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
  charCount: { fontSize: 12, color: '#9CA3AF' },
});
