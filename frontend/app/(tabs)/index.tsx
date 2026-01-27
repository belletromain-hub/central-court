import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { formatDateRange, formatDate, formatDateShort, getDaysUntil, isDeadlineSoon, getWeekDay } from '../../src/utils/dateFormatter';
import { getSurfaceColor, getSurfaceIcon, getEnvironmentIcon } from '../../src/data/tournaments';
import { getEventTypeColor, getEventTypeIcon, getEventTypeLabel, EventType, CalendarEvent } from '../../src/data/events';
import { Recommendation } from '../../src/types';

type FilterType = 'all' | 'tournament' | 'media' | 'medical' | 'training' | 'travel' | 'sponsor';
type StatusFilter = 'all' | 'confirmed' | 'pending';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { tournaments, events, updateTournamentStatus, addEvent, deleteEvent, recommendations } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'training',
    title: '',
    date: '',
    time: '',
    location: '',
    status: 'pending',
    priority: 'medium',
  });

  // Combine tournaments and events into unified timeline
  const allItems = useMemo(() => {
    const tournamentItems = tournaments.map(t => ({
      id: `t-${t.id}`,
      type: 'tournament' as EventType,
      title: t.name,
      date: t.dates.start,
      endDate: t.dates.end,
      location: `${t.location}, ${t.country} ${t.countryFlag}`,
      status: t.status,
      priority: 'high' as const,
      tournament: t,
    }));

    const eventItems = events.map(e => ({
      ...e,
      id: `e-${e.id}`,
    }));

    return [...tournamentItems, ...eventItems].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [tournaments, events]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [allItems, typeFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const tournamentsThisMonth = tournaments.filter(t => 
      new Date(t.dates.start).getMonth() === thisMonth
    ).length;
    const confirmed = allItems.filter(i => i.status === 'confirmed').length;
    const pending = allItems.filter(i => i.status === 'pending').length;
    return { tournamentsThisMonth, confirmed, pending };
  }, [tournaments, allItems]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    
    const event: CalendarEvent = {
      id: `new-${Date.now()}`,
      type: newEvent.type as EventType,
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location,
      status: newEvent.status as 'pending' | 'confirmed' | 'cancelled',
      priority: newEvent.priority as 'high' | 'medium' | 'low',
      description: newEvent.description,
    };
    
    addEvent(event);
    setShowAddModal(false);
    setNewEvent({
      type: 'training',
      title: '',
      date: '',
      time: '',
      location: '',
      status: 'pending',
      priority: 'medium',
    });
  };

  const renderTournamentCard = (item: any) => {
    const t = item.tournament;
    const daysUntilDeadline = getDaysUntil(t.deadline);
    const isUrgent = isDeadlineSoon(t.deadline);

    return (
      <View style={styles.tournamentCard}>
        <View style={styles.tournamentHeader}>
          <View style={styles.tournamentInfo}>
            <Text style={styles.tournamentTitle}>{t.name}</Text>
            <Text style={styles.tournamentLocation}>
              {t.countryFlag} {t.location}, {t.country}
            </Text>
          </View>
          <View style={[styles.surfaceBadge, { backgroundColor: getSurfaceColor(t.surface) }]}>
            <Text style={styles.surfaceText}>{getSurfaceIcon(t.surface)} {t.surface}</Text>
          </View>
        </View>
        
        <View style={styles.tournamentDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Dates</Text>
            <Text style={styles.detailValue}>{formatDateRange(t.dates.start, t.dates.end)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Environnement</Text>
            <Text style={styles.detailValue}>{getEnvironmentIcon(t.environment)} {t.environment}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Prize Money</Text>
            <Text style={styles.detailValue}>{t.prize}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Tableau</Text>
            <Text style={styles.detailValue}>SGL {t.draw.sgl} / DBL {t.draw.dbl}</Text>
          </View>
        </View>

        <View style={styles.deadlineRow}>
          <View style={[styles.deadlineBadge, isUrgent && styles.deadlineUrgent]}>
            <Ionicons name="time-outline" size={14} color={isUrgent ? '#fff' : Colors.warning} />
            <Text style={[styles.deadlineText, isUrgent && styles.deadlineTextUrgent]}>
              Deadline: {formatDate(t.deadline)} {isUrgent ? `(${daysUntilDeadline}j)` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.tournamentActions}>
          {t.status === 'pending' ? (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => updateTournamentStatus(t.id, 'confirmed')}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Confirmer</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.confirmedText}>Confirmé</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => Linking.openURL(`tel:${t.contact}`)}
          >
            <Ionicons name="call" size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => Linking.openURL(t.links.registration)}
          >
            <Ionicons name="open-outline" size={18} color={Colors.text.secondary} />
            <Text style={styles.btnSecondaryText}>Zone Joueur</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEventCard = (item: CalendarEvent & { id: string }) => {
    const color = getEventTypeColor(item.type);
    const icon = getEventTypeIcon(item.type);
    const label = getEventTypeLabel(item.type);

    return (
      <View style={[styles.eventCard, { borderLeftColor: color }]}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: color }]}>
            <Ionicons name={icon as any} size={14} color="#fff" />
            <Text style={styles.eventTypeText}>{label}</Text>
          </View>
          {item.status === 'confirmed' ? (
            <View style={styles.eventStatusConfirmed}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            </View>
          ) : (
            <View style={styles.eventStatusPending}>
              <Ionicons name="time" size={16} color={Colors.warning} />
            </View>
          )}
        </View>
        
        <Text style={styles.eventTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.eventDescription}>{item.description}</Text>
        )}
        
        <View style={styles.eventMeta}>
          {item.time && (
            <View style={styles.eventMetaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
              <Text style={styles.eventMetaText}>
                {item.time}{item.endTime ? ` - ${item.endTime}` : ''}
              </Text>
            </View>
          )}
          {item.location && (
            <View style={styles.eventMetaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
              <Text style={styles.eventMetaText}>{item.location}</Text>
            </View>
          )}
        </View>

        {item.contact && (
          <TouchableOpacity
            style={styles.eventContact}
            onPress={() => Linking.openURL(`tel:${item.contact}`)}
          >
            <Ionicons name="call-outline" size={14} color={Colors.primary} />
            <Text style={styles.eventContactText}>{item.contact}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const typeFilters: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'Tout', icon: 'apps' },
    { key: 'tournament', label: 'Tournois', icon: 'trophy' },
    { key: 'media', label: 'Média', icon: 'camera' },
    { key: 'medical', label: 'Médical', icon: 'medkit' },
    { key: 'training', label: 'Training', icon: 'fitness' },
    { key: 'travel', label: 'Voyages', icon: 'airplane' },
    { key: 'sponsor', label: 'Sponsors', icon: 'briefcase' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3c72', '#2a5298']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>Le Central Court</Text>
        <Text style={styles.headerSubtitle}>Calendrier Unifié</Text>
      </LinearGradient>

      {/* Stats Dashboard */}
      <View style={styles.dashboard}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statCard}>
          <Text style={styles.statLabel}>Ce mois</Text>
          <Text style={styles.statValue}>{stats.tournamentsThisMonth}</Text>
          <Text style={styles.statSublabel}>tournois</Text>
        </LinearGradient>
        <LinearGradient colors={['#17bf63', '#10a956']} style={styles.statCard}>
          <Text style={styles.statLabel}>Confirmés</Text>
          <Text style={styles.statValue}>{stats.confirmed}</Text>
          <Text style={styles.statSublabel}>événements</Text>
        </LinearGradient>
        <LinearGradient colors={['#ffad1f', '#f59e0b']} style={styles.statCard}>
          <Text style={styles.statLabel}>En attente</Text>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statSublabel}>décisions</Text>
        </LinearGradient>
      </View>

      {/* Smart Recommendations */}
      {recommendations.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.recommendationsScroll}
          contentContainerStyle={styles.recommendationsContainer}
        >
          {recommendations.map(rec => (
            <TouchableOpacity key={rec.id} style={[styles.recommendationCard, { borderLeftColor: rec.color }]}>
              <View style={styles.recHeader}>
                <View style={[styles.recIconContainer, { backgroundColor: rec.color + '20' }]}>
                  <Ionicons name={rec.icon as any} size={18} color={rec.color} />
                </View>
                <View style={[styles.recPriorityBadge, { backgroundColor: rec.priority === 'high' ? Colors.danger + '20' : Colors.warning + '20' }]}>
                  <Text style={[styles.recPriorityText, { color: rec.priority === 'high' ? Colors.danger : Colors.warning }]}>
                    {rec.priority === 'high' ? 'Important' : 'Suggestion'}
                  </Text>
                </View>
              </View>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recDescription} numberOfLines={3}>{rec.description}</Text>
              {rec.actionLabel && (
                <View style={styles.recAction}>
                  <Text style={[styles.recActionText, { color: rec.color }]}>{rec.actionLabel}</Text>
                  <Ionicons name="arrow-forward" size={14} color={rec.color} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Type Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {typeFilters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, typeFilter === f.key && styles.filterBtnActive]}
            onPress={() => setTypeFilter(f.key)}
          >
            <Ionicons
              name={f.icon as any}
              size={16}
              color={typeFilter === f.key ? '#fff' : Colors.text.secondary}
            />
            <Text style={[styles.filterText, typeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Filters */}
      <View style={styles.statusFilters}>
        {['all', 'confirmed', 'pending'].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBtn, statusFilter === s && styles.statusBtnActive]}
            onPress={() => setStatusFilter(s as StatusFilter)}
          >
            <Text style={[styles.statusText, statusFilter === s && styles.statusTextActive]}>
              {s === 'all' ? 'Tous' : s === 'confirmed' ? 'Confirmés' : 'En attente'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timeline */}
      <ScrollView
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredItems.map((item, index) => {
          const showDate = index === 0 || 
            filteredItems[index - 1].date !== item.date;
          
          return (
            <View key={item.id}>
              {showDate && (
                <View style={styles.dateHeader}>
                  <View style={styles.dateDot} />
                  <Text style={styles.dateText}>
                    {getWeekDay(item.date)} {formatDate(item.date)}
                  </Text>
                </View>
              )}
              <View style={styles.timelineItem}>
                {item.type === 'tournament' && (item as any).tournament
                  ? renderTournamentCard(item)
                  : renderEventCard(item as CalendarEvent & { id: string })
                }
              </View>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Event FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Event Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvel événement</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {(['media', 'medical', 'training', 'travel', 'sponsor'] as EventType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newEvent.type === type && { backgroundColor: getEventTypeColor(type) }
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, type })}
                  >
                    <Ionicons
                      name={getEventTypeIcon(type) as any}
                      size={18}
                      color={newEvent.type === type ? '#fff' : getEventTypeColor(type)}
                    />
                    <Text style={[
                      styles.typeOptionText,
                      newEvent.type === type && { color: '#fff' }
                    ]}>
                      {getEventTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Titre *</Text>
              <TextInput
                style={styles.input}
                value={newEvent.title}
                onChangeText={title => setNewEvent({ ...newEvent, title })}
                placeholder="Ex: Interview L'Équipe"
              />

              <Text style={styles.inputLabel}>Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newEvent.date}
                onChangeText={date => setNewEvent({ ...newEvent, date })}
                placeholder="2026-02-15"
              />

              <Text style={styles.inputLabel}>Heure</Text>
              <TextInput
                style={styles.input}
                value={newEvent.time}
                onChangeText={time => setNewEvent({ ...newEvent, time })}
                placeholder="14:00"
              />

              <Text style={styles.inputLabel}>Lieu</Text>
              <TextInput
                style={styles.input}
                value={newEvent.location}
                onChangeText={location => setNewEvent({ ...newEvent, location })}
                placeholder="Paris - Studio"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={newEvent.description}
                onChangeText={description => setNewEvent({ ...newEvent, description })}
                placeholder="Détails de l'événement..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.btnPrimary, styles.modalBtn, (!newEvent.title || !newEvent.date) && styles.btnDisabled]}
              onPress={handleAddEvent}
              disabled={!newEvent.title || !newEvent.date}
            >
              <Text style={styles.btnPrimaryText}>Ajouter l'événement</Text>
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
  dashboard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  statSublabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  filterScroll: {
    marginTop: 16,
    maxHeight: 50,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  statusFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  statusBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  statusBtnActive: {
    backgroundColor: Colors.text.primary,
    borderColor: Colors.text.primary,
  },
  statusText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#fff',
  },
  timeline: {
    flex: 1,
    marginTop: 16,
  },
  timelineContent: {
    paddingHorizontal: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  dateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  timelineItem: {
    marginBottom: 12,
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border.light,
    paddingLeft: 16,
  },
  tournamentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tournamentInfo: {
    flex: 1,
    marginRight: 12,
  },
  tournamentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  tournamentLocation: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  surfaceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  surfaceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tournamentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    width: '45%',
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 2,
  },
  deadlineRow: {
    marginBottom: 12,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 173, 31, 0.1)',
    alignSelf: 'flex-start',
  },
  deadlineUrgent: {
    backgroundColor: Colors.danger,
  },
  deadlineText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
  deadlineTextUrgent: {
    color: '#fff',
  },
  tournamentActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 12,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnSecondaryText: {
    color: Colors.text.secondary,
    fontWeight: '500',
    fontSize: 13,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  confirmedText: {
    color: Colors.success,
    fontWeight: '600',
    fontSize: 14,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTypeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  eventStatusConfirmed: {
    padding: 2,
  },
  eventStatusPending: {
    padding: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  eventDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  eventContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  eventContactText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalForm: {
    maxHeight: 400,
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
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  modalBtn: {
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  // Recommendations styles
  recommendationsScroll: {
    marginTop: 12,
    maxHeight: 160,
  },
  recommendationsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recommendationCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  recPriorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  recDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 17,
  },
  recAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  recActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
