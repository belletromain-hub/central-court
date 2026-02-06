import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Contact { id: string; name: string; role?: string; avatar?: string; }
interface Props {
  label?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  staff?: Contact[];
  frequentPartners?: Contact[];
}

export default function SmartContactPicker({ label, value, onChange, staff = [], frequentPartners = [] }: Props) {
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter(v => v !== id));
    else onChange([...value, id]);
  };

  const renderContact = (contact: Contact) => {
    const selected = value.includes(contact.id);
    const initials = contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
      <TouchableOpacity key={contact.id} style={[s.contactCard, selected && s.contactCardActive]} onPress={() => toggle(contact.id)}>
        <View style={[s.avatar, selected && s.avatarActive]}>
          <Text style={[s.avatarText, selected && s.avatarTextActive]}>{initials}</Text>
        </View>
        <View style={s.contactInfo}>
          <Text style={[s.contactName, selected && s.contactNameActive]}>{contact.name}</Text>
          {contact.role && <Text style={s.contactRole}>{contact.role}</Text>}
        </View>
        <View style={[s.checkbox, selected && s.checkboxActive]}>
          {selected && <Text style={s.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}
      {value.length > 0 && <Text style={s.counter}>{value.length} participant{value.length > 1 ? 's' : ''} sélectionné{value.length > 1 ? 's' : ''}</Text>}

      {staff.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>TON STAFF</Text>
          {staff.map(renderContact)}
        </View>
      )}

      {frequentPartners.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>PARTENAIRES FRÉQUENTS</Text>
          {frequentPartners.map(renderContact)}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 10 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151' },
  counter: { fontSize: 13, fontWeight: '500', color: '#2D5016' },
  section: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5, marginTop: 4 },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  contactCardActive: { borderColor: '#2D5016', backgroundColor: '#F0F5EB' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  avatarActive: { backgroundColor: '#2D5016' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  avatarTextActive: { color: '#fff' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  contactNameActive: { color: '#2D5016' },
  contactRole: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  checkmark: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
