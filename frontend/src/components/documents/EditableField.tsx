/**
 * EditableField - Champ éditable inline avec validation
 * Utilisé dans l'écran de vérification des factures
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';

interface EditableFieldProps {
  label: string;
  value: string | number | null | undefined;
  onValueChange: (value: string) => void;
  type?: 'text' | 'amount' | 'date';
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  confidence?: number;
  required?: boolean;
  suffix?: string;
  testID?: string;
}

export default function EditableField({
  label,
  value,
  onValueChange,
  type = 'text',
  placeholder = '',
  icon,
  confidence,
  required = false,
  suffix,
  testID,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const displayValue = value !== null && value !== undefined ? value.toString() : '';
  const hasValue = displayValue.length > 0;
  const isLowConfidence = confidence !== undefined && confidence < 0.7;

  const handlePress = () => {
    setLocalValue(displayValue);
    setIsEditing(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBlur = () => {
    setIsEditing(false);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Valider et formater selon le type
    let formattedValue = localValue.trim();
    
    if (type === 'amount') {
      // Nettoyer et formater le montant
      formattedValue = formattedValue.replace(/[^0-9.,]/g, '').replace(',', '.');
      const numValue = parseFloat(formattedValue);
      if (!isNaN(numValue)) {
        formattedValue = numValue.toFixed(2);
      }
    }
    
    onValueChange(formattedValue);
  };

  const handleChangeText = (text: string) => {
    if (type === 'amount') {
      // Autoriser uniquement les chiffres, le point et la virgule
      const cleaned = text.replace(/[^0-9.,]/g, '');
      setLocalValue(cleaned);
    } else if (type === 'date') {
      // Formatter automatiquement la date (JJ/MM/AAAA)
      let cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned.length >= 2) cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
      if (cleaned.length >= 5) cleaned = cleaned.slice(0, 5) + '/' + cleaned.slice(5);
      if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
      setLocalValue(cleaned);
    } else {
      setLocalValue(text);
    }
  };

  const getKeyboardType = () => {
    switch (type) {
      case 'amount':
        return 'decimal-pad';
      case 'date':
        return 'number-pad';
      default:
        return 'default';
    }
  };

  const getConfidenceColor = () => {
    if (confidence === undefined) return Colors.text.secondary;
    if (confidence >= 0.9) return '#4CAF50';
    if (confidence >= 0.7) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.labelRow}>
        {icon && (
          <Ionicons name={icon} size={16} color={Colors.text.secondary} style={styles.labelIcon} />
        )}
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {confidence !== undefined && (
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor() + '20' }]}>
            <Ionicons 
              name={confidence >= 0.7 ? 'checkmark-circle' : 'alert-circle'} 
              size={12} 
              color={getConfidenceColor()} 
            />
            <Text style={[styles.confidenceText, { color: getConfidenceColor() }]}>
              {Math.round(confidence * 100)}%
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[
          styles.valueContainer,
          isEditing && styles.valueContainerEditing,
          isLowConfidence && styles.valueContainerWarning,
          !hasValue && required && styles.valueContainerEmpty,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        testID={`${testID}-touch`}
      >
        {isEditing ? (
          <TextInput
            ref={inputRef}
            style={[styles.input, type === 'amount' && styles.amountInput]}
            value={localValue}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.muted}
            keyboardType={getKeyboardType()}
            returnKeyType="done"
            autoFocus
            testID={`${testID}-input`}
          />
        ) : (
          <Text 
            style={[
              styles.value, 
              type === 'amount' && styles.amountValue,
              !hasValue && styles.valuePlaceholder,
            ]}
            numberOfLines={1}
          >
            {hasValue ? displayValue : placeholder}
          </Text>
        )}
        
        {suffix && hasValue && !isEditing && (
          <Text style={styles.suffix}>{suffix}</Text>
        )}
        
        {!isEditing && (
          <Ionicons 
            name="pencil" 
            size={16} 
            color={isLowConfidence ? '#F44336' : Colors.text.muted} 
          />
        )}
      </TouchableOpacity>

      {isLowConfidence && !isEditing && (
        <View style={styles.warningRow}>
          <Ionicons name="alert-circle" size={14} color="#F44336" />
          <Text style={styles.warningText}>Vérifiez cette valeur</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    flex: 1,
  },
  required: {
    color: '#F44336',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  valueContainerEditing: {
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  valueContainerWarning: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF8F8',
  },
  valueContainerEmpty: {
    borderColor: '#FFE0B2',
    backgroundColor: '#FFF8E1',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    padding: 0,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '600',
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
  },
  valuePlaceholder: {
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
  suffix: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginLeft: 4,
    marginRight: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#F44336',
  },
});
