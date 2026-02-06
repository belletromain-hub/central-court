import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert as RNAlert,
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
} from '../src/data/alertsV1';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  
  // Filtrer les alertes
  const filteredAlerts = useMemo(() => {
    let result = alerts.filter(a => !a.dismissed);
    if (filter === 'unread') {
      result = result.filter(a => !a.read);
    }
    // Trier par priorité puis date
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
  
  const handleAlertAction = (alert: Alert) => {
    markAsRead(alert.id);
    
    if (alert.type === 'slot_suggestion') {
      setSelectedAlert(alert);
      setShowSuggestionModal(true);
    } else {
      router.push('/');
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
  
  // Render une carte d'alerte minimaliste style Notion
  const renderAlertCard = (alert: Alert) => {
    const config = ALERT_TYPE_CONFIG[alert.type];
    const isUrgent = alert.priority === 'high';
    
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
        {/* Indicateur de priorité */}
        {isUrgent && <View style={[styles.priorityIndicator, { backgroundColor: config.color }]} />}
        
        <View style={styles.alertMain}>
          {/* Icône */}
          <Text style={styles.alertIcon}>{config.icon}</Text>
          
          {/* Contenu */}
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
          </View>
          
          {/* Actions */}
          <View style={styles.alertActions}>
            {config.actionLabel && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: config.color + '15' }]}
                onPress={() => handleAlertAction(alert)}
              >
                <Text style={[styles.actionBtnText, { color: config.color }]}>
                  {config.actionLabel}
                </Text>
              </TouchableOpacity>
            )}
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
      
      {/* Filtres minimalistes */}
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
                      {selectedAlert.message.split('"')[1] || selectedAlert.message}
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    top: 12,
    bottom: 12,
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
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
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
