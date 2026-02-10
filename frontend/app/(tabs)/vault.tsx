import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import api from '../../src/services/api';
import { AppleDatePickerFR } from '../../src/components/inputs';

// ============ TYPES ============

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

interface InvoiceData {
  confidence: number;
  needsReview: boolean;
  fournisseur?: string;
  dateFacture?: string;
  montantTotal?: number;
  montantHT?: number;
  montantTVA?: number;
  devise?: string;
  categorie?: string;
}

// ============ CONSTANTS ============

const CATEGORIES = {
  travel: { label: 'Voyages', icon: 'airplane' as const, color: '#00796b' },
  invoices: { label: 'Factures', icon: 'receipt' as const, color: '#f57c00' },
  medical: { label: 'Médical', icon: 'medkit' as const, color: '#c2185b' },
  other: { label: 'Autres', icon: 'document' as const, color: '#757575' },
};

const CATEGORY_MAP: Record<string, Document['category']> = {
  'Transport': 'travel',
  'Hébergement': 'travel',
  'Restauration': 'invoices',
  'Médical': 'medical',
  'Matériel': 'invoices',
  'Services': 'invoices',
  'Autre': 'other',
};

const OCR_CATEGORIES = [
  { id: 'Transport', label: 'Transport', color: '#00796b' },
  { id: 'Hébergement', label: 'Hébergement', color: '#1976d2' },
  { id: 'Restauration', label: 'Restauration', color: '#e64a19' },
  { id: 'Médical', label: 'Médical', color: '#c2185b' },
  { id: 'Matériel', label: 'Matériel', color: '#7b1fa2' },
  { id: 'Services', label: 'Services', color: '#0097a7' },
  { id: 'Autre', label: 'Autre', color: '#757575' },
];

const Colors = {
  primary: '#1e3c72',
  text: { primary: '#1a1a1a', secondary: '#666', muted: '#999' },
  background: '#f8f9fa',
};

// ============ COMPONENT ============

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();

  // Core state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Upload/OCR state
  const [isUploading, setIsUploading] = useState(false);
  const [ocrData, setOcrData] = useState<InvoiceData | null>(null);
  const [pendingDocUri, setPendingDocUri] = useState<string | null>(null);
  const [pendingDocType, setPendingDocType] = useState<'pdf' | 'image'>('image');
  const [pendingDocName, setPendingDocName] = useState<string>('');

  // Edit form state
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<string>('other');

  // OCR inline edit state
  const [editedMontant, setEditedMontant] = useState('');
  const [editedDate, setEditedDate] = useState('');
  const [editedFournisseur, setEditedFournisseur] = useState('');
  const [editedCategorie, setEditedCategorie] = useState('Autre');
  const [editedMontantHT, setEditedMontantHT] = useState('');
  const [editedMontantTVA, setEditedMontantTVA] = useState('');

  // Computed values
  const filteredDocs = selectedCategory
    ? documents.filter(d => d.category === selectedCategory)
    : documents;
  const total = filteredDocs.reduce((sum, d) => sum + (d.amount || 0), 0);

  // ============ DATA LOADING ============

  const loadDocuments = useCallback(async () => {
    try {
      const response = await api.get('/api/documents');
      const data = Array.isArray(response.data) ? response.data : [];
      const docs = data.map((doc: any) => ({
        id: doc.id,
        name: doc.name || doc.fournisseur || 'Document',
        category: doc.category || 'other',
        type: doc.fileType === 'pdf' ? 'pdf' : 'image',
        size: doc.hasFile ? 'Fichier' : '--',
        date: doc.dateFacture || '--',
        amount: doc.montantTotal,
        uri: doc.hasFile ? `/api/documents/${doc.id}/file` : undefined,
        fournisseur: doc.fournisseur,
        description: doc.description,
      }));
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDocuments();
  }, [loadDocuments]);

  // ============ UPLOAD HANDLERS ============

  const handleTakePhoto = async () => {
    setShowUploadModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisation d\'accès à la caméra nécessaire');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      processDocumentWithOCR(result.assets[0].uri, 'image', `Photo_${Date.now()}.jpg`);
    }
  };

  const handleSelectFile = async () => {
    setShowUploadModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const type = file.mimeType?.includes('pdf') ? 'pdf' : 'image';
        processDocumentWithOCR(file.uri, type, file.name || `Document_${Date.now()}`);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const processDocumentWithOCR = async (uri: string, type: 'pdf' | 'image', name: string) => {
    setIsUploading(true);
    setPendingDocUri(uri);
    setPendingDocType(type);
    setPendingDocName(name);

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await api.post('/api/invoices/analyze-base64', {
        file_base64: base64,
        file_type: type,
        file_name: name,
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setOcrData(data);
        setEditedFournisseur(data.fournisseur || '');
        setEditedDate(data.dateFacture || '');
        setEditedMontant(data.montantTotal?.toString() || '');
        setEditedMontantHT(data.montantHT?.toString() || '');
        setEditedMontantTVA(data.montantTVA?.toString() || '');
        setEditedCategorie(data.categorie || 'Autre');
        setShowVerificationModal(true);
      } else {
        // OCR failed - create doc with manual entry
        const newDoc: Document = {
          id: `doc-${Date.now()}`,
          name: name,
          category: 'other',
          type: type,
          size: 'Fichier',
          date: new Date().toISOString().split('T')[0],
          uri: uri,
        };
        setDocuments(prev => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
        setEditDate(newDoc.date);
        setEditAmount('');
        setEditCategory('other');
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('OCR error:', error);
      Alert.alert('Erreur', 'Analyse du document échouée');
    } finally {
      setIsUploading(false);
    }
  };

  // ============ VERIFICATION HANDLERS ============

  const handleVerificationSave = async () => {
    const mappedCategory = CATEGORY_MAP[editedCategorie] || 'other';
    const parsedMontant = parseFloat(editedMontant.replace(',', '.')) || 0;
    const parsedMontantHT = parseFloat(editedMontantHT.replace(',', '.')) || undefined;
    const parsedMontantTVA = parseFloat(editedMontantTVA.replace(',', '.')) || undefined;

    try {
      let base64Data = null;
      if (pendingDocUri) {
        base64Data = await FileSystem.readAsStringAsync(pendingDocUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const response = await api.post('/api/documents', {
        userId: 'default-user',
        name: editedFournisseur || pendingDocName,
        fournisseur: editedFournisseur,
        dateFacture: editedDate,
        category: mappedCategory,
        montantTotal: parsedMontant,
        montantHT: parsedMontantHT,
        montantTVA: parsedMontantTVA,
        devise: 'EUR',
        fileBase64: base64Data,
        fileType: pendingDocType,
        fileName: pendingDocName,
      });

      const savedDoc = response.data;
      const newDoc: Document = {
        id: savedDoc.id,
        name: savedDoc.name,
        category: savedDoc.category,
        type: pendingDocType,
        size: 'Fichier',
        date: savedDoc.dateFacture || '--',
        amount: savedDoc.montantTotal,
        uri: `/api/documents/${savedDoc.id}/file`,
        fournisseur: savedDoc.fournisseur,
      };

      setDocuments(prev => [newDoc, ...prev]);
      setShowVerificationModal(false);
      resetOCRState();
      Alert.alert('Succès', 'Document enregistré');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Erreur', 'Échec de l\'enregistrement');
    }
  };

  const handleVerificationCancel = () => {
    setShowVerificationModal(false);
    resetOCRState();
  };

  const resetOCRState = () => {
    setOcrData(null);
    setPendingDocUri(null);
    setPendingDocName('');
    setEditedFournisseur('');
    setEditedDate('');
    setEditedMontant('');
    setEditedMontantHT('');
    setEditedMontantTVA('');
    setEditedCategorie('Autre');
  };

  // ============ EDIT HANDLERS ============

  const handleViewDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setShowViewModal(true);
  };

  const handleEditDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setEditDate(doc.date || '');
    setEditAmount(doc.amount?.toString() || '');
    setEditCategory(doc.category || 'other');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    try {
      await api.put(`/api/documents/${selectedDoc.id}`, {
        dateFacture: editDate,
        montantTotal: parseFloat(editAmount.replace(',', '.')) || 0,
        category: editCategory,
      });

      setDocuments(prev =>
        prev.map(d =>
          d.id === selectedDoc.id
            ? { ...d, date: editDate, amount: parseFloat(editAmount) || 0, category: editCategory as any }
            : d
        )
      );
      setShowEditModal(false);
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Erreur', 'Échec de la mise à jour');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer ce document ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/documents/${docId}`);
            setDocuments(prev => prev.filter(d => d.id !== docId));
            setShowViewModal(false);
            setShowEditModal(false);
          } catch (error) {
            Alert.alert('Erreur', 'Échec de la suppression');
          }
        },
      },
    ]);
  };

  // Date picker handler
  const handleDateSelect = (date: Date) => {
    const formatted = date.toISOString().split('T')[0];
    setEditDate(formatted);
    setShowDatePicker(false);
  };

  const parsedDate = React.useMemo(() => {
    if (editDate) {
      const parts = editDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    return new Date();
  }, [editDate]);

  // ============ RENDER ============

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>{documents.length} document{documents.length > 1 ? 's' : ''}</Text>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryChip,
              selectedCategory === key && { backgroundColor: cat.color + '20', borderColor: cat.color }
            ]}
            onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
          >
            <Ionicons 
              name={cat.icon} 
              size={16} 
              color={selectedCategory === key ? cat.color : Colors.text.secondary} 
            />
            <Text style={[
              styles.categoryChipText,
              selectedCategory === key && { color: cat.color }
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Total */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{total.toFixed(2)} €</Text>
      </View>

      {/* Documents List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView 
          style={styles.list} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
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
                      onPress={() => handleEditDoc(doc)}
                      activeOpacity={0.5}
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
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
        onPress={() => setShowUploadModal(true)}
        testID="fab-add-document"
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="add" size={28} color="#fff" />
        )}
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

            <View style={styles.infoBox}>
              <Ionicons name="sparkles" size={18} color="#f57c00" />
              <Text style={styles.infoText}>Les documents sont analysés automatiquement par OCR.</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Document Modal */}
      <Modal visible={showViewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDoc?.name}</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedDoc && (
              <ScrollView>
                {selectedDoc.uri && (
                  <View style={styles.previewContainer}>
                    {selectedDoc.type === 'pdf' ? (
                      <View style={styles.pdfPlaceholder}>
                        <Ionicons name="document-text" size={64} color={Colors.text.muted} />
                        <Text style={styles.pdfText}>Fichier PDF</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: selectedDoc.uri }} style={styles.previewImage} resizeMode="contain" />
                    )}
                  </View>
                )}

                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Catégorie</Text>
                    <Text style={styles.detailValue}>{CATEGORIES[selectedDoc.category]?.label}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{selectedDoc.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Montant</Text>
                    <Text style={styles.detailValue}>
                      {selectedDoc.amount ? `${selectedDoc.amount.toFixed(2)} €` : '-- €'}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => { setShowViewModal(false); handleEditDoc(selectedDoc); }}>
                    <Ionicons name="create" size={20} color="#fff" />
                    <Text style={styles.actionBtnPrimaryText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDeleteDoc(selectedDoc.id)}>
                    <Ionicons name="trash" size={20} color="#e53935" />
                    <Text style={styles.actionBtnDangerText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Document Modal with Apple Date Picker */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedDoc && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Category */}
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
                      <Ionicons name={cat.icon} size={18} color={editCategory === key ? cat.color : Colors.text.secondary} />
                      <Text style={[styles.categoryOptionText, editCategory === key && { color: cat.color }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Amount */}
                <Text style={styles.inputLabel}>Montant (€)</Text>
                <TextInput
                  style={styles.input}
                  value={editAmount}
                  onChangeText={text => setEditAmount(text.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                  placeholder="0.00"
                  placeholderTextColor={Colors.text.muted}
                  keyboardType="decimal-pad"
                />

                {/* Date with Apple Picker */}
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                  <Text style={styles.dateText}>{editDate || 'Sélectionner une date'}</Text>
                </TouchableOpacity>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Apple Date Picker Overlay */}
            {showDatePicker && (
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.datePickerCancel}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.datePickerTitle}>Date du document</Text>
                    <TouchableOpacity onPress={() => handleDateSelect(parsedDate)}>
                      <Text style={styles.datePickerDone}>OK</Text>
                    </TouchableOpacity>
                  </View>
                  <AppleDatePickerFR value={parsedDate} onChange={handleDateSelect} minYear={2020} maxYear={2030} />
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* OCR Verification Modal */}
      <Modal visible={showVerificationModal} animationType="slide">
        {ocrData && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.verificationContainer}>
            <View style={styles.verificationHeader}>
              <TouchableOpacity onPress={handleVerificationCancel} style={styles.verificationCloseBtn}>
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
              <TouchableOpacity onPress={handleVerificationSave} style={[styles.verificationCloseBtn, styles.verificationSaveBtn]}>
                <Ionicons name="checkmark" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.verificationContent} showsVerticalScrollIndicator={false}>
              {/* Confidence */}
              <View style={styles.confidenceCard}>
                <Ionicons
                  name={ocrData.confidence >= 0.7 ? 'sparkles' : 'warning'}
                  size={20}
                  color={ocrData.confidence >= 0.7 ? '#4CAF50' : '#FF9800'}
                />
                <Text style={styles.confidenceTitle}>
                  Confiance: {Math.round(ocrData.confidence * 100)}%
                </Text>
              </View>

              {/* Form fields */}
              <Text style={styles.inputLabel}>Fournisseur</Text>
              <TextInput
                style={styles.input}
                value={editedFournisseur}
                onChangeText={setEditedFournisseur}
                placeholder="Nom du fournisseur"
                placeholderTextColor={Colors.text.muted}
              />

              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={editedDate}
                onChangeText={setEditedDate}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={Colors.text.muted}
              />

              <Text style={styles.inputLabel}>Montant total (€)</Text>
              <TextInput
                style={styles.input}
                value={editedMontant}
                onChangeText={setEditedMontant}
                placeholder="0.00"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Montant HT (€)</Text>
              <TextInput
                style={styles.input}
                value={editedMontantHT}
                onChangeText={setEditedMontantHT}
                placeholder="0.00"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>TVA (€)</Text>
              <TextInput
                style={styles.input}
                value={editedMontantTVA}
                onChangeText={setEditedMontantTVA}
                placeholder="0.00"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Catégorie</Text>
              <View style={styles.categoryPicker}>
                {OCR_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      editedCategorie === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }
                    ]}
                    onPress={() => setEditedCategorie(cat.id)}
                  >
                    <Text style={[styles.categoryOptionText, editedCategorie === cat.id && { color: cat.color }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleVerificationSave}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.saveBtnText}>Enregistrer le document</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text.primary },
  subtitle: { fontSize: 14, color: Colors.text.secondary, marginTop: 2 },
  categories: { paddingHorizontal: 16, marginBottom: 12 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChipText: { fontSize: 14, fontWeight: '500', color: Colors.text.secondary },
  categoryChipTextActive: { color: '#fff' },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: Colors.text.secondary },
  totalAmount: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  list: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: Colors.text.muted },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  docCardContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  docIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, marginBottom: 2 },
  docMeta: { fontSize: 13, color: Colors.text.muted },
  docRight: { alignItems: 'flex-end', marginLeft: 10 },
  docAmount: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  docAmountMissing: { fontSize: 15, fontWeight: '600', color: '#ccc' },
  editBtn: { padding: 8, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  uploadOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8f9fa', borderRadius: 14, marginBottom: 12 },
  uploadIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  uploadLabel: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, marginBottom: 2 },
  uploadDesc: { fontSize: 13, color: Colors.text.muted },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8e6', padding: 12, borderRadius: 10, marginTop: 8, gap: 8 },
  infoText: { flex: 1, fontSize: 13, color: '#f57c00' },
  previewContainer: { height: 200, backgroundColor: '#f0f0f0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  pdfPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pdfText: { marginTop: 8, fontSize: 14, color: Colors.text.muted },
  detailsContainer: { marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 14, color: Colors.text.secondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, padding: 14, borderRadius: 12, gap: 8 },
  actionBtnPrimaryText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  actionBtnDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffebee', padding: 14, borderRadius: 12, gap: 8 },
  actionBtnDangerText: { fontSize: 15, fontWeight: '600', color: '#e53935' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary, marginBottom: 8, marginTop: 16 },
  input: { padding: 14, backgroundColor: '#f5f5f5', borderRadius: 12, fontSize: 16, color: Colors.text.primary },
  dateButton: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f5f5f5', borderRadius: 12, gap: 10 },
  dateText: { fontSize: 16, color: Colors.text.primary },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  categoryOptionText: { fontSize: 14, fontWeight: '500', color: Colors.text.secondary },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  datePickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  datePickerContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  datePickerCancel: { fontSize: 16, color: Colors.text.muted },
  datePickerTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  datePickerDone: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  verificationContainer: { flex: 1, backgroundColor: '#fff' },
  verificationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#eee' },
  verificationHeaderCenter: { flex: 1, alignItems: 'center' },
  verificationTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  reviewBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4, gap: 4 },
  reviewText: { fontSize: 12, color: '#F44336' },
  verificationCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  verificationSaveBtn: { backgroundColor: '#4CAF50' },
  verificationContent: { flex: 1, padding: 20 },
  confidenceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 16, gap: 8 },
  confidenceTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
});
