import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OnboardingProgressBar from '../../src/components/OnboardingProgressBar';
import { saveOnboardingStep } from '../../src/utils/onboardingStorage';

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
  
  const dayRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [hasAutoProgressed, setHasAutoProgressed] = useState(false);
  
  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => dayRef.current?.focus(), 300);
  }, []);
  
  // Auto-focus cascade
  useEffect(() => {
    if (day.length === 2) monthRef.current?.focus();
  }, [day]);
  
  useEffect(() => {
    if (month.length === 2) yearRef.current?.focus();
  }, [month]);
  
  // Validation
  useEffect(() => {
    setError('');
    
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      const d = parseInt(day);
      const m = parseInt(month);
      const y = parseInt(year);
      
      if (d < 1 || d > 31) {
        setError('Jour invalide');
        return;
      }
      if (m < 1 || m > 12) {
        setError('Mois invalide');
        return;
      }
      
      const birthDate = new Date(y, m - 1, d);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 6 || age > 120) {
        setError('Âge doit être entre 6 et 120 ans');
        return;
      }
      
      setIsValid(true);
      
      // Auto-progression
      if (!hasAutoProgressed) {
        const timer = setTimeout(() => {
          setHasAutoProgressed(true);
          saveAndContinue();
        }, 500);
        return () => clearTimeout(timer);
      }
    } else {
      setIsValid(false);
    }
  }, [day, month, year]);
  
  const saveAndContinue = async () => {
    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    await saveOnboardingStep(2, { dateNaissance: dateStr });
    router.push('/onboarding/step3-circuits');
  };
  
  const handleDayChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
    setDay(cleaned);
  };
  
  const handleMonthChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
    setMonth(cleaned);
  };
  
  const handleYearChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setYear(cleaned);
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
        
        <View style={styles.dateContainer}>
          <View style={styles.dateInputWrapper}>
            <Text style={styles.dateLabel}>Jour</Text>
            <TextInput
              ref={dayRef}
              style={[
                styles.dateInput,
                day.length === 2 && styles.dateInputFilled,
              ]}
              value={day}
              onChangeText={handleDayChange}
              placeholder="JJ"
              placeholderTextColor="#bdbdbd"
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          
          <Text style={styles.dateSeparator}>/</Text>
          
          <View style={styles.dateInputWrapper}>
            <Text style={styles.dateLabel}>Mois</Text>
            <TextInput
              ref={monthRef}
              style={[
                styles.dateInput,
                month.length === 2 && styles.dateInputFilled,
              ]}
              value={month}
              onChangeText={handleMonthChange}
              placeholder="MM"
              placeholderTextColor="#bdbdbd"
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          
          <Text style={styles.dateSeparator}>/</Text>
          
          <View style={[styles.dateInputWrapper, { flex: 1.5 }]}>
            <Text style={styles.dateLabel}>Année</Text>
            <TextInput
              ref={yearRef}
              style={[
                styles.dateInput,
                year.length === 4 && styles.dateInputFilled,
                isValid && styles.dateInputValid,
              ]}
              value={year}
              onChangeText={handleYearChange}
              placeholder="AAAA"
              placeholderTextColor="#bdbdbd"
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          
          {isValid && (
            <View style={styles.validIconDate}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
          )}
        </View>
        
        {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
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
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 32,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dateInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  dateInputFilled: {
    borderColor: COLORS.primary,
  },
  dateInputValid: {
    borderColor: COLORS.success,
  },
  dateSeparator: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingBottom: 16,
  },
  validIconDate: {
    paddingBottom: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.error,
  },
});
