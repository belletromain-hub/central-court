import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
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
const STORAGE_KEY_TRACKING = '@central_court_gps_tracking';
const STORAGE_KEY_LAST_LOG = '@central_court_last_gps_log';

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

// Country name to code mapping for reverse geocoding
const countryNameToCode: Record<string, string> = {
  'France': 'FR', 'Monaco': 'MC', 'Switzerland': 'CH', 'Suisse': 'CH',
  'Spain': 'ES', 'Espagne': 'ES', 'United States': 'US', 'États-Unis': 'US',
  'United Kingdom': 'GB', 'Royaume-Uni': 'GB', 'Germany': 'DE', 'Allemagne': 'DE',
  'Italy': 'IT', 'Italie': 'IT', 'United Arab Emirates': 'AE', 'Émirats arabes unis': 'AE',
  'Australia': 'AU', 'Australie': 'AU', 'Austria': 'AT', 'Autriche': 'AT',
  'Belgium': 'BE', 'Belgique': 'BE', 'Brazil': 'BR', 'Brésil': 'BR',
  'Canada': 'CA', 'China': 'CN', 'Chine': 'CN', 'Croatia': 'HR', 'Croatie': 'HR',
  'Czech Republic': 'CZ', 'Tchéquie': 'CZ', 'Denmark': 'DK', 'Danemark': 'DK',
  'Finland': 'FI', 'Finlande': 'FI', 'Greece': 'GR', 'Grèce': 'GR',
  'Hungary': 'HU', 'Hongrie': 'HU', 'India': 'IN', 'Inde': 'IN',
  'Japan': 'JP', 'Japon': 'JP', 'South Korea': 'KR', 'Corée du Sud': 'KR',
  'Mexico': 'MX', 'Mexique': 'MX', 'Netherlands': 'NL', 'Pays-Bas': 'NL',
  'Norway': 'NO', 'Norvège': 'NO', 'Poland': 'PL', 'Pologne': 'PL',
  'Portugal': 'PT', 'Qatar': 'QA', 'Romania': 'RO', 'Roumanie': 'RO',
  'Saudi Arabia': 'SA', 'Arabie Saoudite': 'SA', 'Serbia': 'RS', 'Serbie': 'RS',
  'Sweden': 'SE', 'Suède': 'SE', 'Turkey': 'TR', 'Turquie': 'TR',
  'Argentina': 'AR', 'Argentine': 'AR', 'Chile': 'CL', 'Chili': 'CL',
  'Colombia': 'CO', 'Colombie': 'CO', 'Morocco': 'MA', 'Maroc': 'MA',
  'Tunisia': 'TN', 'Tunisie': 'TN',
};

interface Country {
  code: string;
  name: string;
}

interface LocationInfo {
  country: string;
  countryCode: string;
  city?: string;
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
  
  // GPS Tracking state
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [lastLogDate, setLastLogDate] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [singleDate, setSingleDate] = useState(new Date());
  const [bulkStartDate, setBulkStartDate] = useState(new Date());
  const [bulkEndDate, setBulkEndDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  // Load GPS settings on mount
  useEffect(() => {
    loadGpsSettings();
  }, []);

  const loadGpsSettings = async () => {
    try {
      const [trackingEnabled, lastLog] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_TRACKING),
        AsyncStorage.getItem(STORAGE_KEY_LAST_LOG),
      ]);
      
      if (trackingEnabled === 'true') {
        setGpsEnabled(true);
        checkLocationPermission();
      }
      
      if (lastLog) {
        setLastLogDate(lastLog);
      }
    } catch (err) {
      console.error('Error loading GPS settings:', err);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted' ? 'granted' : 'denied');
      
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (err) {
      console.error('Error checking location permission:', err);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted' ? 'granted' : 'denied');
      return status === 'granted';
    } catch (err) {
      console.error('Error requesting location permission:', err);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (geocode?.country) {
        const countryCode = countryNameToCode[geocode.country] || 
                          countryNameToCode[geocode.isoCountryCode || ''] ||
                          geocode.isoCountryCode || '';
        
        setCurrentLocation({
          country: geocode.country,
          countryCode: countryCode,
          city: geocode.city || geocode.subregion || undefined,
        });
      }
    } catch (err) {
      console.error('Error getting location:', err);
    } finally {
      setIsLocating(false);
    }
  };

  const toggleGpsTracking = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à la localisation pour activer le tracking GPS.',
          [{ text: 'OK' }]
        );
        return;
      }
      await getCurrentLocation();
    }
    
    setGpsEnabled(enabled);
    await AsyncStorage.setItem(STORAGE_KEY_TRACKING, enabled ? 'true' : 'false');
  };

  const logCurrentDay = async () => {
    if (!currentLocation?.countryCode) {
      Alert.alert('Erreur', 'Impossible de déterminer votre position actuelle.');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already logged today
    if (lastLogDate === today) {
      Alert.alert('Déjà enregistré', 'Votre présence a déjà été enregistrée aujourd\'hui.');
      return;
    }
    
    setSubmitting(true);
    try {
      const countryName = countries.find(c => c.code === currentLocation.countryCode)?.name || currentLocation.country;
      
      await addDayPresence({
        date: today,
        country: currentLocation.countryCode,
        countryName: countryName,
        status: 'confirmed',
        notes: currentLocation.city ? `GPS - ${currentLocation.city}` : 'GPS',
      });
      
      setLastLogDate(today);
      await AsyncStorage.setItem(STORAGE_KEY_LAST_LOG, today);
      
      Alert.alert(
        'Enregistré !',
        `Présence en ${countryName} enregistrée pour aujourd'hui.`
      );
      
      loadData();
    } catch (err) {
      console.error('Error logging day:', err);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le jour.');
    } finally {
      setSubmitting(false);
    }
  };

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
    if (gpsEnabled && locationPermission === 'granted') {
      getCurrentLocation();
    }
  }, [loadData, gpsEnabled, locationPermission]);

  // Get color based on percentage
  const getProgressColor = (percent: number): string => {
    if (percent >= 100) return Colors.danger;
    if (percent >= 75) return Colors.warning;
    if (percent >= 50) return '#FFA726';
    return Colors.success;
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Add single day
  const handleAddDay = async () => {
    if (!selectedCountry) return;
    
    setSubmitting(true);
    try {
      await addDayPresence({
        date: formatDate(singleDate),
        country: selectedCountry.code,
        countryName: selectedCountry.name,
        status: 'manual',
        notes: notes || undefined,
      });
      setShowAddModal(false);
      setSingleDate(new Date());
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
    if (!selectedCountry) return;
    
    if (bulkEndDate < bulkStartDate) {
      Alert.alert('Erreur', 'La date de fin doit être après la date de début.');
      return;
    }
    
    setSubmitting(true);
    try {
      await addBulkDays({
        startDate: formatDate(bulkStartDate),
        endDate: formatDate(bulkEndDate),
        country: selectedCountry.code,
        countryName: selectedCountry.name,
        notes: notes || undefined,
      });
      setShowBulkModal(false);
      setBulkStartDate(new Date());
      setBulkEndDate(new Date());
      setNotes('');
      setSelectedCountry(null);
      loadData();
    } catch (err) {
      console.error('Error adding bulk days:', err);
      Alert.alert('Erreur', 'Maximum 90 jours par séjour.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick add from GPS
  const handleQuickAddFromGps = () => {
    if (currentLocation?.countryCode) {
      const country = countries.find(c => c.code === currentLocation.countryCode);
      if (country) {
        setSelectedCountry(country);
        setSingleDate(new Date());
        setNotes(currentLocation.city ? `Séjour à ${currentLocation.city}` : '');
        setShowAddModal(true);
      }
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

  const today = new Date().toISOString().split('T')[0];
  const alreadyLoggedToday = lastLogDate === today;

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
            <TouchableOpacity 
              style={styles.settingsBtn}
              onPress={() => setShowSettings(true)}
            >
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeNumber}>{stats?.totalDaysTracked || 0}</Text>
              <Text style={styles.totalBadgeLabel}>jours</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* GPS Card */}
      {gpsEnabled && (
        <View style={styles.gpsCard}>
          <View style={styles.gpsHeader}>
            <View style={styles.gpsStatus}>
              <View style={[styles.gpsIndicator, locationPermission === 'granted' && styles.gpsIndicatorActive]} />
              <Text style={styles.gpsStatusText}>
                {isLocating ? 'Localisation...' : locationPermission === 'granted' ? 'GPS actif' : 'GPS désactivé'}
              </Text>
            </View>
            {currentLocation && (
              <TouchableOpacity style={styles.refreshLocationBtn} onPress={getCurrentLocation}>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          {currentLocation ? (
            <View style={styles.currentLocationInfo}>
              <Text style={styles.currentLocationFlag}>
                {countryFlags[currentLocation.countryCode] || '🌍'}
              </Text>
              <View style={styles.currentLocationText}>
                <Text style={styles.currentLocationCountry}>{currentLocation.country}</Text>
                {currentLocation.city && (
                  <Text style={styles.currentLocationCity}>{currentLocation.city}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.logTodayBtn,
                  alreadyLoggedToday && styles.logTodayBtnDisabled,
                ]}
                onPress={logCurrentDay}
                disabled={alreadyLoggedToday || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={alreadyLoggedToday ? "checkmark-circle" : "add-circle"} 
                      size={18} 
                      color="#fff" 
                    />
                    <Text style={styles.logTodayBtnText}>
                      {alreadyLoggedToday ? 'Enregistré' : 'Aujourd\'hui'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : isLocating ? (
            <View style={styles.locatingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.locatingText}>Recherche de votre position...</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.enableGpsBtn} onPress={getCurrentLocation}>
              <Ionicons name="location" size={18} color={Colors.primary} />
              <Text style={styles.enableGpsBtnText}>Obtenir ma position</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
              {gpsEnabled 
                ? 'Utilisez le bouton GPS ci-dessus pour enregistrer votre position' 
                : 'Activez le GPS ou ajoutez des jours manuellement'}
            </Text>
            {!gpsEnabled && (
              <TouchableOpacity 
                style={styles.enableGpsEmptyBtn}
                onPress={() => setShowSettings(true)}
              >
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={styles.enableGpsEmptyBtnText}>Activer le GPS</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Règle des 183 jours : vous devenez résident fiscal d'un pays si vous y passez plus de 183 jours par an.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paramètres GPS</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="location" size={24} color={Colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Tracking GPS</Text>
                  <Text style={styles.settingDesc}>
                    Détecte automatiquement votre pays actuel
                  </Text>
                </View>
              </View>
              <Switch
                value={gpsEnabled}
                onValueChange={toggleGpsTracking}
                trackColor={{ false: Colors.border.light, true: Colors.primary + '50' }}
                thumbColor={gpsEnabled ? Colors.primary : '#f4f3f4'}
              />
            </View>

            {gpsEnabled && (
              <>
                <View style={styles.settingDivider} />
                
                <View style={styles.settingInfoCard}>
                  <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                  <Text style={styles.settingInfoText}>
                    Vos données de localisation restent sur votre appareil et ne sont utilisées que pour le suivi fiscal.
                  </Text>
                </View>

                <View style={styles.permissionStatus}>
                  <Text style={styles.permissionLabel}>Statut permission :</Text>
                  <View style={[
                    styles.permissionBadge,
                    locationPermission === 'granted' ? styles.permissionGranted : styles.permissionDenied
                  ]}>
                    <Ionicons 
                      name={locationPermission === 'granted' ? 'checkmark-circle' : 'close-circle'} 
                      size={14} 
                      color="#fff" 
                    />
                    <Text style={styles.permissionBadgeText}>
                      {locationPermission === 'granted' ? 'Autorisé' : 'Non autorisé'}
                    </Text>
                  </View>
                </View>

                {locationPermission !== 'granted' && (
                  <TouchableOpacity 
                    style={styles.requestPermissionBtn}
                    onPress={requestLocationPermission}
                  >
                    <Text style={styles.requestPermissionBtnText}>Autoriser la localisation</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity 
              style={styles.closeSettingsBtn}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.closeSettingsBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

            {/* Quick GPS suggestion */}
            {currentLocation && !selectedCountry && (
              <TouchableOpacity 
                style={styles.gpsSuggestion}
                onPress={handleQuickAddFromGps}
              >
                <View style={styles.gpsSuggestionLeft}>
                  <Text style={styles.gpsSuggestionFlag}>
                    {countryFlags[currentLocation.countryCode] || '🌍'}
                  </Text>
                  <View>
                    <Text style={styles.gpsSuggestionCountry}>{currentLocation.country}</Text>
                    <Text style={styles.gpsSuggestionLabel}>Position actuelle</Text>
                  </View>
                </View>
                <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}

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

            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.datePickerBtnText}>{formatDateDisplay(singleDate)}</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.text.muted} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={singleDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setSingleDate(date);
                }}
                maximumDate={new Date()}
              />
            )}

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
                !selectedCountry && styles.submitBtnDisabled,
              ]}
              onPress={handleAddDay}
              disabled={!selectedCountry || submitting}
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
                <TouchableOpacity 
                  style={styles.datePickerBtn}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  <Text style={styles.datePickerBtnTextSmall}>{formatDateDisplay(bulkStartDate)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.inputLabel}>Date fin</Text>
                <TouchableOpacity 
                  style={styles.datePickerBtn}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  <Text style={styles.datePickerBtnTextSmall}>{formatDateDisplay(bulkEndDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={bulkStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowStartDatePicker(Platform.OS === 'ios');
                  if (date) setBulkStartDate(date);
                }}
                maximumDate={new Date()}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={bulkEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowEndDatePicker(Platform.OS === 'ios');
                  if (date) setBulkEndDate(date);
                }}
                maximumDate={new Date()}
              />
            )}

            {/* Duration indicator */}
            {bulkEndDate >= bulkStartDate && (
              <View style={styles.durationIndicator}>
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={styles.durationText}>
                  {Math.ceil((bulkEndDate.getTime() - bulkStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} jours
                </Text>
              </View>
            )}

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
                !selectedCountry && styles.submitBtnDisabled,
              ]}
              onPress={handleAddBulkDays}
              disabled={!selectedCountry || submitting}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  // GPS Card
  gpsCard: {
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
  gpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.text.muted,
  },
  gpsIndicatorActive: {
    backgroundColor: Colors.success,
  },
  gpsStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  refreshLocationBtn: {
    padding: 8,
  },
  currentLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentLocationFlag: {
    fontSize: 36,
  },
  currentLocationText: {
    flex: 1,
  },
  currentLocationCountry: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  currentLocationCity: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  logTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  logTodayBtnDisabled: {
    backgroundColor: Colors.text.muted,
  },
  logTodayBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  locatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  locatingText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  enableGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
  },
  enableGpsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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
    paddingHorizontal: 20,
  },
  enableGpsEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  enableGpsEmptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  // Settings Modal
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  settingDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
  },
  settingInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.success + '10',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  settingInfoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  permissionLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionGranted: {
    backgroundColor: Colors.success,
  },
  permissionDenied: {
    backgroundColor: Colors.danger,
  },
  permissionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestPermissionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  requestPermissionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeSettingsBtn: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeSettingsBtnText: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
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
    maxHeight: '85%',
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
  // GPS Suggestion
  gpsSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary + '10',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  gpsSuggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gpsSuggestionFlag: {
    fontSize: 28,
  },
  gpsSuggestionCountry: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  gpsSuggestionLabel: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
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
  // Date picker
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  datePickerBtnText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  datePickerBtnTextSmall: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  durationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '10',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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
