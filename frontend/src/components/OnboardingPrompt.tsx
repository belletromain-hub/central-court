import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#2D5016',
  secondary: '#E8B923',
  background: '#F8F9FA',
  text: '#1A1A1A',
  textSecondary: '#666666',
};

interface OnboardingPromptProps {
  visible: boolean;
  emoji: string;
  title: string;
  description: string;
  duration: string;
  onAccept: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export default function OnboardingPrompt({
  visible,
  emoji,
  title,
  description,
  duration,
  onAccept,
  onSkip,
  onDismiss,
}: OnboardingPromptProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
            <Ionicons name="close" size={24} color="#999" />
          </TouchableOpacity>
          
          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            
            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.duration}>{duration}</Text>
            </View>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onAccept}>
              <Text style={styles.primaryBtnText}>Personnaliser</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryBtn} onPress={onSkip}>
              <Text style={styles.secondaryBtnText}>Plus tard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  duration: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  buttons: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
