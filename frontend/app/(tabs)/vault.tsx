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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Colors from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { Document, teamTypes, TeamType } from '../../src/types';
import { formatDate, getDaysUntil } from '../../src/utils/dateFormatter';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { documents, addDocument, deleteDocument, updateDocumentSharing } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('identity');
  const [newDoc, setNewDoc] = useState({
    name: '',
    expiryDate: '',
    notes: '',
    fileUri: '',
  });
  const [selectedTeams, setSelectedTeams] = useState<TeamType[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

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
        setNewDoc(prev => ({ 
          ...prev, 
          name: file.name,
          fileUri: file.uri 
        }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  // Open document preview modal
  const handleOpenDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setShowDocModal(true);
  };

  // Download/share document
  const handleDownloadDoc = async (doc: Document) => {
    if (!doc.fileUri) {
      Alert.alert('Erreur', 'Ce document n\'a pas de fichier associé');
      return;
    }

    setIsDownloading(true);
    try {
      if (Platform.OS === 'web') {
        // On web, use native download
        const link = document.createElement('a');
        link.href = doc.fileUri;
        link.download = doc.name;
        link.click();
      } else {
        // On mobile, use sharing
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          // Copy to a shareable location if needed
          const filename = doc.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const targetUri = `${FileSystem.cacheDirectory}${filename}`;
          
          // If the file is already in the cache, share directly
          // Otherwise, we need to handle the case where file is external
          try {
            const fileInfo = await FileSystem.getInfoAsync(doc.fileUri);
            if (fileInfo.exists) {
              await Sharing.shareAsync(doc.fileUri, {
                mimeType: doc.fileType === 'pdf' ? 'application/pdf' : 'image/*',
                dialogTitle: `Partager ${doc.name}`,
              });
            } else {
              // File doesn't exist, show demo message
              Alert.alert(
                'Démo', 
                'Dans la version complète, ce document serait téléchargé depuis le serveur et partagé.',
                [{ text: 'OK' }]
              );
            }
          } catch {
            Alert.alert(
              'Partager', 
              `Le document "${doc.name}" serait partagé ici.`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le document');
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleTeam = (teamId: TeamType) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(t => t !== teamId)
        : [...prev, teamId]
    );
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
      fileUri: newDoc.fileUri || undefined,
      uploadedAt: new Date().toISOString(),
      expiryDate: newDoc.expiryDate || undefined,
      notes: newDoc.notes || undefined,
      sharedWith: selectedTeams,
    };

    addDocument(doc);
    setShowAddModal(false);
    setNewDoc({ name: '', expiryDate: '', notes: '', fileUri: '' });
    setSelectedTeams([]);
  };

  const handleOpenShare = (doc: Document) => {
    setSelectedDoc(doc);
    setSelectedTeams(doc.sharedWith || []);
    setShowShareModal(true);
  };

  const handleSaveSharing = () => {
    if (selectedDoc) {
      updateDocumentSharing(selectedDoc.id, selectedTeams);
    }
    setShowShareModal(false);
    setSelectedDoc(null);
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
    const sharedCount = doc.sharedWith?.length || 0;

    return (
      <TouchableOpacity
        key={doc.id}
        style={styles.documentCard}
        onPress={() => handleOpenShare(doc)}
        onLongPress={() => handleDeleteDocument(doc.id, doc.name)}
      >
        <View style={styles.docIconContainer}>
          <Ionicons
            name={doc.fileType === 'pdf' ? 'document-text' : 'image'}
            size={28}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.docName} numberOfLines={2}>{doc.name}</Text>
        
        {/* Sharing indicator */}
        <View style={styles.sharingRow}>
          {sharedCount > 0 ? (
            <View style={styles.sharedBadge}>
              <Ionicons name="people" size={12} color={Colors.success} />
              <Text style={styles.sharedText}>{sharedCount} équipe{sharedCount > 1 ? 's' : ''}</Text>
            </View>
          ) : (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={12} color={Colors.text.muted} />
              <Text style={styles.privateText}>Privé</Text>
            </View>
          )}
        </View>
        
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
              {expired ? 'Expiré' : formatDate(doc.expiryDate)}
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
            <Text style={styles.headerTitle}>Documents</Text>
            <Text style={styles.headerSubtitle}>Coffre-fort sécurisé</Text>
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
            {documents.filter(d => (d.sharedWith?.length || 0) > 0).length}
          </Text>
          <Text style={styles.statLabel}>Partagés</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, documents.filter(d => isExpiringSoon(d.expiryDate)).length > 0 && styles.statDanger]}>
            {documents.filter(d => isExpiringSoon(d.expiryDate)).length}
          </Text>
          <Text style={styles.statLabel}>Expirent</Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {categories.map(category => {
          const categoryDocs = getDocumentsByCategory(category);

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
                </View>
              </View>

              <View style={styles.documentsGrid}>
                {categoryDocs.map(doc => renderDocumentCard(doc))}
                
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

            <ScrollView showsVerticalScrollIndicator={false}>
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

              {/* Team Sharing */}
              <Text style={styles.inputLabel}>Partager avec</Text>
              <View style={styles.teamGrid}>
                {teamTypes.map(team => (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.teamOption,
                      selectedTeams.includes(team.id) && { backgroundColor: team.color + '20', borderColor: team.color }
                    ]}
                    onPress={() => toggleTeam(team.id)}
                  >
                    <Ionicons
                      name={team.icon as any}
                      size={20}
                      color={selectedTeams.includes(team.id) ? team.color : Colors.text.secondary}
                    />
                    <Text style={[
                      styles.teamOptionText,
                      selectedTeams.includes(team.id) && { color: team.color }
                    ]}>
                      {team.label}
                    </Text>
                    {selectedTeams.includes(team.id) && (
                      <Ionicons name="checkmark-circle" size={16} color={team.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, !newDoc.name && styles.submitBtnDisabled]}
                onPress={handleAddDocument}
                disabled={!newDoc.name}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Share Document Modal */}
      <Modal visible={showShareModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Partager le document</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedDoc && (
              <View style={styles.docPreview}>
                <Ionicons name="document-text" size={32} color={Colors.primary} />
                <Text style={styles.docPreviewName}>{selectedDoc.name}</Text>
              </View>
            )}

            <Text style={styles.shareLabel}>Choisir les équipes</Text>
            <View style={styles.teamList}>
              {teamTypes.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamListItem,
                    selectedTeams.includes(team.id) && styles.teamListItemSelected
                  ]}
                  onPress={() => toggleTeam(team.id)}
                >
                  <View style={[styles.teamListIcon, { backgroundColor: team.color + '20' }]}>
                    <Ionicons name={team.icon as any} size={22} color={team.color} />
                  </View>
                  <Text style={styles.teamListName}>{team.label}</Text>
                  <View style={[
                    styles.checkbox,
                    selectedTeams.includes(team.id) && { backgroundColor: team.color, borderColor: team.color }
                  ]}>
                    {selectedTeams.includes(team.id) && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveSharing}>
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Enregistrer le partage</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  statDanger: {
    color: Colors.danger,
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
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  docIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  docName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  sharingRow: {
    marginBottom: 6,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(23, 191, 99, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sharedText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '600',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  privateText: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
    fontSize: 9,
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
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border.light,
    minHeight: 130,
  },
  addDocText: {
    fontSize: 12,
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
    maxHeight: '85%',
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
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border.medium,
    marginBottom: 16,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 8,
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
    marginBottom: 8,
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
  teamGrid: {
    gap: 8,
  },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  teamOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  docPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  docPreviewName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  shareLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  teamList: {
    gap: 8,
  },
  teamListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  teamListItemSelected: {
    backgroundColor: '#fff',
  },
  teamListIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamListName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    marginLeft: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
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
