import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppleDatePickerFR } from '../inputs';
import { Document, CATEGORIES } from './DocumentCard';

const EDIT_CATEGORIES = [
  { id: 'travel', label: 'Voyages', icon: 'airplane' as const, color: '#00796b' },
  { id: 'invoices', label: 'Factures', icon: 'receipt' as const, color: '#f57c00' },
  { id: 'medical', label: 'Médical', icon: 'medkit' as const, color: '#c2185b' },
  { id: 'other', label: 'Autres', icon: 'document' as const, color: '#757575' },
];

interface Props {
  visible: boolean;
  document: Document | null;
  onClose: () => void;
  onSave: (docId: string, data: { date: string; amount: number; category: string }) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
}

export default function DocumentEditModal({ visible, document, onClose, onSave, onDelete }: Props) {
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<string>('other');
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize form when document changes
  React.useEffect(() => {
    if (document) {
      setEditDate(document.date || '');
      setEditAmount(document.amount?.toString() || '');
      setEditCategory(document.category || 'other');
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;
    
    setIsSaving(true);
    try {
      await onSave(document.id, {
        date: editDate,
        amount: parseFloat(editAmount.replace(',', '.')) || 0,
        category: editCategory,
      });
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    
    setIsSaving(true);
    try {
      await onDelete(document.id);
      onClose();
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    const formatted = date.toISOString().split('T')[0];
    setEditDate(formatted);
    setShowDatePicker(false);
  };

  // Parse date for picker
  const parsedDate = React.useMemo(() => {
    if (editDate) {
      const parts = editDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    return new Date();
  }, [editDate]);

  if (!document) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Modifier le document</Text>
            <TouchableOpacity onPress={onClose} testID="close-edit-modal">
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Document name (read-only) */}
            <View style={styles.field}>
              <Text style={styles.label}>Nom</Text>
              <Text style={styles.readOnlyValue}>{document.name}</Text>
            </View>

            {/* Date with Apple Picker */}
            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                testID="date-picker-button"
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateText}>{editDate || 'Sélectionner une date'}</Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>Montant (€)</Text>
              <TextInput
                style={styles.input}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#bbb"
                testID="input-amount"
              />
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.label}>Catégorie</Text>
              <View style={styles.categoryGrid}>
                {EDIT_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      editCategory === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }
                    ]}
                    onPress={() => setEditCategory(cat.id)}
                    testID={`cat-${cat.id}`}
                  >
                    <Ionicons 
                      name={cat.icon} 
                      size={16} 
                      color={editCategory === cat.id ? cat.color : '#999'} 
                    />
                    <Text style={[
                      styles.categoryLabel,
                      editCategory === cat.id && { color: cat.color }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={isSaving}
              testID="btn-save"
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isSaving}
              testID="btn-delete"
            >
              <Ionicons name="trash-outline" size={20} color="#e53935" />
              <Text style={styles.deleteBtnText}>Supprimer</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Apple Date Picker Modal */}
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
                <AppleDatePickerFR
                  value={parsedDate}
                  onChange={handleDateSelect}
                  minYear={2020}
                  maxYear={2030}
                />
              </View>
            </View>
          )}
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
    maxHeight: '90%',
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
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#1a1a1a',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    gap: 10,
  },
  dateText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  input: {
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
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
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3c72',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e53935',
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#999',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3c72',
  },
});
