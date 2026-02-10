import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onSelectFile: () => void;
}

export default function UploadModal({ visible, onClose, onTakePhoto, onSelectFile }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter un document</Text>
            <TouchableOpacity onPress={onClose} testID="close-upload-modal">
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.option} onPress={onTakePhoto} testID="btn-take-photo">
            <View style={[styles.optionIcon, { backgroundColor: '#4CAF5015' }]}>
              <Ionicons name="camera" size={28} color="#4CAF50" />
            </View>
            <View>
              <Text style={styles.optionLabel}>Prendre une photo</Text>
              <Text style={styles.optionDesc}>Le montant sera détecté automatiquement</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onSelectFile} testID="btn-select-file">
            <View style={[styles.optionIcon, { backgroundColor: '#1e3c7215' }]}>
              <Ionicons name="document" size={28} color="#1e3c72" />
            </View>
            <View>
              <Text style={styles.optionLabel}>Sélectionner un fichier</Text>
              <Text style={styles.optionDesc}>PDF ou image depuis vos fichiers</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.infoBox}>
            <Ionicons name="sparkles" size={18} color="#f57c00" />
            <Text style={styles.infoText}>
              Les PDF et images sont analysés automatiquement par OCR.
            </Text>
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
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    marginBottom: 12,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    color: '#999',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e6',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#f57c00',
  },
});
