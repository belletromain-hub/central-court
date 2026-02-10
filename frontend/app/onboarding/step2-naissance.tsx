import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OnboardingProgressBar from '../../src/components/OnboardingProgressBar';
import { saveOnboardingStep } from '../../src/utils/onboardingStorage';
import AppleDatePicker from '../../src/components/inputs/AppleDatePicker';

const COLORS = {
  primary: '#2D5016',
  secondary: '#E8B923',
  background: '#F8F9FA',
  success: '#43A047',
  error: '#E53935',
  text: '#1a1a1a',
  textSecondary: '#6b7280',
};

export default function Step2Naissance() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Default to 25 years ago
  const defaultYear = new Date().getFullYear() - 25;
  const [dateValue, setDateValue] = useState(`${defaultYear}-06-15`);
  const [isValid, setIsValid] = useState(true);
  const [age, setAge] = useState(25);
  const [error, setError] = useState('');
  
  // Validation
  useEffect(() => {
    setError('');
    
    if (dateValue) {
      const [y, m, d] = dateValue.split('-').map(Number);
      
      const birthDate = new Date(y, m - 1, d);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      setAge(calculatedAge);
      
      if (calculatedAge < 6 || calculatedAge > 120) {
        setError('Âge doit être entre 6 et 120 ans');
        setIsValid(false);
        return;
      }
      
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, [dateValue]);
  
  const saveAndContinue = async () => {
    if (!isValid) return;
    await saveOnboardingStep(2, { dateNaissance: dateValue });
    router.push('/onboarding/step3-circuits');
  };
  
  const formatDisplayDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                   'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${d} ${months[m - 1]} ${y}`;
  };
  
  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={28} color={COLORS.text} />
      </TouchableOpacity>
      
      <OnboardingProgressBar currentStep={2} totalSteps={7} />
      
      <View style={styles.content}>
        <Text style={styles.question}>Quelle est votre date de naissance ?</Text>
        
        {/* Apple Wheel Date Picker */}
        <View style={styles.pickerWrapper}>
          <AppleDatePicker
            value={dateValue}
            onChange={setDateValue}
            minYear={1940}
            maxYear={new Date().getFullYear() - 6}
          />
        </View>
        
        {/* Age display */}
        {isValid && (
          <View style={styles.ageCard}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.ageText}>
              {formatDisplayDate(dateValue)}
            </Text>
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>{age} ans</Text>
            </View>
          </View>
        )}
        
        {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
      </View>
      
      {/* Continue Button */}
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
          onPress={saveAndContinue}
          disabled={!isValid}
          testID="btn-continue"
        >
          <Text style={styles.continueButtonText}>Continuer</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 40,
    textAlign: 'center',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ageText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  ageBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ageBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.error,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 14,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
