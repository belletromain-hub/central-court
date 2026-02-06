import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  HOTEL_AMENITIES,
  saveModulePreferences,
  HotelPreferences,
} from '../../src/utils/progressiveOnboarding';

const COLORS = {
  primary: '#2D5016',
  secondary: '#E8B923',
  background: '#F8F9FA',
  success: '#43A047',
  text: '#1A1A1A',
  textSecondary: '#666666',
};

export default function ModuleHotel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    );
  };
  
  const savePreferences = async () => {
    const prefs: HotelPreferences = {
      amenities: selectedAmenities,
    };
    await saveModulePreferences('hotel', prefs);
    setShowSuccess(true);
    setTimeout(() => router.back(), 2000);
  };
  
  if (showSuccess) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.successContent}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Préférences enregistrées !</Text>
          <Text style={styles.successSubtitle}>
            Tes recommandations d'hôtels seront filtrées selon tes critères
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: '100%' }]}
            />
          </View>
          <Text style={styles.progressText}>1/1</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.question}>Qu'est-ce qui compte pour toi à l'hôtel ?</Text>
          <Text style={styles.hint}>Sélectionne tes critères essentiels</Text>
          
          <View style={styles.amenitiesGrid}>
            {HOTEL_AMENITIES.map(amenity => (
              <TouchableOpacity
                key={amenity.id}
                style={[
                  styles.amenityCard,
                  selectedAmenities.includes(amenity.id) && styles.amenityCardSelected,
                ]}
                onPress={() => toggleAmenity(amenity.id)}
              >
                <Text style={styles.amenityEmoji}>{amenity.emoji}</Text>
                <Text style={styles.amenityLabel}>{amenity.label}</Text>
                {selectedAmenities.includes(amenity.id) && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      
      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.validateBtn,
            selectedAmenities.length === 0 && styles.validateBtnDisabled,
          ]}
          onPress={savePreferences}
          disabled={selectedAmenities.length === 0}
        >
          <Text style={styles.validateBtnText}>
            {selectedAmenities.length > 0 
              ? `Valider (${selectedAmenities.length} sélectionné${selectedAmenities.length > 1 ? 's' : ''})` 
              : 'Sélectionne au moins 1 critère'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    padding: 24,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityCard: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    position: 'relative',
  },
  amenityCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F1F8F4',
  },
  amenityEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  amenityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  validateBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  validateBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  validateBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
