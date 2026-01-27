import React, { useState, useMemo } from 'react';
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
import Colors from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { CountryDays } from '../../src/types';

const TAX_LIMIT = 183;

export default function FiscalityScreen() {
  const insets = useSafeAreaInsets();
  const { taxHistory, currentYear, updateCountryDays, addCountry } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryDays | null>(null);
  const [newCountry, setNewCountry] = useState({
    country: '',
    countryCode: '',
    flag: '',
    days: '0',
  });
  const [editDays, setEditDays] = useState('');

  // Stats
  const stats = useMemo(() => {
    const totalDays = taxHistory.reduce((sum, c) => sum + c.days, 0);
    const countriesVisited = taxHistory.length;
    const atRisk = taxHistory.filter(c => c.days >= 150).length;
    return { totalDays, countriesVisited, atRisk };
  }, [taxHistory]);

  // Sort countries by days (descending)
  const sortedCountries = useMemo(() => {
    return [...taxHistory].sort((a, b) => b.days - a.days);
  }, [taxHistory]);

  const getProgressColor = (days: number, limit: number): string => {
    const percentage = (days / limit) * 100;
    if (percentage >= 95) return Colors.danger;
    if (percentage >= 80) return Colors.warning;
    return Colors.success;
  };

  const getStatusText = (days: number, limit: number): string => {
    const remaining = limit - days;
    if (remaining <= 0) return 'Limite atteinte !';
    if (remaining <= 8) return `Attention: ${remaining}j restants`;
    if (remaining <= 33) return `Vigilance: ${remaining}j restants`;
    return `${remaining}j restants`;
  };

  const handleEditCountry = (country: CountryDays) => {
    setSelectedCountry(country);
    setEditDays(country.days.toString());
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedCountry) return;
    const days = parseInt(editDays) || 0;
    updateCountryDays(selectedCountry.countryCode, days);
    setShowEditModal(false);
    setSelectedCountry(null);
  };

  const handleAddCountry = () => {
    if (!newCountry.country || !newCountry.countryCode || !newCountry.flag) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    const country: CountryDays = {
      country: newCountry.country,
      countryCode: newCountry.countryCode.toUpperCase(),
      flag: newCountry.flag,
      days: parseInt(newCountry.days) || 0,
      limit: TAX_LIMIT,
    };

    addCountry(country);
    setShowAddModal(false);
    setNewCountry({ country: '', countryCode: '', flag: '', days: '0' });
  };

  const commonFlags = [
    { flag: '🇫🇷', code: 'FR', name: 'France' },
    { flag: '🇪🇸', code: 'ES', name: 'Espagne' },
    { flag: '🇺🇸', code: 'US', name: 'États-Unis' },
    { flag: '🇬🇧', code: 'GB', name: 'Royaume-Uni' },
    { flag: '🇩🇪', code: 'DE', name: 'Allemagne' },
    { flag: '🇮🇹', code: 'IT', name: 'Italie' },
    { flag: '🇦🇺', code: 'AU', name: 'Australie' },
    { flag: '🇦🇪', code: 'AE', name: 'Émirats' },
    { flag: '🇲🇨', code: 'MC', name: 'Monaco' },
    { flag: '🇨🇭', code: 'CH', name: 'Suisse' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#f093fb', '#f5576c']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Fiscalité {currentYear}</Text>
            <Text style={styles.headerSubtitle}>Règle des 183 jours</Text>
          </View>
          <View style={styles.globeIcon}>
            <Ionicons name="globe" size={24} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalDays}</Text>
          <Text style={styles.statLabel}>Jours total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.countriesVisited}</Text>
          <Text style={styles.statLabel}>Pays visités</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, stats.atRisk > 0 && styles.statNumberDanger]}>
            {stats.atRisk}
          </Text>
          <Text style={styles.statLabel}>À risque</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          La règle des 183 jours détermine votre résidence fiscale. 
          Dépasser cette limite dans un pays peut entraîner une imposition locale.
        </Text>
      </View>

      {/* Country List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jours par pays</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {sortedCountries.map(country => {
          const progressPercent = Math.min((country.days / country.limit) * 100, 100);
          const progressColor = getProgressColor(country.days, country.limit);
          const statusText = getStatusText(country.days, country.limit);
          const isAtRisk = country.days >= 150;

          return (
            <TouchableOpacity
              key={country.countryCode}
              style={[styles.countryCard, isAtRisk && styles.countryCardAtRisk]}
              onPress={() => handleEditCountry(country)}
            >
              <View style={styles.countryHeader}>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <View>
                    <Text style={styles.countryName}>{country.country}</Text>
                    <Text style={styles.countryCode}>{country.countryCode}</Text>
                  </View>
                </View>
                <View style={styles.daysContainer}>
                  <Text style={[styles.daysCount, isAtRisk && styles.daysCountAtRisk]}>
                    {country.days}
                  </Text>
                  <Text style={styles.daysLimit}>/ {country.limit}j</Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercent}%`, backgroundColor: progressColor }
                    ]}
                  />
                </View>
                <Text style={[styles.statusText, { color: progressColor }]}>
                  {statusText}
                </Text>
              </View>

              {isAtRisk && (
                <View style={styles.alertBanner}>
                  <Ionicons name="warning" size={14} color={Colors.danger} />
                  <Text style={styles.alertText}>
                    Approche de la limite fiscale
                  </Text>
                </View>
              )}

              <View style={styles.editHint}>
                <Ionicons name="create-outline" size={14} color={Colors.text.muted} />
                <Text style={styles.editHintText}>Appuyer pour modifier</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Manual Entry Note */}
        <View style={styles.noteCard}>
          <Ionicons name="hand-left-outline" size={20} color={Colors.text.secondary} />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>Saisie manuelle</Text>
            <Text style={styles.noteText}>
              Actuellement, les jours sont saisis manuellement. 
              Le tracking GPS automatique sera disponible prochainement.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier les jours</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedCountry && (
              <View style={styles.editCountryInfo}>
                <Text style={styles.editCountryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.editCountryName}>{selectedCountry.country}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Nombre de jours</Text>
            <TextInput
              style={styles.input}
              value={editDays}
              onChangeText={setEditDays}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.text.muted}
            />

            <View style={styles.quickButtons}>
              {[1, 5, 7, 14, 30].map(num => (
                <TouchableOpacity
                  key={num}
                  style={styles.quickBtn}
                  onPress={() => setEditDays((parseInt(editDays) || 0 + num).toString())}
                >
                  <Text style={styles.quickBtnText}>+{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Country Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un pays</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Sélection rapide</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flagSelector}>
              {commonFlags.map(item => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.flagOption,
                    newCountry.countryCode === item.code && styles.flagOptionSelected
                  ]}
                  onPress={() => setNewCountry({
                    ...newCountry,
                    country: item.name,
                    countryCode: item.code,
                    flag: item.flag,
                  })}
                >
                  <Text style={styles.flagEmoji}>{item.flag}</Text>
                  <Text style={styles.flagCode}>{item.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Nom du pays</Text>
            <TextInput
              style={styles.input}
              value={newCountry.country}
              onChangeText={country => setNewCountry({ ...newCountry, country })}
              placeholder="Ex: France"
              placeholderTextColor={Colors.text.muted}
            />

            <Text style={styles.inputLabel}>Code pays (2 lettres)</Text>
            <TextInput
              style={styles.input}
              value={newCountry.countryCode}
              onChangeText={code => setNewCountry({ ...newCountry, countryCode: code.toUpperCase() })}
              placeholder="Ex: FR"
              placeholderTextColor={Colors.text.muted}
              maxLength={2}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Emoji drapeau</Text>
            <TextInput
              style={styles.input}
              value={newCountry.flag}
              onChangeText={flag => setNewCountry({ ...newCountry, flag })}
              placeholder="Ex: 🇫🇷"
              placeholderTextColor={Colors.text.muted}
            />

            <Text style={styles.inputLabel}>Jours déjà passés</Text>
            <TextInput
              style={styles.input}
              value={newCountry.days}
              onChangeText={days => setNewCountry({ ...newCountry, days })}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.text.muted}
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!newCountry.country || !newCountry.countryCode || !newCountry.flag) && styles.submitBtnDisabled
              ]}
              onPress={handleAddCountry}
              disabled={!newCountry.country || !newCountry.countryCode || !newCountry.flag}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Ajouter le pays</Text>
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
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  globeIcon: {
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
  statNumberDanger: {
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  countryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  countryCardAtRisk: {
    borderWidth: 1,
    borderColor: 'rgba(224, 36, 94, 0.3)',
  },
  countryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryFlag: {
    fontSize: 32,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  countryCode: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  daysContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  daysCount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  daysCountAtRisk: {
    color: Colors.danger,
  },
  daysLimit: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 2,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(224, 36, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  alertText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '500',
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  editHintText: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  editCountryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  editCountryFlag: {
    fontSize: 40,
  },
  editCountryName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  flagSelector: {
    marginBottom: 8,
  },
  flagOption: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flagOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
  },
  flagEmoji: {
    fontSize: 28,
  },
  flagCode: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
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
