import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Document {
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

export const CATEGORIES = {
  travel: { label: 'Voyages', icon: 'airplane' as const, color: '#00796b' },
  invoices: { label: 'Factures', icon: 'receipt' as const, color: '#f57c00' },
  medical: { label: 'Médical', icon: 'medkit' as const, color: '#c2185b' },
  other: { label: 'Autres', icon: 'document' as const, color: '#757575' },
};

interface Props {
  document: Document;
  onView: (doc: Document) => void;
  onEdit: (doc: Document) => void;
}

export default function DocumentCard({ document, onView, onEdit }: Props) {
  const cat = CATEGORIES[document.category];
  
  return (
    <View style={styles.card} testID={`doc-${document.id}`}>
      <TouchableOpacity 
        style={styles.content}
        onPress={() => onView(document)}
        activeOpacity={0.7}
        testID={`doc-view-${document.id}`}
      >
        <View style={[styles.icon, { backgroundColor: cat.color + '15' }]}>
          <Ionicons 
            name={document.type === 'pdf' ? 'document-text' : 'image'} 
            size={22} 
            color={cat.color} 
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{document.name}</Text>
          <Text style={styles.meta}>{document.date} • {document.size}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.right}>
        {document.amount !== undefined && document.amount > 0 ? (
          <Text style={styles.amount}>{document.amount.toFixed(2)} €</Text>
        ) : (
          <Text style={styles.amountMissing}>-- €</Text>
        )}
        <TouchableOpacity 
          style={styles.editBtn}
          onPress={() => onEdit(document)}
          activeOpacity={0.5}
          testID={`doc-edit-${document.id}`}
        >
          <Ionicons name="create-outline" size={20} color="#f57c00" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: '#999',
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  amountMissing: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ccc',
  },
  editBtn: {
    padding: 8,
    marginTop: 4,
  },
});
