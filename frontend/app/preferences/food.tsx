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
  CUISINES,
  RESTRICTIONS,
  saveModulePreferences,
  FoodPreferences,
} from '../../src/utils/progressiveOnboarding';

const COLORS = {
  primary: '#2D5016',
  secondary: '#E8B923',
  background: '#F8F9FA',
  success: '#43A047',
  text: '#1A1A1A',
  textSecondary: '#666666',
};

export default function ModuleFood() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(1);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;
  
  const toggleCuisine = (cuisineId: string) => {
    setSelectedCuisines(prev => {
      if (prev.includes(cuisineId)) {
        return prev.filter(id => id !== cuisineId);
      }
      if (prev.length >= 5) return prev; // Max 5
      return [...prev, cuisineId];
    });
  };
  
  const toggleRestriction = (restrictionId: string) => {
    setSelectedRestrictions(prev =>
      prev.includes(restrictionId)
        ? prev.filter(id => id !== restrictionId)
        : [...prev, restrictionId]
    );
  };
  
  const goToStep2 = () => {
    setStep(2);
  };
  
  const savePreferences = async () => {
    const prefs: FoodPreferences = {
      cuisines: selectedCuisines,
      restrictions: selectedRestrictions,
    };
    await saveModulePreferences('food', prefs);
    setShowSuccess(true);
    setTimeout(() => router.back(), 2000);
  };
  
  const skipRestrictions = async () => {
    const prefs: FoodPreferences = {
      cuisines: selectedCuisines,
      restrictions: [],
    };
    await saveModulePreferences('food', prefs);
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
            Tes recommandations de restaurants seront personnalisées
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeBtn} 
          onPress={() => step === 1 ? router.back() : setStep(1)}
        >
          <Ionicons name={step === 1 ? "close" : "chevron-back"} size={28} color={COLORS.text} />
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
      
      {/* Step 1: Cuisines */}
      {step === 1 && (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <Text style={styles.question}>Quelles cuisines préfères-tu ?</Text>
              <Text style={styles.hint}>Sélectionne jusqu'à 5 cuisines</Text>
              
              <View style={styles.grid}>
                {CUISINES.map(cuisine => (
                  <TouchableOpacity
                    key={cuisine.id}
                    style={[
                      styles.gridCard,
                      selectedCuisines.includes(cuisine.id) && styles.gridCardSelected,
                    ]}
                    onPress={() => toggleCuisine(cuisine.id)}
                  >
                    <Text style={styles.gridEmoji}>{cuisine.emoji}</Text>
                    <Text style={styles.gridLabel}>{cuisine.label}</Text>
                    {selectedCuisines.includes(cuisine.id) && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.selectionCount}>
              {selectedCuisines.length}/5 sélectionnées
            </Text>
            <TouchableOpacity
              style={[
                styles.validateBtn,
                selectedCuisines.length === 0 && styles.validateBtnDisabled,
              ]}
              onPress={goToStep2}
              disabled={selectedCuisines.length === 0}
            >
              <Text style={styles.validateBtnText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
      
      {/* Step 2: Restrictions */}
      {step === 2 && (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <Text style={styles.question}>Des restrictions alimentaires ?</Text>
              <Text style={styles.hint}>Pour des recommandations adaptées</Text>
              
              <View style={styles.restrictionsList}>
                {RESTRICTIONS.map(restriction => (
                  <TouchableOpacity
                    key={restriction.id}
                    style={[
                      styles.restrictionCard,
                      selectedRestrictions.includes(restriction.id) && styles.restrictionCardSelected,
                    ]}
                    onPress={() => toggleRestriction(restriction.id)}
                  >
                    <Text style={styles.restrictionEmoji}>{restriction.emoji}</Text>
                    <Text style={styles.restrictionLabel}>{restriction.label}</Text>
                    <View style={[
                      styles.checkbox,
                      selectedRestrictions.includes(restriction.id) && styles.checkboxSelected,
                    ]}>
                      {selectedRestrictions.includes(restriction.id) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={styles.skipBtn} onPress={skipRestrictions}>
              <Text style={styles.skipBtnText}>Aucune restriction</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.validateBtn}
              onPress={savePreferences}
            >
              <Text style={styles.validateBtnText}>
                {selectedRestrictions.length > 0 
                  ? `Valider (${selectedRestrictions.length})` 
                  : 'Valider'}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    position: 'relative',
  },
  gridCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F1F8F4',
  },
  gridEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 13,
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
  restrictionsList: {
    gap: 10,
  },
  restrictionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  restrictionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F1F8F4',
  },
  restrictionEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  restrictionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
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
