import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface Location { name: string; address?: string; lat?: number; lng?: number; }
interface Props {
  label?: string;
  value?: Location | null;
  onChange: (location: Location) => void;
  currentLocation?: { city: string; country: string; lat: number; lng: number };
  frequentPlaces?: Location[];
}

export default function SmartLocationInput({ label, value, onChange, currentLocation, frequentPlaces = [] }: Props) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredPlaces = search
    ? frequentPlaces.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : frequentPlaces;

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}

      {currentLocation && (
        <TouchableOpacity
          style={[s.locationCard, value?.name === `${currentLocation.city}, ${currentLocation.country}` && s.locationCardActive]}
          onPress={() => onChange({ name: `${currentLocation.city}, ${currentLocation.country}`, lat: currentLocation.lat, lng: currentLocation.lng })}
        >
          <Text style={s.locIcon}>📍</Text>
          <View style={s.locInfo}>
            <Text style={s.locTitle}>Ma position actuelle</Text>
            <Text style={s.locSub}>{currentLocation.city}, {currentLocation.country}</Text>
          </View>
          {value?.name === `${currentLocation.city}, ${currentLocation.country}` && <Text style={s.check}>✓</Text>}
        </TouchableOpacity>
      )}

      {value && value.name !== `${currentLocation?.city}, ${currentLocation?.country}` && (
        <View style={[s.locationCard, s.locationCardActive]}>
          <Text style={s.locIcon}>📌</Text>
          <View style={s.locInfo}>
            <Text style={s.locTitle}>{value.name}</Text>
            {value.address && <Text style={s.locSub}>{value.address}</Text>}
          </View>
          <TouchableOpacity onPress={() => onChange({ name: '' })}><Text style={s.removeBtn}>✕</Text></TouchableOpacity>
        </View>
      )}

      {frequentPlaces.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>FRÉQUENTS</Text>
          {filteredPlaces.slice(0, 5).map((place, i) => (
            <TouchableOpacity key={i} style={s.placeRow} onPress={() => { onChange(place); setShowSearch(false); setSearch(''); }}>
              <Text style={s.placeIcon}>🎾</Text>
              <View>
                <Text style={s.placeName}>{place.name}</Text>
                {place.address && <Text style={s.placeAddr}>{place.address}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={s.searchToggle} onPress={() => setShowSearch(!showSearch)}>
        <Text style={s.searchToggleText}>🔍 Rechercher un lieu...</Text>
      </TouchableOpacity>

      {showSearch && (
        <View style={s.searchWrapper}>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Nom du lieu, adresse..."
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
          {search.length > 2 && (
            <TouchableOpacity style={s.placeRow} onPress={() => { onChange({ name: search }); setShowSearch(false); setSearch(''); }}>
              <Text style={s.placeIcon}>📍</Text>
              <Text style={s.placeName}>{search}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 10 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  locationCardActive: { borderColor: '#2D5016', backgroundColor: '#F0F5EB' },
  locIcon: { fontSize: 22 },
  locInfo: { flex: 1 },
  locTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  locSub: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  check: { fontSize: 18, color: '#2D5016', fontWeight: '700' },
  removeBtn: { fontSize: 18, color: '#9CA3AF', padding: 4 },
  section: { gap: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4, marginTop: 8 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  placeIcon: { fontSize: 18 },
  placeName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  placeAddr: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  searchToggle: { padding: 14, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  searchToggleText: { fontSize: 14, color: '#6B7280' },
  searchWrapper: { gap: 8 },
  searchInput: { borderWidth: 2, borderColor: '#2D5016', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
});
