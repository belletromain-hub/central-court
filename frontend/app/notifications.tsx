import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../src/constants/colors';
import {
  Alert,
  ALERT_TYPE_CONFIG,
  DEMO_ALERTS,
} from '../src/data/alertsV1';

// ============================================
// GÉNÉRATEURS DE LIENS INTELLIGENTS
// ============================================

// Ville de départ du joueur (à personnaliser dans le profil)
const PLAYER_HOME_CITY = 'Paris';
const PLAYER_HOME_AIRPORT = 'CDG'; // Code IATA

// Générer un lien Booking.com intelligent
function generateBookingUrl(
  city: string,
  country: string,
  checkIn: string, // Date d'arrivée (1 jour avant tournoi)
  checkOut: string // Date de départ (1 jour après fin tournoi)
): string {
  // Calcul des dates optimales
  const checkInDate = new Date(checkIn);
  checkInDate.setDate(checkInDate.getDate() - 1); // Arriver 1 jour avant
  
  const checkOutDate = new Date(checkOut);
  checkOutDate.setDate(checkOutDate.getDate() + 1); // Partir 1 jour après
  
  // Format dates pour Booking: YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  // Construire le lieu de recherche
  const destination = encodeURIComponent(`${city}, ${country}`);
  
  // URL Booking avec paramètres optimisés pour sportif pro
  const params = new URLSearchParams({
    ss: `${city}, ${country}`,
    checkin: formatDate(checkInDate),
    checkout: formatDate(checkOutDate),
    group_adults: '1',
    no_rooms: '1',
    group_children: '0',
    sb_travel_purpose: 'business', // Voyage pro
    nflt: 'hotelfacility=11;hotelfacility=107', // WiFi gratuit + Salle de sport
  });
  
  return `https://www.booking.com/searchresults.fr.html?${params.toString()}`;
}

// Générer un lien Skyscanner intelligent
function generateSkyscannerUrl(
  destinationCity: string,
  tournamentStart: string,
  tournamentEnd: string
): string {
  // Dates optimales pour un sportif:
  // Aller: 1-2 jours avant le début
  // Retour: 1 jour après la fin
  
  const outboundDate = new Date(tournamentStart);
  outboundDate.setDate(outboundDate.getDate() - 1); // 1 jour avant
  
  const returnDate = new Date(tournamentEnd);
  returnDate.setDate(returnDate.getDate() + 1); // 1 jour après
  
  // Format date pour Skyscanner: YYMMDD
  const formatDateSky = (d: Date) => {
    const y = String(d.getFullYear()).slice(2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };
  
  // Mapping des villes vers codes aéroports (simplifié)
  const cityToAirport: Record<string, string> = {
    'Montpellier': 'MPL',
    'Rotterdam': 'RTM',
    'Pune': 'PNQ',
    'Acapulco': 'ACA',
    'Doha': 'DOH',
    'Dubai': 'DXB',
    'Buenos Aires': 'EZE',
    'Santiago': 'SCL',
    'Delray Beach': 'PBI', // Palm Beach
  };
  
  const destAirport = cityToAirport[destinationCity] || destinationCity.toLowerCase().slice(0, 3);
  
  // URL Skyscanner format: /transport/flights/FROM/TO/DATE1/DATE2/
  return `https://www.skyscanner.fr/transport/vols/${PLAYER_HOME_AIRPORT.toLowerCase()}/${destAirport.toLowerCase()}/${formatDateSky(outboundDate)}/${formatDateSky(returnDate)}/?adultsv2=1&cabinclass=economy&childrenv2=&ref=home&rtn=1&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=false`;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [bookingInfo, setBookingInfo] = useState<{
    type: 'flight' | 'hotel';
    url: string;
    details: {
      destination: string;
      dates: string;
      nights?: number;
      tournamentName: string;
    };
  } | null>(null);
  
  // Filtrer les alertes
  const filteredAlerts = useMemo(() => {
    let result = alerts.filter(a => !a.dismissed);
    if (filter === 'unread') {
      result = result.filter(a => !a.read);
    }
    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts, filter]);
  
  const unreadCount = alerts.filter(a => !a.read && !a.dismissed).length;
  
  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, read: true } : a
    ));
  };
  
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, dismissed: true } : a
    ));
  };
  
  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };
  
  // Action intelligente selon le type d'alerte
  const handleAlertAction = async (alert: Alert) => {
    markAsRead(alert.id);
    
    switch (alert.type) {
      case 'flight_missing':
        if (alert.tournamentCity && alert.tournamentStartDate && alert.tournamentEndDate) {
          const skyscannerUrl = generateSkyscannerUrl(
            alert.tournamentCity,
            alert.tournamentStartDate,
            alert.tournamentEndDate
          );
          
          // Calculer les dates pour l'affichage
          const outbound = new Date(alert.tournamentStartDate);
          outbound.setDate(outbound.getDate() - 1);
          const returnD = new Date(alert.tournamentEndDate);
          returnD.setDate(returnD.getDate() + 1);
          
          setBookingInfo({
            type: 'flight',
            url: skyscannerUrl,
            details: {
              destination: `${PLAYER_HOME_CITY} → ${alert.tournamentCity}`,
              dates: `${outbound.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} → ${returnD.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}`,
              tournamentName: alert.tournamentName || '',
            }
          });
          setShowBookingModal(true);
        }
        break;
        
      case 'hotel_missing':
        if (alert.tournamentCity && alert.tournamentCountry && alert.tournamentStartDate && alert.tournamentEndDate) {
          const bookingUrl = generateBookingUrl(
            alert.tournamentCity,
            alert.tournamentCountry,
            alert.tournamentStartDate,
            alert.tournamentEndDate
          );
          
          // Calculer les dates pour l'affichage
          const checkIn = new Date(alert.tournamentStartDate);
          checkIn.setDate(checkIn.getDate() - 1);
          const checkOut = new Date(alert.tournamentEndDate);
          checkOut.setDate(checkOut.getDate() + 1);
          
          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          
          setBookingInfo({
            type: 'hotel',
            url: bookingUrl,
            details: {
              destination: `${alert.tournamentCity}, ${alert.tournamentCountry}`,
              dates: `${checkIn.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} → ${checkOut.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}`,
              nights,
              tournamentName: alert.tournamentName || '',
            }
          });
          setShowBookingModal(true);
        }
        break;
        
      case 'slot_suggestion':
        setSelectedAlert(alert);
        setShowSuggestionModal(true);
        break;
        
      case 'observation_new':
      case 'registration_pending':
      default:
        router.push('/');
        break;
    }
  };
  
  const respondToSuggestion = (accept: boolean) => {
    if (!selectedAlert) return;
    
    RNAlert.alert(
      accept ? 'Accepté' : 'Refusé',
      accept 
        ? `${selectedAlert.fromUserName} sera notifié.`
        : 'La suggestion a été refusée.',
      [{ text: 'OK' }]
    );
    
    dismissAlert(selectedAlert.id);
    setShowSuggestionModal(false);
    setSelectedAlert(null);
  };
  
  // Formatage du temps
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'maintenant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };
  
  // Render une carte d'alerte minimaliste
  const renderAlertCard = (alert: Alert) => {
    const config = ALERT_TYPE_CONFIG[alert.type];
    const isUrgent = alert.priority === 'high';
    
    // Texte du bouton selon le type
    const getActionLabel = () => {
      if (alert.type === 'flight_missing') return 'Skyscanner';
      if (alert.type === 'hotel_missing') return 'Booking';
      return config.actionLabel;
    };
    
    return (
      <TouchableOpacity
        key={alert.id}
        style={[
          styles.alertCard,
          !alert.read && styles.alertCardUnread,
        ]}
        onPress={() => handleAlertAction(alert)}
        activeOpacity={0.7}
      >
        {isUrgent && <View style={[styles.priorityIndicator, { backgroundColor: config.color }]} />}
        
        <View style={styles.alertMain}>
          <Text style={styles.alertIcon}>{config.icon}</Text>
          
          <View style={styles.alertContent}>
            <View style={styles.alertTitleRow}>
              <Text style={[styles.alertTitle, !alert.read && styles.alertTitleUnread]} numberOfLines={1}>
                {alert.title}
              </Text>
              <Text style={styles.alertTime}>{formatTime(alert.createdAt)}</Text>
            </View>
            <Text style={styles.alertMessage} numberOfLines={1}>
              {alert.message}
            </Text>
            {/* Afficher la destination pour vol/hôtel */}
            {(alert.type === 'flight_missing' || alert.type === 'hotel_missing') && alert.tournamentCity && (
              <Text style={styles.alertDestination}>
                📍 {alert.tournamentCity}
              </Text>
            )}
          </View>
          
          <View style={styles.alertActions}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: config.color + '15' }]}
              onPress={() => handleAlertAction(alert)}
            >
              <Text style={[styles.actionBtnText, { color: config.color }]}>
                {getActionLabel()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => dismissAlert(alert.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#bdbdbd" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header minimaliste */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Notifications</Text>
        
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllRead}>Tout lire</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>
      
      {/* Filtres */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>
            Toutes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'unread' && styles.filterBtnActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterBtnText, filter === 'unread' && styles.filterBtnTextActive]}>
            Non lues
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Info ville de départ */}
      <View style={styles.homeInfo}>
        <Ionicons name="home-outline" size={14} color="#9e9e9e" />
        <Text style={styles.homeInfoText}>Recherches depuis {PLAYER_HOME_CITY}</Text>
      </View>
      
      {/* Liste des alertes */}
      <ScrollView 
        style={styles.list} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(renderAlertCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyText}>Tout est à jour</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'unread' 
                ? 'Toutes les notifications ont été lues'
                : 'Aucune notification pour le moment'}
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Modal de réservation (Vol / Hôtel) */}
      <Modal visible={showBookingModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {bookingInfo?.type === 'flight' ? '✈️ Réserver un vol' : '🏨 Réserver un hôtel'}
              </Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {bookingInfo && (
              <>
                <View style={styles.bookingBox}>
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingLabel}>
                      {bookingInfo.type === 'flight' ? 'Trajet' : 'Destination'}
                    </Text>
                    <Text style={styles.bookingValue}>{bookingInfo.details.destination}</Text>
                  </View>
                  
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingLabel}>Dates</Text>
                    <Text style={styles.bookingValue}>{bookingInfo.details.dates}</Text>
                    {bookingInfo.details.nights && (
                      <Text style={styles.bookingNights}>{bookingInfo.details.nights} nuits</Text>
                    )}
                  </View>
                  
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingLabel}>Tournoi</Text>
                    <Text style={styles.bookingTournament}>{bookingInfo.details.tournamentName}</Text>
                  </View>
                </View>
                
                <View style={styles.bookingTip}>
                  <Ionicons name="bulb-outline" size={16} color="#f2994a" />
                  <Text style={styles.bookingTipText}>
                    {bookingInfo.type === 'flight' 
                      ? 'Dates optimisées: arrivée 1j avant, retour 1j après le tournoi'
                      : 'Filtres pré-sélectionnés: WiFi gratuit, salle de sport'}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.bookingBtn,
                    { backgroundColor: bookingInfo.type === 'flight' ? '#00a698' : '#003580' }
                  ]}
                  onPress={() => {
                    Linking.openURL(bookingInfo.url);
                    setShowBookingModal(false);
                  }}
                >
                  <Text style={styles.bookingBtnText}>
                    Ouvrir {bookingInfo.type === 'flight' ? 'Skyscanner' : 'Booking.com'}
                  </Text>
                  <Ionicons name="open-outline" size={18} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowBookingModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Plus tard</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Modal suggestion de créneau */}
      <Modal visible={showSuggestionModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Suggestion de créneau</Text>
              <TouchableOpacity onPress={() => setShowSuggestionModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {selectedAlert && (
              <>
                <View style={styles.suggestionBox}>
                  <View style={styles.suggestionRow}>
                    <Text style={styles.suggestionLabel}>De</Text>
                    <Text style={styles.suggestionValue}>
                      {selectedAlert.fromUserName}
                      <Text style={styles.suggestionRole}> • {selectedAlert.fromUserRole}</Text>
                    </Text>
                  </View>
                  
                  {selectedAlert.targetSlot && (
                    <View style={styles.suggestionRow}>
                      <Text style={styles.suggestionLabel}>Créneau</Text>
                      <Text style={styles.suggestionValue}>
                        {new Date(selectedAlert.targetSlot.date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })} • {selectedAlert.targetSlot.time} - {selectedAlert.targetSlot.endTime}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.suggestionRow}>
                    <Text style={styles.suggestionLabel}>Message</Text>
                    <Text style={styles.suggestionMessage}>
                      {selectedAlert.message.split('•')[1]?.trim().replace(/"/g, '') || selectedAlert.message}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.suggestionActions}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => respondToSuggestion(false)}
                  >
                    <Text style={styles.declineBtnText}>Refuser</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => respondToSuggestion(true)}
                  >
                    <Text style={styles.acceptBtnText}>Accepter</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d9cdb',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  filterBtnActive: {
    backgroundColor: '#f5f5f5',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9e9e9e',
  },
  filterBtnTextActive: {
    color: '#1a1a1a',
  },
  badge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#eb5757',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  homeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
  },
  homeInfoText: {
    fontSize: 12,
    color: '#9e9e9e',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  alertCardUnread: {
    backgroundColor: '#fafbff',
  },
  priorityIndicator: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 2,
  },
  alertMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  alertContent: {
    flex: 1,
    gap: 2,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4f4f4f',
    flex: 1,
  },
  alertTitleUnread: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  alertTime: {
    fontSize: 12,
    color: '#bdbdbd',
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 13,
    color: '#9e9e9e',
    lineHeight: 18,
  },
  alertDestination: {
    fontSize: 12,
    color: '#2d9cdb',
    marginTop: 2,
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dismissBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#27ae60',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9e9e9e',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  suggestionBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  suggestionRow: {
    gap: 4,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9e9e9e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  suggestionRole: {
    fontWeight: '400',
    color: '#9e9e9e',
  },
  suggestionMessage: {
    fontSize: 14,
    color: '#4f4f4f',
    fontStyle: 'italic',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4f4f4f',
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
