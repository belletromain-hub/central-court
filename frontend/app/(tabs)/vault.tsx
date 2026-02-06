import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../src/constants/colors';

// Types
interface Document {
  id: string;
  name: string;
  category: 'travel' | 'invoices' | 'medical' | 'other';
  type: 'pdf' | 'image';
  size: string;
  date: string;
  amount?: number;
}

// Categories
const CATEGORIES = {
  travel: { label: 'Voyages', icon: 'airplane', color: '#00796b' },
  invoices: { label: 'Factures', icon: 'receipt', color: '#f57c00' },
  medical: { label: 'Médical', icon: 'medkit', color: '#c2185b' },
  other: { label: 'Autres', icon: 'document', color: '#757575' },
};

// Sample data
const SAMPLE_DOCUMENTS: Document[] = [
  { id: '1', name: 'Billet avion Rotterdam.pdf', category: 'travel', type: 'pdf', size: '245 KB', date: '01/02/2026', amount: 285 },
  { id: '2', name: 'Hotel Hilton.pdf', category: 'travel', type: 'pdf', size: '180 KB', date: '01/02/2026', amount: 920 },
  { id: '3', name: 'Facture kinésithérapeute.jpg', category: 'medical', type: 'image', size: '1.2 MB', date: '04/02/2026', amount: 80 },
  { id: '4', name: 'Restaurant équipe.jpg', category: 'invoices', type: 'image', size: '890 KB', date: '05/02/2026', amount: 125 },
  { id: '5', name: 'Taxi aéroport.pdf', category: 'invoices', type: 'pdf', size: '95 KB', date: '08/02/2026', amount: 45 },
];

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const [documents, setDocuments] = useState<Document[]>(SAMPLE_DOCUMENTS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filter documents
  const filteredDocs = selectedCategory 
    ? documents.filter(d => d.category === selectedCategory)
    : documents;

  // Calculate total
  const total = filteredDocs.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Handle photo capture
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès à la caméra nécessaire.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      addDocument(result.assets[0].uri, 'image');
    }
  };

  // Handle file selection
  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const type = file.mimeType?.includes('pdf') ? 'pdf' : 'image';
        addDocument(file.uri, type, file.name);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Add document
  const addDocument = async (uri: string, type: 'pdf' | 'image', name?: string) => {
    setIsUploading(true);
    setShowUploadModal(false);

    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: name || `Document_${Date.now()}.${type === 'pdf' ? 'pdf' : 'jpg'}`,
      category: 'other',
      type,
      size: '-- KB',
      date: new Date().toLocaleDateString('fr-FR'),
    };

    setDocuments(prev => [newDoc, ...prev]);
    setIsUploading(false);
    Alert.alert('✅ Document ajouté', newDoc.name);
  };

  // Delete document
  const handleDelete = (doc: Document) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${doc.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => setDocuments(prev => prev.filter(d => d.id !== doc.id))
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#f57c00', '#ff9800']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.headerTitle}>Documents</Text>
        <Text style={styles.headerSubtitle}>{filteredDocs.length} fichier{filteredDocs.length > 1 ? 's' : ''}</Text>
      </LinearGradient>

      {/* Category Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.filterText, !selectedCategory && styles.filterTextActive]}>Tous</Text>
        </TouchableOpacity>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, selectedCategory === key && styles.filterChipActive]}
            onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
          >
            <Ionicons name={cat.icon as any} size={14} color={selectedCategory === key ? '#fff' : Colors.text.secondary} />
            <Text style={[styles.filterText, selectedCategory === key && styles.filterTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{total} €</Text>
      </View>

      {/* Documents List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filteredDocs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyText}>Aucun document</Text>
          </View>
        ) : (
          filteredDocs.map(doc => {
            const cat = CATEGORIES[doc.category];
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.docCard}
                onLongPress={() => handleDelete(doc)}
              >
                <View style={[styles.docIcon, { backgroundColor: cat.color + '15' }]}>
                  <Ionicons 
                    name={doc.type === 'pdf' ? 'document-text' : 'image'} 
                    size={22} 
                    color={cat.color} 
                  />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.docMeta}>{doc.date} • {doc.size}</Text>
                </View>
                {doc.amount && (
                  <Text style={styles.docAmount}>{doc.amount} €</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && { opacity: 0.8 }
        ]}
        onPress={() => setShowUploadModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un document</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.uploadOption} onPress={handleTakePhoto}>
              <View style={[styles.uploadIcon, { backgroundColor: '#4CAF5015' }]}>
                <Ionicons name="camera" size={28} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.uploadLabel}>Prendre une photo</Text>
                <Text style={styles.uploadDesc}>Photographiez votre reçu</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOption} onPress={handleSelectFile}>
              <View style={[styles.uploadIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="document" size={28} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.uploadLabel}>Sélectionner un fichier</Text>
                <Text style={styles.uploadDesc}>PDF ou image</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading overlay */}
      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Upload...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.muted,
    marginTop: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
    marginLeft: 12,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  docMeta: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  docAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f57c00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
  },
  uploadIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  uploadDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});
