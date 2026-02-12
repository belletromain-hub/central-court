import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../src/constants/colors';
import {
  fetchResidenceStats,
  fetchCountries,
  addDayPresence,
  addBulkDays,
  ResidenceStats,
  CountryStats,
} from '../../src/services/api';

const TAX_LIMIT = 183;

// Country code to flag emoji mapping
const countryFlags: Record<string, string> = {
  FR: '🇫🇷', MC: '🇲🇨', CH: '🇨🇭', ES: '🇪🇸', US: '🇺🇸', GB: '🇬🇧',
  DE: '🇩🇪', IT: '🇮🇹', AE: '🇦🇪', AU: '🇦🇺', AT: '🇦🇹', BE: '🇧🇪',
  BR: '🇧🇷', CA: '🇨🇦', CN: '🇨🇳', HR: '🇭🇷', CZ: '🇨🇿', DK: '🇩🇰',
  FI: '🇫🇮', GR: '🇬🇷', HU: '🇭🇺', IN: '🇮🇳', JP: '🇯🇵', KR: '🇰🇷',
  MX: '🇲🇽', NL: '🇳🇱', NO: '🇳🇴', PL: '🇵🇱', PT: '🇵🇹', QA: '🇶🇦',
  RO: '🇷🇴', SA: '🇸🇦', RS: '🇷🇸', SE: '🇸🇪', TR: '🇹🇷', AR: '🇦🇷',
  CL: '🇨🇱', CO: '🇨🇴', MA: '🇲🇦', TN: '🇹🇳',
};

interface Country {
  code: string;
  name: string;
}

export default function ResidenceScreen() {
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ResidenceStats | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [singleDate, setSingleDate] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statsData, countriesData] = await Promise.all([
        fetchResidenceStats(currentYear),
        fetchCountries(),
      ]);
      setStats(statsData);
      setCountries(countriesData);
    } catch (err) {
      console.error('Error loading residence data:', err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Get color based on percentage
  const getProgressColor = (percent: number): string => {
    if (percent >= 100) return Colors.danger;
    if (percent >= 75) return Colors.warning;
    if (percent >= 50) return '#FFA726';
    return Colors.success;
  };

  // Add single day
  const handleAddDay = async () => {
    if (!selectedCountry || !singleDate) return;
    
    setSubmitting(true);
    try {
      await addDayPresence({
        date: singleDate,
        country: selectedCountry.code,
        countryName: selectedCountry.name,
        status: 'manual',
        notes: notes || undefined,
      });
      setShowAddModal(false);
      setSingleDate('');
      setNotes('');
      setSelectedCountry(null);
      loadData();
    } catch (err) {
      console.error('Error adding day:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Add bulk days
  const handleAddBulkDays = async () => {
    if (!selectedCountry || !bulkStartDate || !bulkEndDate) return;
    
    setSubmitting(true);
    try {
      await addBulkDays({
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        country: selectedCountry.code,
        countryName: selectedCountry.name,
        notes: notes || undefined,
      });
      setShowBulkModal(false);
      setBulkStartDate('');
      setBulkEndDate('');
      setNotes('');
      setSelectedCountry(null);
      loadData();
    } catch (err) {
      console.error('Error adding bulk days:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Render country card
  const renderCountryCard = (country: CountryStats, index: number) => {
    const flag = countryFlags[country.country] || '🌍';
    const progressPercent = Math.min(country.percentOfThreshold, 100);
    const progressColor = getProgressColor(country.percentOfThreshold);
    const remaining = Math.max(0, country.threshold - country.totalDays);
    
    const isWarning = country.percentOfThreshold >= 75;
    const isCritical = country.percentOfThreshold >= 100;

    return (
      <View
        key={country.country}
        style={[
          styles.countryCard,
          isCritical && styles.countryCardCritical,
          isWarning && !isCritical && styles.countryCardWarning,
        ]}
      >
        {isCritical && (
          <View style={styles.alertBadge}>
            <Ionicons name="warning" size={12} color="#fff" />
            <Text style={styles.alertBadgeText}>Seuil dépassé</Text>
          </View>
        )}
        
        <View style={styles.countryHeader}>
          <View style={styles.countryInfo}>
            <Text style={styles.countryFlag}>{flag}</Text>
            <View>
              <Text style={styles.countryName}>{country.countryName}</Text>
              <Text style={styles.countryCode}>{country.country}</Text>
            </View>
          </View>
          <View style={styles.daysContainer}>
            <Text style={[styles.daysCount, isCritical && styles.daysCountCritical]}>
              {country.totalDays}
            </Text>
            <Text style={styles.daysLimit}>/ {country.threshold}j</Text>
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
          <View style={styles.progressLabels}>
            <Text style={[styles.percentText, { color: progressColor }]}>
              {country.percentOfThreshold.toFixed(0)}%
            </Text>
            <Text style={styles.remainingText}>
              {isCritical 
                ? `+${country.totalDays - country.threshold}j au-delà` 
                : `${remaining}j restants`}
            </Text>
          </View>
        </View>

        {country.longestStreak > 1 && (
          <View style={styles.streakInfo}>
            <Ionicons name="flame" size={14} color={Colors.warning} />
            <Text style={styles.streakText}>
              Plus longue série: {country.longestStreak} jours consécutifs
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="cloud-offline" size={48} color={Colors.text.muted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Résidence {currentYear}</Text>
            <Text style={styles.headerSubtitle}>
              Suivi des jours par pays
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeNumber}>{stats?.totalDaysTracked || 0}</Text>
              <Text style={styles.totalBadgeLabel}>jours</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Warnings */}
      {stats?.warnings && stats.warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          {stats.warnings.map((warning, idx) => (
            <View
              key={idx}
              style={[
                styles.warningCard,
                warning.severity === 'critical' ? styles.warningCritical : styles.warningNormal,
              ]}
            >
              <Ionicons
                name={warning.severity === 'critical' ? 'alert-circle' : 'warning'}
                size={20}
                color={warning.severity === 'critical' ? Colors.danger : Colors.warning}
              />
              <Text style={styles.warningText}>{warning.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.countries?.length || 0}</Text>
          <Text style={styles.statLabel}>Pays visités</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>
            {stats?.primaryCountry?.totalDays || 0}
          </Text>
          <Text style={styles.statLabel}>
            {stats?.primaryCountry?.countryName || 'Principal'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.primary }]}>
            {365 - (stats?.totalDaysTracked || 0)}
          </Text>
          <Text style={styles.statLabel}>Jours restants</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          La règle des 183 jours : vous devenez résident fiscal d'un pays si vous y passez plus de 183 jours par an.
        </Text>
      </View>

      {/* Country List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jours par pays</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Jour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, styles.bulkBtn]}
              onPress={() => setShowBulkModal(true)}
            >
              <Ionicons name="calendar" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Séjour</Text>
            </TouchableOpacity>
          </View>
        </View>

        {stats?.countries && stats.countries.length > 0 ? (
          stats.countries.map((country, idx) => renderCountryCard(country, idx))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="globe-outline" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>Aucun jour enregistré</Text>
            <Text style={styles.emptySubtitle}>
              Commencez à suivre vos jours de présence par pays
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Single Day Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un jour</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Pays</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countrySelector}>
              {countries.map(country => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryOption,
                    selectedCountry?.code === country.code && styles.countryOptionSelected,
                  ]}
                  onPress={() => setSelectedCountry(country)}
                >
                  <Text style={styles.countryOptionFlag}>
                    {countryFlags[country.code] || '🌍'}
                  </Text>
                  <Text style={styles.countryOptionCode}>{country.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={singleDate}
              onChangeText={setSingleDate}
              placeholder={`${currentYear}-01-15`}
              placeholderTextColor={Colors.text.muted}
            />

            <Text style={styles.inputLabel}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Tournoi, entraînement, etc."
              placeholderTextColor={Colors.text.muted}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedCountry || !singleDate) && styles.submitBtnDisabled,
              ]}
              onPress={handleAddDay}
              disabled={!selectedCountry || !singleDate || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Bulk Days Modal */}
      <Modal visible={showBulkModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un séjour</Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Pays</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countrySelector}>
              {countries.map(country => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryOption,
                    selectedCountry?.code === country.code && styles.countryOptionSelected,
                  ]}
                  onPress={() => setSelectedCountry(country)}
                >
                  <Text style={styles.countryOptionFlag}>
                    {countryFlags[country.code] || '🌍'}
                  </Text>
                  <Text style={styles.countryOptionCode}>{country.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.inputLabel}>Date début</Text>
                <TextInput
                  style={styles.input}
                  value={bulkStartDate}
                  onChangeText={setBulkStartDate}
                  placeholder={`${currentYear}-01-15`}
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.inputLabel}>Date fin</Text>
                <TextInput
                  style={styles.input}
                  value={bulkEndDate}
                  onChangeText={setBulkEndDate}
                  placeholder={`${currentYear}-01-22`}
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Tournoi Open d'Australie"
              placeholderTextColor={Colors.text.muted}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedCountry || !bulkStartDate || !bulkEndDate) && styles.submitBtnDisabled,
              ]}
              onPress={handleAddBulkDays}
              disabled={!selectedCountry || !bulkStartDate || !bulkEndDate || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Ajouter le séjour</Text>
                </>
              )}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Header
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
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  totalBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  totalBadgeNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  totalBadgeLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  // Warnings
  warningsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  warningCritical: {
    backgroundColor: Colors.danger + '15',
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  warningNormal: {
    backgroundColor: Colors.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
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
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 4,
  },
  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
    marginHorizontal: 16,
    marginTop: 12,
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
  // Content
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
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
  bulkBtn: {
    backgroundColor: '#764ba2',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Country cards
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
  countryCardWarning: {
    borderWidth: 2,
    borderColor: Colors.warning + '50',
    backgroundColor: Colors.warning + '05',
  },
  countryCardCritical: {
    borderWidth: 2,
    borderColor: Colors.danger + '50',
    backgroundColor: Colors.danger + '05',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
  daysCountCritical: {
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
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  streakText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  countrySelector: {
    marginBottom: 8,
  },
  countryOption: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 60,
  },
  countryOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  countryOptionFlag: {
    fontSize: 28,
  },
  countryOptionCode: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
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
