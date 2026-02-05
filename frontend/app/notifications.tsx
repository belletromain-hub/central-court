import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert as RNAlert,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../src/constants/colors';
import {
  Alert,
  AlertType,
  ALERT_TYPE_CONFIG,
  DEMO_ALERTS,
  generateTournamentAlerts,
  createSlotSuggestion,
} from '../src/data/alertsV1';
import { ATP_TOURNAMENTS_FEB_2026 } from '../src/data/tournamentsV1';
import { DEMO_EVENTS_FEB_2026 } from '../src/data/eventsV1';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // State
  const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS);
  const [filter, setFilter] = useState<'all' | 'unread' | AlertType>('all');
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  
  // Generate alerts from tournaments
  useEffect(() => {
    const generatedAlerts = generateTournamentAlerts(
      ATP_TOURNAMENTS_FEB_2026,
      DEMO_EVENTS_FEB_2026,
      [7, 3]
    );
    
    // Combine with existing alerts, avoiding duplicates
    setAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const newAlerts = generatedAlerts.filter(a => !existingIds.has(a.id));
      return [...prev, ...newAlerts];
    });
  }, []);
  
  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let result = alerts.filter(a => !a.dismissed);
    
    if (filter === 'unread') {
      result = result.filter(a => !a.read);
    } else if (filter !== 'all') {
      result = result.filter(a => a.type === filter);
    }
    
    // Sort by priority and date
    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts, filter]);
  
  // Count unread
  const unreadCount = alerts.filter(a => !a.read && !a.dismissed).length;
  
  // Mark as read
  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, read: true } : a
    ));
  };
  
  // Dismiss alert
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, dismissed: true } : a
    ));
  };
  
  // Mark all as read
  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };
  
  // Handle alert action
  const handleAlertAction = (alert: Alert) => {
    markAsRead(alert.id);
    
    switch (alert.type) {
      case 'flight_missing':
      case 'hotel_missing':
        RNAlert.alert(
          alert.title,
          `Voulez-vous ajouter un événement de voyage pour ${alert.tournamentName} ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Ajouter', 
              onPress: () => {
                // Navigate to calendar to add travel event
                router.push('/');
              }
            }
          ]
        );
        break;
        
      case 'registration_pending':
        RNAlert.alert(
          alert.title,
          'Voulez-vous voir les détails du tournoi ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Voir', 
              onPress: () => router.push('/')
            }
          ]
        );
        break;
        
      case 'observation_new':
        router.push('/');
        break;
        
      case 'slot_suggestion':
        setSelectedAlert(alert);
        setShowSuggestionModal(true);
        break;
    }
  };
  
  // Respond to slot suggestion
  const respondToSuggestion = (accept: boolean) => {
    if (!selectedAlert) return;
    
    RNAlert.alert(
      accept ? 'Créneau accepté' : 'Créneau refusé',
      accept 
        ? `Vous avez accepté la suggestion de ${selectedAlert.fromUserName}. Il/Elle sera notifié(e).`
        : `Vous avez refusé la suggestion de ${selectedAlert.fromUserName}.`,
      [{ text: 'OK' }]
    );
    
    dismissAlert(selectedAlert.id);
    setShowSuggestionModal(false);
    setSelectedAlert(null);
  };
  
  // Render alert card
  const renderAlertCard = (alert: Alert) => {
    const config = ALERT_TYPE_CONFIG[alert.type];
    
    return (
      <TouchableOpacity
        key={alert.id}
        style={[
          styles.alertCard,
          !alert.read && styles.alertCardUnread,
          alert.priority === 'high' && styles.alertCardHigh
        ]}
        onPress={() => handleAlertAction(alert)}
      >
        <View style={[styles.alertIcon, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.alertIconEmoji}>{config.icon}</Text>
        </View>
        
        <View style={styles.alertContent}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertTitle} numberOfLines={1}>{alert.title}</Text>
            {!alert.read && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.alertMessage} numberOfLines={2}>
            {alert.message}
          </Text>
          
          <View style={styles.alertFooter}>
            <Text style={styles.alertTime}>
              {formatTimeAgo(alert.createdAt)}
            </Text>
            
            {alert.dueDate && (
              <View style={[styles.dueBadge, alert.priority === 'high' && styles.dueBadgeHigh]}>
                <Ionicons name="time-outline" size={12} color={alert.priority === 'high' ? '#fff' : Colors.text.secondary} />
                <Text style={[styles.dueText, alert.priority === 'high' && styles.dueTextHigh]}>
                  {formatDueDate(alert.dueDate)}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => dismissAlert(alert.id)}
        >
          <Ionicons name="close" size={20} color={Colors.text.muted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllRead}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Filter tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            Toutes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
            Non lues {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'flight_missing' && styles.filterTabActive]}
          onPress={() => setFilter('flight_missing')}
        >
          <Text style={[styles.filterTabText, filter === 'flight_missing' && styles.filterTabTextActive]}>
            ✈️ Vols
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'hotel_missing' && styles.filterTabActive]}
          onPress={() => setFilter('hotel_missing')}
        >
          <Text style={[styles.filterTabText, filter === 'hotel_missing' && styles.filterTabTextActive]}>
            🏨 Hôtels
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'observation_new' && styles.filterTabActive]}
          onPress={() => setFilter('observation_new')}
        >
          <Text style={[styles.filterTabText, filter === 'observation_new' && styles.filterTabTextActive]}>
            💬 Observations
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Alerts list */}
      <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(renderAlertCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.text.muted} />
            <Text style={styles.emptyText}>Aucune notification</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'unread' 
                ? 'Toutes les notifications ont été lues'
                : 'Vous êtes à jour !'}
            </Text>
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Slot Suggestion Response Modal */}
      <Modal visible={showSuggestionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔄 Suggestion de créneau</Text>
              <TouchableOpacity onPress={() => setShowSuggestionModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            {selectedAlert && (
              <>
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionFrom}>
                    De: <Text style={styles.suggestionFromName}>{selectedAlert.fromUserName}</Text>
                    {' '}({selectedAlert.fromUserRole})
                  </Text>
                  
                  {selectedAlert.targetSlot && (
                    <View style={styles.slotInfo}>
                      <Ionicons name="calendar" size={20} color={Colors.primary} />
                      <Text style={styles.slotText}>
                        {new Date(selectedAlert.targetSlot.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </Text>
                      <Ionicons name="time" size={20} color={Colors.primary} />
                      <Text style={styles.slotText}>
                        {selectedAlert.targetSlot.time} - {selectedAlert.targetSlot.endTime}
                      </Text>
                    </View>
                  )}
                  
                  <Text style={styles.suggestionMessage}>
                    "{selectedAlert.message.split('Message: "')[1]?.replace('"', '') || selectedAlert.message}"
                  </Text>
                </View>
                
                <View style={styles.suggestionActions}>
                  <TouchableOpacity
                    style={[styles.suggestionBtn, styles.suggestionBtnAccept]}
                    onPress={() => respondToSuggestion(true)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.suggestionBtnText}>Accepter</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.suggestionBtn, styles.suggestionBtnDecline]}
                    onPress={() => respondToSuggestion(false)}
                  >
                    <Ionicons name="close-circle" size={20} color="#f44336" />
                    <Text style={[styles.suggestionBtnText, { color: '#f44336' }]}>Refuser</Text>
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

// Helper functions
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);
  
  if (diffDays <= 0) return 'Aujourd\'hui';
  if (diffDays === 1) return 'Demain';
  return `Dans ${diffDays} jours`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  filterContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  alertsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  alertCardUnread: {
    backgroundColor: '#f8f9ff',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  alertCardHigh: {
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIconEmoji: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTime: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
  },
  dueBadgeHigh: {
    backgroundColor: '#f44336',
  },
  dueText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  dueTextHigh: {
    color: '#fff',
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 4,
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
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  suggestionInfo: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  suggestionFrom: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  suggestionFromName: {
    fontWeight: '600',
    color: Colors.text.primary,
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  suggestionMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  suggestionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  suggestionBtnAccept: {
    backgroundColor: '#4caf50',
  },
  suggestionBtnDecline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  suggestionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
