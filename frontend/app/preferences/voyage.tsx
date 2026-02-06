import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TRAVEL_CLASSES,
  AIRLINES,
  saveModulePreferences,
  VoyagePreferences,
} from '../../src/utils/progressiveOnboarding';

const COLORS = {
  primary: '#2D5016',
  secondary: '#E8B923',
  background: '#F8F9FA',
  success: '#43A047',
  text: '#1A1A1A',
  textSecondary: '#666666',
};

const AIRLINE_CATEGORIES = [
  { id: 'premium', label: '🌟 PREMIUM 5 ÉTOILES' },
  { id: 'europe', label: '🌍 EUROPE' },
  { id: 'americas', label: '🌎 AMÉRIQUE DU NORD' },
  { id: 'asia', label: '🌏 ASIE-PACIFIQUE' },
  { id: 'other', label: '🌍 AUTRES' },
];

export default function ModuleVoyage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(1);
  const [travelClass, setTravelClass] = useState<string | null>(null);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;
  
  // Filter airlines by search
  const filteredAirlines = searchQuery 
    ? AIRLINES.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : AIRLINES;
  
  // Toggle airline selection (max 3)
  const toggleAirline = (airlineId: string) => {
    setSelectedAirlines(prev => {
      if (prev.includes(airlineId)) {
        return prev.filter(id => id !== airlineId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, airlineId];
    });
  };
  
  // Handle travel class selection - auto progress
  const selectTravelClass = (classId: string) => {
    setTravelClass(classId);
    setTimeout(() => setStep(2), 500);
  };
  
  // Save and finish
  const savePreferences = async () => {
    const prefs: VoyagePreferences = {
      travelClass: travelClass as any,
      airlines: selectedAirlines,
    };
    await saveModulePreferences('voyage', prefs);
    setShowSuccess(true);
    setTimeout(() => router.back(), 2000);
  };
  
  // No preference for airlines
  const skipAirlines = async () => {
    const prefs: VoyagePreferences = {
      travelClass: travelClass as any,
      airlines: [],
    };
    await saveModulePreferences('voyage', prefs);
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
            Tes recommandations de vols seront personnalisées
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with progress */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeBtn} 
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{step}/{totalSteps}</Text>
        </View>
      </View>
      
      {/* Step 1: Travel Class */}
      {step === 1 && (
        <View style={styles.content}>
          <Text style={styles.question}>Comment voyages-tu habituellement ?</Text>
          <Text style={styles.hint}>Cela nous aidera à filtrer les vols</Text>
          
          <View style={styles.optionsContainer}>
            {TRAVEL_CLASSES.map(tc => (
              <TouchableOpacity
                key={tc.id}
                style={[
                  styles.optionCard,
                  travelClass === tc.id && styles.optionCardSelected,
                ]}
                onPress={() => selectTravelClass(tc.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionEmoji}>{tc.emoji}</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>{tc.label}</Text>
                  <Text style={styles.optionDescription}>{tc.description}</Text>
                </View>
                {travelClass === tc.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      {/* Step 2: Airlines */}
      {step === 2 && (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <Text style={styles.question}>Des compagnies préférées ?</Text>
              <Text style={styles.hint}>Sélectionne jusqu'à 3 compagnies</Text>
              
              {/* Search bar */}
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Airlines by category */}
              {searchQuery ? (
                <View style={styles.airlinesSection}>
                  <Text style={styles.resultsText}>{filteredAirlines.length} résultat(s)</Text>
                  {filteredAirlines.map(airline => (
                    <TouchableOpacity
                      key={airline.id}
                      style={[
                        styles.airlineCard,
                        selectedAirlines.includes(airline.id) && styles.airlineCardSelected,
                      ]}
                      onPress={() => toggleAirline(airline.id)}
                    >
                      <Text style={styles.airlineFlag}>{airline.flag}</Text>
                      <Text style={styles.airlineName}>{airline.name}</Text>
                      <View style={[
                        styles.airlineCheckbox,
                        selectedAirlines.includes(airline.id) && styles.airlineCheckboxSelected,
                      ]}>
                        {selectedAirlines.includes(airline.id) && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                AIRLINE_CATEGORIES.map(category => {
                  const categoryAirlines = AIRLINES.filter(a => a.category === category.id);
                  if (categoryAirlines.length === 0) return null;
                  
                  return (
                    <View key={category.id} style={styles.airlinesSection}>
                      <Text style={styles.categoryHeader}>{category.label}</Text>
                      {categoryAirlines.map(airline => (
                        <TouchableOpacity
                          key={airline.id}
                          style={[
                            styles.airlineCard,
                            selectedAirlines.includes(airline.id) && styles.airlineCardSelected,
                          ]}
                          onPress={() => toggleAirline(airline.id)}
                        >
                          <Text style={styles.airlineFlag}>{airline.flag}</Text>
                          <Text style={styles.airlineName}>{airline.name}</Text>
                          <View style={[
                            styles.airlineCheckbox,
                            selectedAirlines.includes(airline.id) && styles.airlineCheckboxSelected,
                          ]}>
                            {selectedAirlines.includes(airline.id) && (
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
          
          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.selectionCount}>
              {selectedAirlines.length}/3 sélectionnées
            </Text>
            
            <TouchableOpacity style={styles.skipBtn} onPress={skipAirlines}>
              <Text style={styles.skipBtnText}>Aucune préférence</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.validateBtn,
                selectedAirlines.length === 0 && styles.validateBtnDisabled,
              ]}
              onPress={savePreferences}
              disabled={selectedAirlines.length === 0}
            >
              <Text style={[
                styles.validateBtnText,
                selectedAirlines.length === 0 && styles.validateBtnTextDisabled,
              ]}>
                Valider
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
    paddingBottom: 24,
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
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F1F8F4',
  },
  optionEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  airlinesSection: {
    marginBottom: 20,
  },
  categoryHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  airlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  airlineCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#F1F8F4',
  },
  airlineFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  airlineName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  airlineCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  airlineCheckboxSelected: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectionCount: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  skipBtnText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
  validateBtnTextDisabled: {
    color: '#fff',
  },
});
