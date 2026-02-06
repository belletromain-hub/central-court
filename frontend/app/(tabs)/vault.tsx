import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Colors from '../../src/constants/colors';
import api from '../../src/services/api';

// Types
interface Document {
  id: string;
  name: string;
  category: 'travel' | 'invoices' | 'medical' | 'other';
  type: 'pdf' | 'image';
  size: string;
  date: string;
  amount?: number;
  uri?: string;
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
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<string>('other');

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
      await processDocument(result.assets[0].uri, 'image', `Photo_${Date.now()}.jpg`);
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
        await processDocument(file.uri, type, file.name || `Document_${Date.now()}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Process document with AI OCR
  const processDocument = async (uri: string, type: 'pdf' | 'image', name: string) => {
    setIsUploading(true);
    setShowUploadModal(false);

    let detectedAmount: number | undefined;
    let detectedDate: string | undefined;
    let detectedCategory: Document['category'] = 'other';
    let merchantName: string | undefined;

    try {
      // For images, convert to base64 and call OCR API
      if (type === 'image') {
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Call OCR API
        const response = await api.post('/api/documents/analyze', {
          image_base64: base64,
          filename: name,
        });
        
        console.log('OCR Response:', response.data);
        
        if (response.data.success) {
          detectedAmount = response.data.amount;
          detectedDate = response.data.date;
          detectedCategory = response.data.category || 'other';
          merchantName = response.data.merchant;
          
          // Update name with merchant if detected
          if (merchantName && !name.includes(merchantName)) {
            name = `${merchantName} - ${name}`;
          }
        }
      } else {
        // For PDFs, try to extract info from filename
        // Example: "Invoice - UDM - January 26.pdf"
        const dateMatch = name.match(/(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
        if (dateMatch) {
          const monthNames: { [key: string]: string } = {
            'january': '01', 'janvier': '01',
            'february': '02', 'février': '02',
            'march': '03', 'mars': '03',
            'april': '04', 'avril': '04',
            'may': '05', 'mai': '05',
            'june': '06', 'juin': '06',
            'july': '07', 'juillet': '07',
            'august': '08', 'août': '08',
            'september': '09', 'septembre': '09',
            'october': '10', 'octobre': '10',
            'november': '11', 'novembre': '11',
            'december': '12', 'décembre': '12',
          };
          const month = monthNames[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          detectedDate = `${day}/${month}/2026`;
        }
        
        // Try to categorize from filename
        const lowerName = name.toLowerCase();
        if (lowerName.includes('invoice') || lowerName.includes('facture')) {
          detectedCategory = 'invoices';
        } else if (lowerName.includes('hotel') || lowerName.includes('flight') || lowerName.includes('billet') || lowerName.includes('avion')) {
          detectedCategory = 'travel';
        } else if (lowerName.includes('medical') || lowerName.includes('pharma') || lowerName.includes('kiné')) {
          detectedCategory = 'medical';
        }
      }
    } catch (error) {
      console.log('OCR analysis error:', error);
      // Continue with fallback values
    }

    // Fallback to today's date if not detected
    const today = new Date().toLocaleDateString('fr-FR');

    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name,
      category: detectedCategory,
      type,
      size: `${Math.floor(Math.random() * 2000) + 100} KB`,
      date: detectedDate || today,
      amount: detectedAmount,
      uri,
    };

    setDocuments(prev => [newDoc, ...prev]);
    setIsUploading(false);
    
    // ALWAYS open edit modal to confirm/modify details
    setSelectedDoc(newDoc);
    setEditDate(newDoc.date);
    setEditAmount(newDoc.amount?.toString() || '');
    setEditCategory(newDoc.category);
    
    // Small delay to ensure state is updated
    setTimeout(() => {
      setShowEditModal(true);
    }, 100);
  };

  // View document
  const handleViewDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setShowViewModal(true);
  };

  // Open edit modal
  const handleEditDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setEditDate(doc.date);
    setEditAmount(doc.amount?.toString() || '');
    setEditCategory(doc.category);
    setShowEditModal(true);
  };

  // Save edited document
  const handleSaveEdit = () => {
    if (!selectedDoc) return;

    setDocuments(prev => prev.map(d => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          date: editDate,
          amount: parseFloat(editAmount) || 0,
          category: editCategory as Document['category'],
        };
      }
      return d;
    }));

    setShowEditModal(false);
    setSelectedDoc(null);
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
        <Text style={styles.totalAmount}>{total.toFixed(2)} €</Text>
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
              <View key={doc.id} style={styles.docCard}>
                <TouchableOpacity 
                  style={styles.docCardContent}
                  onPress={() => handleViewDoc(doc)}
                  activeOpacity={0.7}
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
                </TouchableOpacity>
                <View style={styles.docRight}>
                  {doc.amount !== undefined && doc.amount > 0 ? (
                    <Text style={styles.docAmount}>{doc.amount.toFixed(2)} €</Text>
                  ) : (
                    <Text style={styles.docAmountMissing}>-- €</Text>
                  )}
                  <TouchableOpacity 
                    style={styles.editBtn}
                    onPress={() => {
                      console.log('Edit pressed for:', doc.name);
                      handleEditDoc(doc);
                    }}
                    activeOpacity={0.5}
                  >
                    <Ionicons name="create-outline" size={20} color="#f57c00" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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
                <Text style={styles.uploadDesc}>Le montant sera détecté automatiquement</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOption} onPress={handleSelectFile}>
              <View style={[styles.uploadIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="document" size={28} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.uploadLabel}>Sélectionner un fichier</Text>
                <Text style={styles.uploadDesc}>PDF ou image depuis vos fichiers</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* View Document Modal */}
      <Modal visible={showViewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedDoc?.name}</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedDoc && (
              <View style={styles.viewContent}>
                {/* Document Preview */}
                <View style={styles.previewContainer}>
                  {selectedDoc.uri ? (
                    selectedDoc.type === 'image' ? (
                      <Image 
                        source={{ uri: selectedDoc.uri }} 
                        style={styles.previewImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.pdfPreview}>
                        <Ionicons name="document-text" size={64} color="#f57c00" />
                        <Text style={styles.pdfText}>Document PDF</Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.pdfPreview}>
                      <Ionicons name={selectedDoc.type === 'pdf' ? 'document-text' : 'image'} size={64} color="#f57c00" />
                      <Text style={styles.pdfText}>Aperçu non disponible</Text>
                    </View>
                  )}
                </View>

                {/* Document Details */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Catégorie</Text>
                    <View style={[styles.categoryBadge, { backgroundColor: CATEGORIES[selectedDoc.category].color + '20' }]}>
                      <Text style={[styles.categoryText, { color: CATEGORIES[selectedDoc.category].color }]}>
                        {CATEGORIES[selectedDoc.category].label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{selectedDoc.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Montant</Text>
                    <Text style={[styles.detailValue, styles.amountValue]}>
                      {selectedDoc.amount?.toFixed(2)} €
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Taille</Text>
                    <Text style={styles.detailValue}>{selectedDoc.size}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => {
                      setShowViewModal(false);
                      handleEditDoc(selectedDoc);
                    }}
                  >
                    <Ionicons name="pencil" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => {
                      setShowViewModal(false);
                      handleDelete(selectedDoc);
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Document Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalDismiss} 
            activeOpacity={1} 
            onPress={() => setShowEditModal(false)}
          />
          <View style={styles.editModalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier</Text>
              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => setShowEditModal(false)}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedDoc && (
              <ScrollView 
                style={styles.editFormScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Category Picker */}
                <Text style={styles.inputLabel}>Catégorie</Text>
                <View style={styles.categoryPicker}>
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryOption,
                        editCategory === key && { backgroundColor: cat.color + '20', borderColor: cat.color }
                      ]}
                      onPress={() => setEditCategory(key)}
                    >
                      <Ionicons 
                        name={cat.icon as any} 
                        size={18} 
                        color={editCategory === key ? cat.color : Colors.text.secondary} 
                      />
                      <Text style={[
                        styles.categoryOptionText,
                        editCategory === key && { color: cat.color }
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Amount Input - More prominent */}
                <Text style={styles.inputLabel}>Montant</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    value={editAmount}
                    onChangeText={(text) => {
                      // Only allow numbers and decimal point
                      const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                      setEditAmount(cleaned);
                    }}
                    placeholder="0.00"
                    placeholderTextColor={Colors.text.muted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                  <Text style={styles.amountCurrency}>€</Text>
                </View>

                {/* Date Input */}
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="JJ/MM/AAAA"
                  placeholderTextColor={Colors.text.muted}
                  returnKeyType="done"
                />

                {/* Info */}
                <View style={styles.infoBox}>
                  <Ionicons name="sparkles" size={18} color="#f57c00" />
                  <Text style={styles.infoText}>
                    Données extraites automatiquement par IA. Vérifiez et modifiez si besoin.
                  </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </TouchableOpacity>
                
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loading overlay */}
      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Analyse du document...</Text>
          <Text style={styles.loadingSubtext}>Détection du montant en cours</Text>
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
  docCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  docRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  docAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  docAmountMissing: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.muted,
  },
  editBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    marginTop: 4,
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
    flex: 1,
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
  // View Modal
  viewContent: {
    gap: 16,
  },
  previewContainer: {
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  pdfPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  detailsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  deleteBtn: {
    backgroundColor: '#f44336',
  },
  // Edit Modal
  modalDismiss: {
    flex: 1,
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  editFormScroll: {
    flex: 1,
  },
  editForm: {
    gap: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    paddingVertical: 16,
  },
  amountCurrency: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
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
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
});
