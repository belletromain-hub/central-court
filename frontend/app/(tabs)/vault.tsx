import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
  Image,
  TextInput,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Colors from '../../src/constants/colors';

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
  || process.env.EXPO_PUBLIC_BACKEND_URL 
  || 'https://tennistrack-6.preview.emergentagent.com';

const PROFILE_STORAGE_KEY = '@central_court_player_profile';

// Document categories V1
const DOCUMENT_CATEGORIES = {
  travel: { name: 'Voyages', icon: 'airplane', emoji: '✈️', color: '#00796b' },
  invoices: { name: 'Factures', icon: 'receipt', emoji: '🧾', color: '#f57c00' },
  medical: { name: 'Médical', icon: 'medkit', emoji: '🏥', color: '#c2185b' },
  other: { name: 'Autres', icon: 'document', emoji: '📄', color: '#757575' },
};

type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;

interface DocumentV1 {
  id: string;
  name: string;
  category: DocumentCategory;
  fileUri: string;
  fileType: 'pdf' | 'image';
  uploadedAt: string;
  month: string; // Format: "2026-02"
  amount?: number;
}

// Demo documents
const INITIAL_DOCUMENTS: DocumentV1[] = [
  {
    id: 'doc-001',
    name: 'Billet_avion_Rotterdam.pdf',
    category: 'travel',
    fileUri: '',
    fileType: 'pdf',
    uploadedAt: '2026-02-01T10:30:00',
    month: '2026-02',
    amount: 285,
  },
  {
    id: 'doc-002',
    name: 'Hotel_Hilton_Rotterdam.pdf',
    category: 'travel',
    fileUri: '',
    fileType: 'pdf',
    uploadedAt: '2026-02-01T10:35:00',
    month: '2026-02',
    amount: 920,
  },
  {
    id: 'doc-003',
    name: 'Facture_kine_04fev.jpg',
    category: 'medical',
    fileUri: '',
    fileType: 'image',
    uploadedAt: '2026-02-04T17:30:00',
    month: '2026-02',
    amount: 80,
  },
  {
    id: 'doc-004',
    name: 'Facture_kine_07fev.jpg',
    category: 'medical',
    fileUri: '',
    fileType: 'image',
    uploadedAt: '2026-02-07T19:15:00',
    month: '2026-02',
    amount: 90,
  },
  {
    id: 'doc-005',
    name: 'Restaurant_equipe.jpg',
    category: 'invoices',
    fileUri: '',
    fileType: 'image',
    uploadedAt: '2026-02-05T21:00:00',
    month: '2026-02',
    amount: 125,
  },
  {
    id: 'doc-006',
    name: 'Taxi_aeroport.pdf',
    category: 'invoices',
    fileUri: '',
    fileType: 'pdf',
    uploadedAt: '2026-02-08T08:00:00',
    month: '2026-02',
    amount: 45,
  },
];

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  
  // State
  const [documents, setDocuments] = useState<DocumentV1[]>(INITIAL_DOCUMENTS);
  const [selectedMonth, setSelectedMonth] = useState('2026-02');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showOCRResultModal, setShowOCRResultModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [accountantEmail, setAccountantEmail] = useState<string | null>(null);
  
  // OCR Result state
  const [ocrResult, setOcrResult] = useState<{
    uri: string;
    type: 'pdf' | 'image';
    date: string;
    amount: string;
    category: DocumentCategory;
    merchant: string;
    confidence: string;
  } | null>(null);
  
  // Load accountant email from profile
  useEffect(() => {
    loadAccountantEmail();
  }, []);
  
  const loadAccountantEmail = async () => {
    try {
      const profileData = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (profileData) {
        const profile = JSON.parse(profileData);
        if (profile.accountantEmail) {
          setAccountantEmail(profile.accountantEmail);
        }
      }
    } catch (error) {
      console.error('Error loading accountant email:', error);
    }
  };
  
  // Available months
  const availableMonths = useMemo(() => {
    const months = [...new Set(documents.map(d => d.month))];
    return months.sort().reverse();
  }, [documents]);
  
  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const monthMatch = doc.month === selectedMonth;
      const categoryMatch = selectedCategory === 'all' || doc.category === selectedCategory;
      return monthMatch && categoryMatch;
    });
  }, [documents, selectedMonth, selectedCategory]);
  
  // Group by category
  const documentsByCategory = useMemo(() => {
    const grouped: Record<string, DocumentV1[]> = {};
    filteredDocuments.forEach(doc => {
      if (!grouped[doc.category]) grouped[doc.category] = [];
      grouped[doc.category].push(doc);
    });
    return grouped;
  }, [filteredDocuments]);
  
  // Calculate totals
  const monthTotals = useMemo(() => {
    const monthDocs = documents.filter(d => d.month === selectedMonth);
    const totals: Record<DocumentCategory, number> = {
      travel: 0,
      invoices: 0,
      medical: 0,
      other: 0,
    };
    monthDocs.forEach(doc => {
      if (doc.amount) totals[doc.category] += doc.amount;
    });
    return {
      ...totals,
      total: Object.values(totals).reduce((sum, val) => sum + val, 0)
    };
  }, [documents, selectedMonth]);
  
  // Format month label
  const formatMonthLabel = (month: string) => {
    const [year, m] = month.split('-');
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[parseInt(m) - 1]} ${year}`;
  };
  
  // Handle photo capture
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire pour prendre des photos.');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setShowUploadModal(false);
      await analyzeWithOCR(result.assets[0].uri, 'image');
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
        const fileType = file.mimeType?.includes('pdf') ? 'pdf' : 'image';
        setShowUploadModal(false);
        
        // PDFs don't support OCR in V1, add directly
        if (fileType === 'pdf') {
          await addDocument(file.uri, 'pdf', 'invoices', file.name);
        } else {
          await analyzeWithOCR(file.uri, 'image', file.name);
        }
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };
  
  // Analyze image with OCR
  const analyzeWithOCR = async (uri: string, type: 'pdf' | 'image', name?: string) => {
    setIsAnalyzing(true);
    
    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Call OCR endpoint
      const response = await fetch(`${API_BASE_URL}/api/ocr/analyze-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: base64,
        }),
      });
      
      const ocrData = await response.json();
      
      if (ocrData.success) {
        // Show OCR result modal for user to confirm/edit
        setOcrResult({
          uri,
          type,
          date: ocrData.date || '',
          amount: ocrData.amount?.toString() || '',
          category: ocrData.category || 'invoices',
          merchant: ocrData.merchant || '',
          confidence: ocrData.confidence || 'low',
        });
        setShowOCRResultModal(true);
      } else {
        // OCR failed, add document without extracted data
        console.log('OCR failed:', ocrData.error);
        await addDocument(uri, type, 'invoices', name);
      }
    } catch (error) {
      console.error('OCR error:', error);
      // Fallback: add document without OCR
      await addDocument(uri, type, 'invoices', name);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Confirm OCR result and save document
  const handleConfirmOCR = async () => {
    if (!ocrResult) return;
    
    setIsUploading(true);
    setShowOCRResultModal(false);
    
    const now = new Date();
    let month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Parse date from OCR result if available
    if (ocrResult.date) {
      const parts = ocrResult.date.split('/');
      if (parts.length === 3) {
        month = `${parts[2]}-${parts[1].padStart(2, '0')}`;
      }
    }
    
    const fileName = ocrResult.merchant 
      ? `${ocrResult.merchant.replace(/[^a-zA-Z0-9]/g, '_')}_${now.getTime()}.jpg`
      : `Facture_${now.getTime()}.jpg`;
    
    const newDoc: DocumentV1 = {
      id: `doc-${Date.now()}`,
      name: fileName,
      category: ocrResult.category,
      fileUri: ocrResult.uri,
      fileType: ocrResult.type,
      uploadedAt: now.toISOString(),
      month,
      amount: ocrResult.amount ? parseFloat(ocrResult.amount) : undefined,
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    setIsUploading(false);
    setOcrResult(null);
    
    Alert.alert(
      '✅ Document ajouté', 
      `${fileName} a été classé dans ${formatMonthLabel(month)}${ocrResult.amount ? `\nMontant: ${ocrResult.amount}€` : ''}`
    );
  };
  
  // Add document
  const addDocument = async (uri: string, type: 'pdf' | 'image', category: DocumentCategory, name?: string) => {
    setIsUploading(true);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const fileName = name || `${DOCUMENT_CATEGORIES[category].name}_${now.getTime()}.${type === 'pdf' ? 'pdf' : 'jpg'}`;
    
    const newDoc: DocumentV1 = {
      id: `doc-${Date.now()}`,
      name: fileName,
      category,
      fileUri: uri,
      fileType: type,
      uploadedAt: now.toISOString(),
      month,
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    setIsUploading(false);
    setShowUploadModal(false);
    
    Alert.alert('✅ Document ajouté', `${fileName} a été classé dans ${formatMonthLabel(month)}`);
  };
  
  // Handle export
  const handleExport = async (method: 'email' | 'download') => {
    const monthDocs = documents.filter(d => d.month === selectedMonth);
    
    if (monthDocs.length === 0) {
      Alert.alert('Aucun document', 'Pas de documents à exporter pour ce mois.');
      return;
    }
    
    const monthLabel = formatMonthLabel(selectedMonth);
    const docList = monthDocs.map(d => `- ${d.name}${d.amount ? ` (${d.amount}€)` : ''}`).join('\n');
    const totalAmount = monthTotals.total;
    
    const message = `📋 Documents ${monthLabel}\n\n${docList}\n\n💰 Total: ${totalAmount}€`;
    
    if (method === 'email') {
      // Use accountant email if available
      if (accountantEmail) {
        const subject = encodeURIComponent(`Documents ${monthLabel} - Tennis Assistant`);
        const body = encodeURIComponent(message);
        const mailtoUrl = `mailto:${accountantEmail}?subject=${subject}&body=${body}`;
        
        try {
          const canOpen = await Linking.canOpenURL(mailtoUrl);
          if (canOpen) {
            await Linking.openURL(mailtoUrl);
            setShowExportModal(false);
          } else {
            // Fallback to Share
            await Share.share({
              message,
              title: `Documents ${monthLabel}`,
            });
            setShowExportModal(false);
          }
        } catch (error) {
          console.error('Mail error:', error);
          await Share.share({ message, title: `Documents ${monthLabel}` });
          setShowExportModal(false);
        }
      } else {
        // No accountant email, use generic share
        try {
          await Share.share({
            message,
            title: `Documents ${monthLabel}`,
          });
          setShowExportModal(false);
        } catch (error) {
          console.error('Share error:', error);
        }
      }
    } else {
      // In real app, would create a zip file
      Alert.alert(
        'Export',
        `${monthDocs.length} documents seraient téléchargés.\n\nTotal: ${totalAmount}€`,
        [{ text: 'OK', onPress: () => setShowExportModal(false) }]
      );
    }
  };
  
  // Delete document
  const handleDeleteDocument = (docId: string, docName: string) => {
    Alert.alert(
      'Supprimer',
      `Voulez-vous supprimer "${docName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => setDocuments(prev => prev.filter(d => d.id !== docId))
        }
      ]
    );
  };
  
  // Render document card
  const renderDocumentCard = (doc: DocumentV1) => {
    const categoryInfo = DOCUMENT_CATEGORIES[doc.category];
    return (
      <TouchableOpacity
        key={doc.id}
        style={styles.documentCard}
        onLongPress={() => handleDeleteDocument(doc.id, doc.name)}
      >
        <View style={[styles.docIcon, { backgroundColor: categoryInfo.color + '15' }]}>
          <Ionicons 
            name={doc.fileType === 'pdf' ? 'document-text' : 'image'} 
            size={24} 
            color={categoryInfo.color} 
          />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
          <Text style={styles.docDate}>
            {new Date(doc.uploadedAt).toLocaleDateString('fr-FR', { 
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
            })}
          </Text>
        </View>
        {doc.amount && (
          <Text style={styles.docAmount}>{doc.amount}€</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#f57c00', '#ff9800']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🧾 Documents</Text>
          <Text style={styles.headerSubtitle}>{filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''}</Text>
        </View>
        
        {/* Quick Stats */}
        <TouchableOpacity 
          style={styles.financeCard}
          onPress={() => setShowFinanceModal(true)}
        >
          <View style={styles.financeMain}>
            <Text style={styles.financeLabel}>Dépenses {formatMonthLabel(selectedMonth)}</Text>
            <Text style={styles.financeAmount}>{monthTotals.total}€</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </LinearGradient>
      
      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthList}>
          {availableMonths.map(month => (
            <TouchableOpacity
              key={month}
              style={[styles.monthChip, selectedMonth === month && styles.monthChipSelected]}
              onPress={() => setSelectedMonth(month)}
            >
              <Text style={[styles.monthChipText, selectedMonth === month && styles.monthChipTextSelected]}>
                {formatMonthLabel(month).split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportModal(true)}>
          <Ionicons name="download-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipSelected]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextSelected]}>
            Tous
          </Text>
        </TouchableOpacity>
        {(Object.entries(DOCUMENT_CATEGORIES) as [DocumentCategory, typeof DOCUMENT_CATEGORIES.travel][]).map(([key, cat]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryChip, 
              selectedCategory === key && { backgroundColor: cat.color + '15', borderColor: cat.color }
            ]}
            onPress={() => setSelectedCategory(key)}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[
              styles.categoryChipText, 
              selectedCategory === key && { color: cat.color }
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Documents List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.entries(documentsByCategory).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>Aucun document</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez vos factures et reçus
            </Text>
          </View>
        ) : (
          Object.entries(documentsByCategory).map(([category, docs]) => {
            const categoryInfo = DOCUMENT_CATEGORIES[category as DocumentCategory];
            const categoryTotal = docs.reduce((sum, d) => sum + (d.amount || 0), 0);
            
            return (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categorySectionHeader}>
                  <View style={styles.categorySectionTitle}>
                    <Text style={styles.categorySectionEmoji}>{categoryInfo.emoji}</Text>
                    <Text style={styles.categorySectionName}>{categoryInfo.name}</Text>
                    <View style={styles.categorySectionCount}>
                      <Text style={styles.categorySectionCountText}>{docs.length}</Text>
                    </View>
                  </View>
                  {categoryTotal > 0 && (
                    <Text style={[styles.categorySectionTotal, { color: categoryInfo.color }]}>
                      {categoryTotal}€
                    </Text>
                  )}
                </View>
                {docs.map(renderDocumentCard)}
              </View>
            );
          })
        )}
        
        {/* Help text */}
        <View style={styles.helpText}>
          <Ionicons name="information-circle" size={16} color={Colors.text.muted} />
          <Text style={styles.helpTextContent}>
            Appui long sur un document pour le supprimer
          </Text>
        </View>
        
        <View style={{ height: 120 }} />
      </ScrollView>
      
      {/* FAB - Add Document */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowUploadModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      
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
            
            {isUploading ? (
              <View style={styles.uploadingState}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.uploadingText}>Upload en cours...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.uploadSubtitle}>
                  Le document sera classé automatiquement par date d'upload
                </Text>
                
                <View style={styles.uploadOptions}>
                  <TouchableOpacity style={styles.uploadOption} onPress={handleTakePhoto}>
                    <View style={[styles.uploadOptionIcon, { backgroundColor: '#4CAF50' + '15' }]}>
                      <Ionicons name="camera" size={32} color="#4CAF50" />
                    </View>
                    <Text style={styles.uploadOptionLabel}>📸 Prendre une photo</Text>
                    <Text style={styles.uploadOptionDesc}>Photographiez votre reçu</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.uploadOption} onPress={handleSelectFile}>
                    <View style={[styles.uploadOptionIcon, { backgroundColor: Colors.primary + '15' }]}>
                      <Ionicons name="document" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.uploadOptionLabel}>📁 Sélectionner un fichier</Text>
                    <Text style={styles.uploadOptionDesc}>PDF ou image (max 10 MB)</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Export Modal */}
      <Modal visible={showExportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exporter {formatMonthLabel(selectedMonth)}</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.exportSummary}>
              <Text style={styles.exportSummaryLabel}>Documents à exporter</Text>
              <Text style={styles.exportSummaryCount}>
                {documents.filter(d => d.month === selectedMonth).length} fichiers
              </Text>
              <Text style={styles.exportSummaryTotal}>Total: {monthTotals.total}€</Text>
            </View>
            
            <View style={styles.exportOptions}>
              <TouchableOpacity 
                style={styles.exportOption}
                onPress={() => handleExport('email')}
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: '#1976d2' + '15' }]}>
                  <Ionicons name="mail" size={28} color="#1976d2" />
                </View>
                <View style={styles.exportOptionInfo}>
                  <Text style={styles.exportOptionLabel}>Envoyer par email</Text>
                  <Text style={styles.exportOptionDesc}>Partager avec votre comptable</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.exportOption}
                onPress={() => handleExport('download')}
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: '#4CAF50' + '15' }]}>
                  <Ionicons name="download" size={28} color="#4CAF50" />
                </View>
                <View style={styles.exportOptionInfo}>
                  <Text style={styles.exportOptionLabel}>Télécharger (ZIP)</Text>
                  <Text style={styles.exportOptionDesc}>Tous les fichiers du mois</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Finance Summary Modal */}
      <Modal visible={showFinanceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Dépenses {formatMonthLabel(selectedMonth)}</Text>
              <TouchableOpacity onPress={() => setShowFinanceModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.financeTotal}>
              <Text style={styles.financeTotalLabel}>Total du mois</Text>
              <Text style={styles.financeTotalAmount}>{monthTotals.total}€</Text>
            </View>
            
            <View style={styles.financeBreakdown}>
              {(Object.entries(DOCUMENT_CATEGORIES) as [DocumentCategory, typeof DOCUMENT_CATEGORIES.travel][]).map(([key, cat]) => {
                const amount = monthTotals[key];
                const percentage = monthTotals.total > 0 ? Math.round((amount / monthTotals.total) * 100) : 0;
                
                return (
                  <View key={key} style={styles.financeRow}>
                    <View style={styles.financeRowLeft}>
                      <Text style={styles.financeRowEmoji}>{cat.emoji}</Text>
                      <Text style={styles.financeRowName}>{cat.name}</Text>
                    </View>
                    <View style={styles.financeRowRight}>
                      <View style={styles.financeBarContainer}>
                        <View 
                          style={[
                            styles.financeBar, 
                            { width: `${percentage}%`, backgroundColor: cat.color }
                          ]} 
                        />
                      </View>
                      <Text style={styles.financeRowAmount}>{amount}€</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.financeNote}>
              <Ionicons name="information-circle" size={16} color={Colors.text.secondary} />
              <Text style={styles.financeNoteText}>
                Les montants sont calculés à partir des factures uploadées. 
                Pour une comptabilité complète, utilisez l'export mensuel.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* OCR Analysis Modal */}
      <Modal visible={isAnalyzing} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.analyzingContent}>
            <View style={styles.analyzingIcon}>
              <Ionicons name="scan" size={48} color={Colors.primary} />
            </View>
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
            <Text style={styles.analyzingTitle}>🤖 Analyse IA en cours...</Text>
            <Text style={styles.analyzingSubtitle}>
              Extraction automatique de la date, du montant et de la catégorie
            </Text>
          </View>
        </View>
      </Modal>
      
      {/* OCR Result Modal */}
      <Modal visible={showOCRResultModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Données extraites</Text>
              <TouchableOpacity onPress={() => {
                setShowOCRResultModal(false);
                setOcrResult(null);
              }}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            {ocrResult && (
              <>
                {/* Confidence badge */}
                <View style={[
                  styles.confidenceBadge,
                  ocrResult.confidence === 'high' && styles.confidenceHigh,
                  ocrResult.confidence === 'medium' && styles.confidenceMedium,
                  ocrResult.confidence === 'low' && styles.confidenceLow,
                ]}>
                  <Ionicons 
                    name={ocrResult.confidence === 'high' ? 'checkmark-circle' : 'information-circle'} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={styles.confidenceText}>
                    Confiance {ocrResult.confidence === 'high' ? 'élevée' : ocrResult.confidence === 'medium' ? 'moyenne' : 'faible'}
                  </Text>
                </View>
                
                <ScrollView style={styles.ocrForm}>
                  {/* Merchant */}
                  <Text style={styles.ocrLabel}>🏪 Commerce / Prestataire</Text>
                  <TextInput
                    style={styles.ocrInput}
                    value={ocrResult.merchant}
                    onChangeText={(text) => setOcrResult({ ...ocrResult, merchant: text })}
                    placeholder="Nom du commerce"
                    placeholderTextColor={Colors.text.muted}
                  />
                  
                  {/* Date */}
                  <Text style={styles.ocrLabel}>📅 Date</Text>
                  <TextInput
                    style={styles.ocrInput}
                    value={ocrResult.date}
                    onChangeText={(text) => setOcrResult({ ...ocrResult, date: text })}
                    placeholder="JJ/MM/AAAA"
                    placeholderTextColor={Colors.text.muted}
                  />
                  
                  {/* Amount */}
                  <Text style={styles.ocrLabel}>💰 Montant (€)</Text>
                  <TextInput
                    style={styles.ocrInput}
                    value={ocrResult.amount}
                    onChangeText={(text) => setOcrResult({ ...ocrResult, amount: text })}
                    placeholder="0.00"
                    placeholderTextColor={Colors.text.muted}
                    keyboardType="decimal-pad"
                  />
                  
                  {/* Category */}
                  <Text style={styles.ocrLabel}>📁 Catégorie</Text>
                  <View style={styles.categorySelector}>
                    {(Object.entries(DOCUMENT_CATEGORIES) as [DocumentCategory, typeof DOCUMENT_CATEGORIES.travel][]).map(([key, cat]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.categorySelectorItem,
                          ocrResult.category === key && { backgroundColor: cat.color + '20', borderColor: cat.color }
                        ]}
                        onPress={() => setOcrResult({ ...ocrResult, category: key })}
                      >
                        <Text style={styles.categorySelectorEmoji}>{cat.emoji}</Text>
                        <Text style={[
                          styles.categorySelectorText,
                          ocrResult.category === key && { color: cat.color, fontWeight: '600' }
                        ]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                
                <TouchableOpacity
                  style={styles.confirmOCRBtn}
                  onPress={handleConfirmOCR}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.confirmOCRBtnText}>Confirmer et ajouter</Text>
                </TouchableOpacity>
              </>
            )}
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
    alignItems: 'center',
    marginBottom: 16,
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
  financeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 14,
  },
  financeMain: {},
  financeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  financeAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingLeft: 16,
  },
  monthList: {
    paddingRight: 16,
  },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    marginRight: 8,
  },
  monthChipSelected: {
    backgroundColor: Colors.primary,
  },
  monthChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  monthChipTextSelected: {
    color: '#fff',
  },
  exportBtn: {
    padding: 12,
    marginLeft: 8,
  },
  categoryFilter: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  categoryChipTextSelected: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  categorySection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categorySectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categorySectionEmoji: {
    fontSize: 18,
  },
  categorySectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  categorySectionCount: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categorySectionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  categorySectionTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  docDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  docAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  helpTextContent: {
    fontSize: 12,
    color: Colors.text.muted,
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
  },
  // Modal styles
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  uploadOptions: {
    gap: 12,
  },
  uploadOption: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  uploadOptionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  uploadOptionDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  uploadingState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  uploadingText: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginTop: 16,
  },
  // Export modal
  exportSummary: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    marginBottom: 20,
  },
  exportSummaryLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  exportSummaryCount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 4,
  },
  exportSummaryTotal: {
    fontSize: 15,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  exportOptions: {
    gap: 12,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
  },
  exportOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionInfo: {
    marginLeft: 14,
    flex: 1,
  },
  exportOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  exportOptionDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  // Finance modal
  financeTotal: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  financeTotalLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  financeTotalAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 4,
  },
  financeBreakdown: {
    marginTop: 20,
    gap: 16,
  },
  financeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 110,
  },
  financeRowEmoji: {
    fontSize: 20,
  },
  financeRowName: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  financeRowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  financeBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  financeBar: {
    height: '100%',
    borderRadius: 4,
  },
  financeRowAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    width: 60,
    textAlign: 'right',
  },
  financeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 24,
    padding: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  financeNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
});
