import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { Document, documentCategories } from '../../src/types';
import { formatDate, getDaysUntil } from '../../src/utils/dateFormatter';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { documents, addDocument, deleteDocument } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('identity');
  const [newDoc, setNewDoc] = useState({
    name: '',
    expiryDate: '',
    notes: '',
  });

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'identity': return 'id-card';
      case 'contracts': return 'document-text';
      case 'invoices': return 'receipt';
      case 'medical': return 'medkit';
      default: return 'document';
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'identity': return 'Documents d\'identité';
      case 'contracts': return 'Contrats';
      case 'invoices': return 'Factures';
      case 'medical': return 'Médical';
      default: return 'Documents';
    }
  };

  const getDocumentsByCategory = (category: string) => {
    return documents.filter(d => d.category === category);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setNewDoc(prev => ({ ...prev, name: file.name }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleAddDocument = () => {
    if (!newDoc.name) {
      Alert.alert('Erreur', 'Veuillez sélectionner un document');
      return;
    }

    const doc: Document = {
      id: `doc-${Date.now()}`,
      category: selectedCategory as 'identity' | 'contracts' | 'invoices' | 'medical',
      name: newDoc.name,
      fileType: newDoc.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
      uploadedAt: new Date().toISOString(),
      expiryDate: newDoc.expiryDate || undefined,
      notes: newDoc.notes || undefined,
    };

    addDocument(doc);
    setShowAddModal(false);
    setNewDoc({ name: '', expiryDate: '', notes: '' });
  };

  const handleDeleteDocument = (id: string, name: string) => {
    Alert.alert(
      'Supprimer le document',
      `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteDocument(id) },
      ]
    );
  };

  const isExpiringSoon = (expiryDate?: string): boolean => {
    if (!expiryDate) return false;
    const days = getDaysUntil(expiryDate);
    return days >= 0 && days <= 30;
  };

  const renderDocumentCard = (doc: Document) => {
    const expiringSoon = isExpiringSoon(doc.expiryDate);
    const expired = doc.expiryDate && getDaysUntil(doc.expiryDate) < 0;

    return (
      <TouchableOpacity
        key={doc.id}
        style={styles.documentCard}
        onLongPress={() => handleDeleteDocument(doc.id, doc.name)}
      >
        <View style={styles.docIconContainer}>
          <Ionicons
            name={doc.fileType === 'pdf' ? 'document-text' : 'image'}
            size={32}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.docName} numberOfLines={2}>{doc.name}</Text>
        <Text style={styles.docDate}>Ajouté le {formatDate(doc.uploadedAt)}</Text>
        
        {doc.expiryDate && (
          <View style={[
            styles.expiryBadge,
            expired && styles.expiryExpired,
            expiringSoon && !expired && styles.expirySoon
          ]}>
            <Ionicons
              name={expired ? 'alert-circle' : 'time'}
              size={12}
              color={expired ? '#fff' : expiringSoon ? Colors.warning : Colors.text.secondary}
            />
            <Text style={[
              styles.expiryText,
              expired && styles.expiryTextExpired,
              expiringSoon && !expired && styles.expiryTextSoon
            ]}>
              {expired ? 'Expiré' : `Expire: ${formatDate(doc.expiryDate)}`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const categories = ['identity', 'contracts', 'invoices', 'medical'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3c72', '#2a5298']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Coffre-fort</Text>
            <Text style={styles.headerSubtitle}>Documents sécurisés</Text>
          </View>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={24} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{documents.length}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {documents.filter(d => isExpiringSoon(d.expiryDate)).length}
          </Text>
          <Text style={styles.statLabel}>Expirent bientôt</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{categories.length}</Text>
          <Text style={styles.statLabel}>Catégories</Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {categories.map(category => {
          const categoryDocs = getDocumentsByCategory(category);
          const hasExpiring = categoryDocs.some(d => isExpiringSoon(d.expiryDate));

          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <View style={styles.categoryIconContainer}>
                    <Ionicons
                      name={getCategoryIcon(category) as any}
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.categoryTitle}>{getCategoryLabel(category)}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryCount}>{categoryDocs.length}</Text>
                  </View>
                  {hasExpiring && (
                    <View style={styles.alertBadge}>
                      <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.documentsGrid}>
                {categoryDocs.map(doc => renderDocumentCard(doc))}
                
                {/* Add Document Card */}
                <TouchableOpacity
                  style={styles.addDocCard}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowAddModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={36} color={Colors.primary} />
                  <Text style={styles.addDocText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Document Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau document</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectedCategoryBadge}>
              <Ionicons
                name={getCategoryIcon(selectedCategory) as any}
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.selectedCategoryText}>
                {getCategoryLabel(selectedCategory)}
              </Text>
            </View>

            <TouchableOpacity style={styles.pickButton} onPress={handlePickDocument}>
              <Ionicons name="cloud-upload-outline" size={40} color={Colors.primary} />
              <Text style={styles.pickButtonText}>
                {newDoc.name || 'Sélectionner un fichier'}
              </Text>
              <Text style={styles.pickButtonHint}>PDF ou Image</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Date d'expiration (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={newDoc.expiryDate}
              onChangeText={expiryDate => setNewDoc({ ...newDoc, expiryDate })}
              placeholder="YYYY-MM-DD (ex: 2027-06-15)"
              placeholderTextColor={Colors.text.muted}
            />

            <Text style={styles.inputLabel}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={newDoc.notes}
              onChangeText={notes => setNewDoc({ ...newDoc, notes })}
              placeholder="Notes supplémentaires..."
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitBtn, !newDoc.name && styles.submitBtnDisabled]}
              onPress={handleAddDocument}
              disabled={!newDoc.name}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Enregistrer le document</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  lockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  categorySection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  categoryHeader: {
    marginBottom: 12,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  alertBadge: {
    marginLeft: 8,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  docIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  docDate: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.background.secondary,
  },
  expirySoon: {
    backgroundColor: 'rgba(255, 173, 31, 0.15)',
  },
  expiryExpired: {
    backgroundColor: Colors.danger,
  },
  expiryText: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  expiryTextSoon: {
    color: Colors.warning,
    fontWeight: '600',
  },
  expiryTextExpired: {
    color: '#fff',
    fontWeight: '600',
  },
  addDocCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border.light,
    minHeight: 130,
  },
  addDocText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 6,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  selectedCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  selectedCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  pickButton: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border.medium,
    marginBottom: 16,
  },
  pickButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 10,
  },
  pickButtonHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
