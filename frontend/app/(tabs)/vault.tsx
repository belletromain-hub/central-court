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
// Types for OCR data
interface InvoiceLineItem {
  description: string;
  quantite?: number;
  prixUnitaire?: number | null;
  montant?: number | null;
}

interface InvoiceData {
  montantTotal?: number | null;
  montantHT?: number | null;
  montantTVA?: number | null;
  currency?: string;
  numeroFacture?: string | null;
  dateFacture?: string | null;
  fournisseur?: string | null;
  adresse?: string | null;
  categorie?: string;
  lignes?: InvoiceLineItem[];
  confidence?: number;
  needsReview?: boolean;
  description?: string | null;
  fileType?: string;
  pageCount?: number;
  warnings?: string[];
}

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
  fournisseur?: string;
  description?: string;
}

// Categories mapping entre nouveau et ancien format
const CATEGORY_MAP: Record<string, Document['category']> = {
  'Transport': 'travel',
  'Hébergement': 'travel',
  'Restauration': 'invoices',
  'Médical': 'medical',
  'Matériel': 'other',
  'Services': 'invoices',
  'Autre': 'other',
  'travel': 'travel',
  'invoices': 'invoices',
  'medical': 'medical',
  'other': 'other',
};

// Categories for display
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
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<string>('other');
  
  // OCR state
  const [ocrData, setOcrData] = useState<InvoiceData | null>(null);
  const [pendingDocUri, setPendingDocUri] = useState<string | null>(null);
  const [pendingDocType, setPendingDocType] = useState<'pdf' | 'image'>('image');
  const [pendingDocName, setPendingDocName] = useState<string>('');
  
  // Inline edit state for verification
  const [editedMontant, setEditedMontant] = useState<string>('');
  const [editedDate, setEditedDate] = useState<string>('');
  const [editedFournisseur, setEditedFournisseur] = useState<string>('');
  const [editedCategorie, setEditedCategorie] = useState<string>('Autre');
  const [editedMontantHT, setEditedMontantHT] = useState<string>('');
  const [editedMontantTVA, setEditedMontantTVA] = useState<string>('');
  
  // OCR Categories for inline editing
  const OCR_CATEGORIES = [
    { id: 'Transport', label: 'Transport', icon: 'airplane' as const, color: '#00796b' },
    { id: 'Hébergement', label: 'Hébergement', icon: 'bed' as const, color: '#1976d2' },
    { id: 'Restauration', label: 'Restauration', icon: 'restaurant' as const, color: '#e64a19' },
    { id: 'Médical', label: 'Médical', icon: 'medkit' as const, color: '#c2185b' },
    { id: 'Matériel', label: 'Matériel', icon: 'tennisball' as const, color: '#7b1fa2' },
    { id: 'Services', label: 'Services', icon: 'briefcase' as const, color: '#0097a7' },
    { id: 'Autre', label: 'Autre', icon: 'document' as const, color: '#757575' },
  ];

  // Filter documents
  const filteredDocs = selectedCategory 
    ? documents.filter(d => d.category === selectedCategory)
    : documents;

  // Calculate total
  const total = filteredDocs.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Handle photo capture
  const handleTakePhoto = async () => {
    setShowUploadModal(false);
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès à la caméra nécessaire.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processDocumentWithOCR(result.assets[0].uri, 'image', `Photo_${Date.now()}.jpg`);
    }
  };

  // Handle file selection
  const handleSelectFile = async () => {
    setShowUploadModal(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const type = file.mimeType?.includes('pdf') ? 'pdf' : 'image';
        await processDocumentWithOCR(file.uri, type, file.name || `Document_${Date.now()}`);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  // Process document with new OCR system
  const processDocumentWithOCR = async (uri: string, type: 'pdf' | 'image', name: string) => {
    setIsUploading(true);
    setPendingDocUri(uri);
    setPendingDocType(type);
    setPendingDocName(name);

    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Call the new OCR API that supports both images and PDFs
      const response = await api.post('/api/invoices/analyze-base64', {
        image_base64: base64,
        filename: name,
      });
      
      console.log('OCR Response:', response.data);
      
      if (response.data.success && response.data.data) {
        // Store OCR data and initialize edit states
        const data = response.data.data;
        setOcrData(data);
        
        // Initialize inline edit states with OCR values
        setEditedMontant(data.montantTotal?.toString() || '');
        setEditedDate(data.dateFacture || '');
        setEditedFournisseur(data.fournisseur || '');
        setEditedCategorie(data.categorie || 'Autre');
        setEditedMontantHT(data.montantHT?.toString() || '');
        setEditedMontantTVA(data.montantTVA?.toString() || '');
        
        setIsUploading(false);
        setShowVerificationModal(true);
      } else {
        // OCR failed, show basic edit modal
        setIsUploading(false);
        
        const newDoc: Document = {
          id: `doc-${Date.now()}`,
          name,
          category: 'other',
          type,
          size: `${Math.floor(Math.random() * 2000) + 100} KB`,
          date: new Date().toLocaleDateString('fr-FR'),
          amount: undefined,
          uri,
        };
        
        setDocuments(prev => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
        setEditDate(newDoc.date);
        setEditAmount('');
        setEditCategory(newDoc.category);
        setShowEditModal(true);
        
        Alert.alert(
          'Extraction limitée',
          response.data.error || 'Impossible d\'extraire les données automatiquement. Veuillez saisir les informations manuellement.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('OCR Error:', error);
      setIsUploading(false);
      
      // Create document anyway and let user edit manually
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name,
        category: 'other',
        type,
        size: `${Math.floor(Math.random() * 2000) + 100} KB`,
        date: new Date().toLocaleDateString('fr-FR'),
        amount: undefined,
        uri,
      };
      
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setEditDate(newDoc.date);
      setEditAmount('');
      setEditCategory(newDoc.category);
      setShowEditModal(true);
      
      Alert.alert(
        'Erreur OCR',
        'Le service d\'extraction n\'est pas disponible. Veuillez saisir les informations manuellement.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle verification save - uses edited inline values
  const handleVerificationSave = () => {
    const mappedCategory = CATEGORY_MAP[editedCategorie || 'Autre'] || 'other';
    const parsedMontant = parseFloat(editedMontant.replace(',', '.')) || undefined;
    
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: editedFournisseur ? `${editedFournisseur} - ${pendingDocName}` : pendingDocName,
      category: mappedCategory,
      type: pendingDocType,
      size: `${Math.floor(Math.random() * 2000) + 100} KB`,
      date: editedDate || new Date().toLocaleDateString('fr-FR'),
      amount: parsedMontant,
      uri: pendingDocUri || undefined,
      fournisseur: editedFournisseur || undefined,
      description: ocrData?.description || undefined,
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    setShowVerificationModal(false);
    setOcrData(null);
    setPendingDocUri(null);
    setPendingDocName('');
    
    // Reset edit states
    setEditedMontant('');
    setEditedDate('');
    setEditedFournisseur('');
    setEditedCategorie('Autre');
    setEditedMontantHT('');
    setEditedMontantTVA('');
    
    // Show success message
    Alert.alert(
      'Document enregistré',
      `${newDoc.name}\nMontant: ${newDoc.amount?.toFixed(2) || '--'} €`,
      [{ text: 'OK' }]
    );
  };

  // Handle verification cancel
  const handleVerificationCancel = () => {
    setShowVerificationModal(false);
    setOcrData(null);
    setPendingDocUri(null);
    setPendingDocName('');
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
          testID="filter-all"
        >
          <Text style={[styles.filterText, !selectedCategory && styles.filterTextActive]}>Tous</Text>
        </TouchableOpacity>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, selectedCategory === key && styles.filterChipActive]}
            onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
            testID={`filter-${key}`}
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
              <View key={doc.id} style={styles.docCard} testID={`doc-${doc.id}`}>
                <TouchableOpacity 
                  style={styles.docCardContent}
                  onPress={() => handleViewDoc(doc)}
                  activeOpacity={0.7}
                  testID={`doc-view-${doc.id}`}
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
                    onPress={() => handleEditDoc(doc)}
                    activeOpacity={0.5}
                    testID={`doc-edit-${doc.id}`}
                  >
                    <Ionicons name="create-outline" size={20} color="#f57c00" />
                  </TouchableOpacity>
                </View>
              </View>
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
        testID="fab-add-document"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un document</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)} testID="close-upload-modal">
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.uploadOption} onPress={handleTakePhoto} testID="btn-take-photo">
              <View style={[styles.uploadIcon, { backgroundColor: '#4CAF5015' }]}>
                <Ionicons name="camera" size={28} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.uploadLabel}>Prendre une photo</Text>
                <Text style={styles.uploadDesc}>Le montant sera détecté automatiquement</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOption} onPress={handleSelectFile} testID="btn-select-file">
              <View style={[styles.uploadIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="document" size={28} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.uploadLabel}>Sélectionner un fichier</Text>
                <Text style={styles.uploadDesc}>PDF ou image depuis vos fichiers</Text>
              </View>
            </TouchableOpacity>
            
            {/* New: Info about PDF support */}
            <View style={styles.infoBox}>
              <Ionicons name="sparkles" size={18} color="#f57c00" />
              <Text style={styles.infoText}>
                Nouveau ! Les PDF sont maintenant analysés automatiquement.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Document Modal */}
      <Modal visible={showViewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedDoc?.name}</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)} testID="close-view-modal">
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
                    testID="btn-edit-from-view"
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
                    testID="btn-delete-from-view"
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
                testID="close-edit-modal"
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
                      testID={`edit-category-${key}`}
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

                {/* Amount Input */}
                <Text style={styles.inputLabel}>Montant</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    value={editAmount}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                      setEditAmount(cleaned);
                    }}
                    placeholder="0.00"
                    placeholderTextColor={Colors.text.muted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    testID="edit-amount-input"
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
                  testID="edit-date-input"
                />

                {/* Info */}
                <View style={styles.infoBox}>
                  <Ionicons name="sparkles" size={18} color="#f57c00" />
                  <Text style={styles.infoText}>
                    Données extraites automatiquement par IA. Vérifiez et modifiez si besoin.
                  </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} testID="btn-save-edit">
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </TouchableOpacity>
                
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invoice Verification Modal */}
      <Modal visible={showVerificationModal} animationType="slide">
        {ocrData && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.verificationContainer}
          >
            <View style={styles.verificationHeader}>
              <TouchableOpacity onPress={handleVerificationCancel} style={styles.verificationCloseBtn} testID="verification-cancel-btn">
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <View style={styles.verificationHeaderCenter}>
                <Text style={styles.verificationTitle}>Vérifier les données</Text>
                {ocrData.needsReview && (
                  <View style={styles.reviewBadge}>
                    <Ionicons name="alert-circle" size={14} color="#F44336" />
                    <Text style={styles.reviewText}>Vérification requise</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity 
                onPress={handleVerificationSave} 
                style={[styles.verificationCloseBtn, styles.verificationSaveHeaderBtn]}
                testID="verification-save-btn"
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.verificationContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Confidence Score */}
              <View style={styles.confidenceCard}>
                <View style={styles.confidenceHeader}>
                  <Ionicons 
                    name={(ocrData.confidence || 0) >= 0.7 ? 'sparkles' : 'warning'} 
                    size={20} 
                    color={(ocrData.confidence || 0) >= 0.7 ? '#4CAF50' : '#FF9800'} 
                  />
                  <Text style={styles.confidenceTitle}>
                    {(ocrData.confidence || 0) >= 0.9 ? 'Extraction excellente' :
                     (ocrData.confidence || 0) >= 0.7 ? 'Extraction réussie' :
                     'Vérification nécessaire'}
                  </Text>
                </View>
                <View style={styles.confidenceBar}>
                  <View 
                    style={[
                      styles.confidenceFill, 
                      { 
                        width: `${Math.round((ocrData.confidence || 0) * 100)}%`,
                        backgroundColor: (ocrData.confidence || 0) >= 0.7 ? '#4CAF50' : '#FF9800'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.confidencePercent}>
                  Confiance: {Math.round((ocrData.confidence || 0) * 100)}%
                </Text>
              </View>
              
              {/* Main Amount Card - EDITABLE */}
              <View style={styles.mainAmountCard}>
                <Text style={styles.mainAmountLabel}>Montant Total TTC</Text>
                <View style={styles.editableAmountContainer}>
                  <TextInput
                    style={styles.editableAmountInput}
                    value={editedMontant}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                      setEditedMontant(cleaned);
                    }}
                    placeholder="0.00"
                    placeholderTextColor={Colors.text.muted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    testID="edit-montant-total"
                  />
                  <Text style={styles.editableAmountCurrency}>€</Text>
                </View>
                {(ocrData.confidence || 0) < 0.7 && (
                  <View style={styles.lowConfidenceWarning}>
                    <Ionicons name="alert-circle" size={14} color="#F44336" />
                    <Text style={styles.lowConfidenceText}>Vérifiez ce montant</Text>
                  </View>
                )}
              </View>
              
              {/* Category - EDITABLE */}
              <View style={styles.verificationSection}>
                <Text style={styles.verificationSectionTitle}>Catégorie</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesScrollView}
                >
                  {OCR_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChipEditable,
                        editedCategorie === cat.id && { 
                          backgroundColor: cat.color + '20', 
                          borderColor: cat.color 
                        }
                      ]}
                      onPress={() => setEditedCategorie(cat.id)}
                      testID={`edit-category-${cat.id}`}
                    >
                      <Ionicons 
                        name={cat.icon} 
                        size={16} 
                        color={editedCategorie === cat.id ? cat.color : Colors.text.secondary} 
                      />
                      <Text style={[
                        styles.categoryChipLabel,
                        editedCategorie === cat.id && { color: cat.color }
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Basic Info - EDITABLE */}
              <View style={styles.verificationSection}>
                <Text style={styles.verificationSectionTitle}>Informations</Text>
                
                {/* Date Field */}
                <View style={styles.editableFieldContainer}>
                  <View style={styles.editableFieldIcon}>
                    <Ionicons name="calendar" size={18} color={Colors.text.secondary} />
                  </View>
                  <View style={styles.editableFieldContent}>
                    <Text style={styles.editableFieldLabel}>Date</Text>
                    <TextInput
                      style={styles.editableFieldInput}
                      value={editedDate}
                      onChangeText={(text) => {
                        // Auto-format date as JJ/MM/AAAA
                        let cleaned = text.replace(/[^0-9]/g, '');
                        if (cleaned.length >= 2) cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
                        if (cleaned.length >= 5) cleaned = cleaned.slice(0, 5) + '/' + cleaned.slice(5);
                        if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
                        setEditedDate(cleaned);
                      }}
                      placeholder="JJ/MM/AAAA"
                      placeholderTextColor={Colors.text.muted}
                      keyboardType="number-pad"
                      maxLength={10}
                      testID="edit-date"
                    />
                  </View>
                </View>
                
                {/* Fournisseur Field */}
                <View style={styles.editableFieldContainer}>
                  <View style={styles.editableFieldIcon}>
                    <Ionicons name="business" size={18} color={Colors.text.secondary} />
                  </View>
                  <View style={styles.editableFieldContent}>
                    <Text style={styles.editableFieldLabel}>Fournisseur</Text>
                    <TextInput
                      style={styles.editableFieldInput}
                      value={editedFournisseur}
                      onChangeText={setEditedFournisseur}
                      placeholder="Nom du fournisseur"
                      placeholderTextColor={Colors.text.muted}
                      testID="edit-fournisseur"
                    />
                  </View>
                </View>
                
                {/* N° Facture (read-only) */}
                {ocrData.numeroFacture && (
                  <View style={styles.verificationInfoRow}>
                    <Ionicons name="document-text" size={18} color={Colors.text.secondary} />
                    <Text style={styles.verificationInfoLabel}>N° Facture</Text>
                    <Text style={styles.verificationInfoValue}>{ocrData.numeroFacture}</Text>
                  </View>
                )}
              </View>
              
              {/* Detailed Amounts - EDITABLE */}
              <View style={styles.verificationSection}>
                <Text style={styles.verificationSectionTitle}>Détail des montants</Text>
                <View style={styles.amountsGrid}>
                  <View style={styles.amountBoxEditable}>
                    <Text style={styles.amountBoxLabel}>HT</Text>
                    <View style={styles.amountBoxInputRow}>
                      <TextInput
                        style={styles.amountBoxInput}
                        value={editedMontantHT}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                          setEditedMontantHT(cleaned);
                        }}
                        placeholder="--"
                        placeholderTextColor={Colors.text.muted}
                        keyboardType="decimal-pad"
                        testID="edit-montant-ht"
                      />
                      <Text style={styles.amountBoxCurrency}>€</Text>
                    </View>
                  </View>
                  <View style={styles.amountBoxEditable}>
                    <Text style={styles.amountBoxLabel}>TVA</Text>
                    <View style={styles.amountBoxInputRow}>
                      <TextInput
                        style={styles.amountBoxInput}
                        value={editedMontantTVA}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                          setEditedMontantTVA(cleaned);
                        }}
                        placeholder="--"
                        placeholderTextColor={Colors.text.muted}
                        keyboardType="decimal-pad"
                        testID="edit-montant-tva"
                      />
                      <Text style={styles.amountBoxCurrency}>€</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Line Items */}
              {ocrData.lignes && ocrData.lignes.length > 0 && (
                <View style={styles.verificationSection}>
                  <Text style={styles.verificationSectionTitle}>
                    Lignes de facture ({ocrData.lignes.length})
                  </Text>
                  {ocrData.lignes.map((ligne, index) => (
                    <View key={index} style={styles.lineItem}>
                      <Text style={styles.lineDescription} numberOfLines={2}>
                        {ligne.description || 'Article'}
                      </Text>
                      {ligne.montant && (
                        <Text style={styles.lineMontant}>{ligne.montant.toFixed(2)} €</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              {/* Description */}
              {ocrData.description && (
                <View style={styles.verificationSection}>
                  <Text style={styles.verificationSectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{ocrData.description}</Text>
                </View>
              )}
              
              {/* Action Buttons */}
              <View style={styles.verificationActions}>
                <TouchableOpacity 
                  style={styles.verificationCancelBtn} 
                  onPress={handleVerificationCancel}
                  testID="btn-cancel"
                >
                  <Text style={styles.verificationCancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.verificationSaveBtn} 
                  onPress={handleVerificationSave}
                  testID="btn-save"
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.verificationSaveBtnText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Loading overlay */}
      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Analyse du document...</Text>
          <Text style={styles.loadingSubtext}>Extraction des données en cours</Text>
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
    minHeight: 400,
    maxHeight: '80%',
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
    flexGrow: 1,
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
    marginBottom: 16,
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
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
  // Invoice Verification Modal Styles
  verificationContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  verificationCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  verificationSaveHeaderBtn: {
    backgroundColor: Colors.primary,
  },
  verificationHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reviewText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  verificationContent: {
    flex: 1,
    padding: 16,
  },
  confidenceCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  confidenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidencePercent: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'right',
  },
  mainAmountCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  mainAmountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  mainAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainAmountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
  },
  mainAmountCurrency: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  verificationSection: {
    marginBottom: 20,
  },
  verificationSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verificationCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  verificationCategoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verificationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  verificationInfoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  verificationInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  amountsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  amountBox: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  amountBoxLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  amountBoxValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  lineDescription: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  lineMontant: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
  },
  verificationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  verificationCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  verificationCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  verificationSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  verificationSaveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Editable fields styles
  editableAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  editableAmountInput: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
  },
  editableAmountCurrency: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  lowConfidenceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  lowConfidenceText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  categoriesScrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryChipEditable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  editableFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  editableFieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  editableFieldContent: {
    flex: 1,
  },
  editableFieldLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  editableFieldInput: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    padding: 0,
  },
  amountBoxEditable: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  amountBoxInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBoxInput: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    minWidth: 60,
    padding: 0,
  },
  amountBoxCurrency: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginLeft: 2,
  },
});
