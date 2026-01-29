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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Colors from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { formatDateRange, formatDate, formatDateShort, getDaysUntil, isDeadlineSoon, getWeekDay, isDateToday } from '../../src/utils/dateFormatter';
import { getSurfaceColor, getSurfaceIcon, getEnvironmentIcon } from '../../src/data/tournaments';
import { getEventTypeColor, getEventTypeIcon, getEventTypeLabel, EventType, CalendarEvent } from '../../src/data/events';
import { popularLocations } from '../../src/utils/locationService';

// Configure French locale
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

type ViewMode = 'today' | 'week' | 'month' | 'list';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { tournaments, events, updateTournamentStatus, addEvent, recommendations } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedEventForReschedule, setSelectedEventForReschedule] = useState<any>(null);
  const [rescheduleData, setRescheduleData] = useState({ newTime: '', reason: '' });
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'training',
    title: '',
    date: '',
    time: '',
    location: '',
    status: 'pending',
    priority: 'medium',
  });

  const today = new Date().toISOString().split('T')[0];

  // Combine tournaments and events
  const allItems = useMemo(() => {
    const tournamentItems = tournaments.map(t => ({
      id: `t-${t.id}`,
      type: 'tournament' as EventType,
      title: t.name,
      date: t.dates.start,
      endDate: t.dates.end,
      location: `${t.location}, ${t.country}`,
      locationFlag: t.countryFlag,
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

  // Today's events
  const todayEvents = useMemo(() => {
    return allItems.filter(item => item.date === today);
  }, [allItems, today]);

  // Upcoming events (next 7 days, excluding today)
  const upcomingEvents = useMemo(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return allItems.filter(item => {
      const itemDate = new Date(item.date);
      const todayDate = new Date(today);
      return itemDate > todayDate && itemDate <= nextWeek;
    }).slice(0, 5);
  }, [allItems, today]);

  // Urgent items (deadlines soon)
  const urgentItems = useMemo(() => {
    return tournaments.filter(t => 
      t.status === 'pending' && isDeadlineSoon(t.deadline, 72)
    ).slice(0, 2);
  }, [tournaments]);

  // Create marked dates for calendar
  const markedDates = useMemo(() => {
    const marks: any = {};
    allItems.forEach(item => {
      const color = item.type === 'tournament' 
        ? getSurfaceColor((item as any).tournament?.surface || 'Hard')
        : getEventTypeColor(item.type);
      if (!marks[item.date]) {
        marks[item.date] = { dots: [], marked: true };
      }
      marks[item.date].dots.push({ color });
    });
    if (marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: Colors.primary };
    } else {
      marks[selectedDate] = { selected: true, selectedColor: Colors.primary };
    }
    return marks;
  }, [allItems, selectedDate]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return allItems.filter(item => item.date === selectedDate);
  }, [allItems, selectedDate]);

  // Week events
  const weekEvents = useMemo(() => {
    const selected = new Date(selectedDate);
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - selected.getDay() + 1);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const dayEvents = allItems.filter(item => item.date === dateStr);
      weekDays.push({ date: dateStr, day, events: dayEvents });
    }
    return weekDays;
  }, [allItems, selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Open location in Maps
  const openInMaps = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedLocation}`,
      android: `geo:0,0?q=${encodedLocation}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
    });
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`);
    });
  };

  // Handle reschedule request
  const handleRescheduleRequest = (event: any) => {
    if (event.type === 'training' || event.type === 'medical') {
      setSelectedEventForReschedule(event);
      setRescheduleData({ newTime: event.time || '', reason: '' });
      setShowRescheduleModal(true);
    }
  };

  const submitRescheduleRequest = () => {
    if (!rescheduleData.newTime) {
      Alert.alert('Erreur', 'Veuillez indiquer le nouvel horaire souhaité');
      return;
    }
    
    // Here we would send notification to staff - for now show confirmation
    Alert.alert(
      'Demande envoyée',
      `Votre demande de modification pour "${selectedEventForReschedule?.title}" a été envoyée au staff concerné.`,
      [{ text: 'OK' }]
    );
    
    setShowRescheduleModal(false);
    setSelectedEventForReschedule(null);
    setRescheduleData({ newTime: '', reason: '' });
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
    setNewEvent({ type: 'training', title: '', date: '', time: '', location: '', status: 'pending', priority: 'medium' });
  };

  const navigateWeek = (direction: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction * 7));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(today);
    setViewMode('today');
  };

  // Compact event card for today view
  const renderEventSimple = (item: any, showDate = false) => {
    const color = item.type === 'tournament'
      ? getSurfaceColor(item.tournament?.surface || 'Hard')
      : getEventTypeColor(item.type);
    const icon = item.type === 'tournament' ? 'trophy' : getEventTypeIcon(item.type);
    const canReschedule = item.type === 'training' || item.type === 'medical';

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.eventSimple}
        onLongPress={() => canReschedule && handleRescheduleRequest(item)}
        delayLongPress={500}
      >
        <View style={[styles.eventSimpleBar, { backgroundColor: color }]} />
        <View style={styles.eventSimpleContent}>
          <View style={styles.eventSimpleHeader}>
            <View style={styles.eventSimpleLeft}>
              <Ionicons name={icon as any} size={16} color={color} />
              <Text style={styles.eventSimpleTitle} numberOfLines={1}>{item.title}</Text>
            </View>
            {item.status === 'confirmed' && (
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            )}
          </View>
          <View style={styles.eventSimpleMeta}>
            {item.time && (
              <View style={styles.eventSimpleMetaItem}>
                <Ionicons name="time-outline" size={12} color={Colors.text.secondary} />
                <Text style={styles.eventSimpleMetaText}>{item.time}</Text>
              </View>
            )}
            {item.location && (
              <TouchableOpacity 
                style={styles.eventSimpleMetaItem}
                onPress={() => openInMaps(item.location)}
              >
                <Ionicons name="location" size={12} color={Colors.primary} />
                <Text style={[styles.eventSimpleMetaText, { color: Colors.primary }]} numberOfLines={1}>
                  {item.locationFlag || ''} {item.location.split(',')[0]}
                </Text>
                <Ionicons name="open-outline" size={10} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {showDate && (
            <Text style={styles.eventSimpleDate}>{formatDateShort(item.date)}</Text>
          )}
        </View>
        {canReschedule && (
          <TouchableOpacity 
            style={styles.rescheduleBtn}
            onPress={() => handleRescheduleRequest(item)}
          >
            <Ionicons name="time" size={18} color={Colors.text.muted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Today View - Clean and focused
  const renderTodayView = () => (
    <ScrollView
      style={styles.todayContainer}
      contentContainerStyle={styles.todayContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Today's Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          <Text style={styles.sectionDate}>{formatDate(today)}</Text>
        </View>
        
        {todayEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sunny-outline" size={40} color={Colors.text.muted} />
            <Text style={styles.emptyStateText}>Journée libre</Text>
            <Text style={styles.emptyStateSubtext}>Aucun événement prévu</Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {todayEvents.map(item => renderEventSimple(item))}
          </View>
        )}
      </View>

      {/* Urgent Actions */}
      {urgentItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.urgentHeader}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Action requise</Text>
            </View>
          </View>
          {urgentItems.map(t => (
            <TouchableOpacity
              key={t.id}
              style={styles.urgentCard}
              onPress={() => updateTournamentStatus(t.id, 'confirmed')}
            >
              <View style={styles.urgentInfo}>
                <Text style={styles.urgentTitle}>{t.name}</Text>
                <Text style={styles.urgentDeadline}>
                  Deadline: {formatDate(t.deadline)} ({getDaysUntil(t.deadline)}j)
                </Text>
              </View>
              <View style={styles.urgentAction}>
                <Text style={styles.urgentActionText}>Confirmer</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upcoming */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>À venir</Text>
            <TouchableOpacity onPress={() => setViewMode('list')}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.eventsList}>
            {upcomingEvents.map(item => renderEventSimple(item, true))}
          </View>
        </View>
      )}

      {/* Recommendations Button */}
      {recommendations.length > 0 && (
        <TouchableOpacity 
          style={styles.recommendationsButton}
          onPress={() => setShowRecommendations(true)}
        >
          <Ionicons name="bulb-outline" size={20} color={Colors.warning} />
          <Text style={styles.recommendationsButtonText}>
            {recommendations.length} suggestion{recommendations.length > 1 ? 's' : ''} disponible{recommendations.length > 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.text.secondary} />
        </TouchableOpacity>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Week View
  const renderWeekView = () => {
    const weekStart = new Date(weekEvents[0].date);
    const monthYear = weekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return (
      <View style={styles.weekViewContainer}>
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.weekNavBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.weekTitleContainer}>
            <Text style={styles.weekTitle}>{monthYear}</Text>
            <Text style={styles.weekSubtitle}>
              {formatDateShort(weekEvents[0].date)} - {formatDateShort(weekEvents[6].date)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.weekNavBtn}>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {weekEvents.map((dayData, index) => {
            const isToday = dayData.date === today;
            const isSelected = dayData.date === selectedDate;
            const hasEvents = dayData.events.length > 0;

            return (
              <TouchableOpacity
                key={dayData.date}
                style={[styles.weekDayColumn, isSelected && styles.weekDaySelected]}
                onPress={() => setSelectedDate(dayData.date)}
              >
                <Text style={[styles.weekDayName, isSelected && styles.weekDayTextSelected]}>
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][index]}
                </Text>
                <View style={[
                  styles.weekDayNumber,
                  isToday && styles.weekDayToday,
                  isSelected && styles.weekDayNumberSelected,
                ]}>
                  <Text style={[
                    styles.weekDayNumberText,
                    isToday && styles.weekDayTodayText,
                    isSelected && styles.weekDayNumberTextSelected,
                  ]}>
                    {dayData.day.getDate()}
                  </Text>
                </View>
                {hasEvents && (
                  <View style={styles.weekDayDots}>
                    {dayData.events.slice(0, 3).map((e, i) => (
                      <View
                        key={i}
                        style={[
                          styles.weekDayDot,
                          { backgroundColor: e.type === 'tournament' 
                            ? getSurfaceColor((e as any).tournament?.surface || 'Hard')
                            : getEventTypeColor(e.type)
                          }
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.weekEventsContainer}>
          <Text style={styles.selectedDayTitle}>
            {getWeekDay(selectedDate)} {formatDate(selectedDate)}
          </Text>
          {selectedDateEvents.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Ionicons name="calendar-outline" size={36} color={Colors.text.muted} />
              <Text style={styles.noEventsText}>Aucun événement</Text>
            </View>
          ) : (
            selectedDateEvents.map(item => renderEventSimple(item))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  // Month View
  const renderMonthView = () => (
    <View style={styles.monthViewContainer}>
      <Calendar
        current={selectedDate}
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markingType={'multi-dot'}
        markedDates={markedDates}
        theme={{
          backgroundColor: Colors.background.secondary,
          calendarBackground: '#fff',
          textSectionTitleColor: Colors.text.secondary,
          selectedDayBackgroundColor: Colors.primary,
          selectedDayTextColor: '#fff',
          todayTextColor: Colors.primary,
          dayTextColor: Colors.text.primary,
          textDisabledColor: Colors.text.muted,
          arrowColor: Colors.primary,
          monthTextColor: Colors.text.primary,
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 15,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13,
        }}
        style={styles.calendar}
      />
      <ScrollView style={styles.monthEventsContainer}>
        <Text style={styles.selectedDayTitle}>
          {getWeekDay(selectedDate)} {formatDate(selectedDate)}
        </Text>
        {selectedDateEvents.length === 0 ? (
          <View style={styles.noEventsContainerSmall}>
            <Text style={styles.noEventsTextSmall}>Aucun événement</Text>
          </View>
        ) : (
          selectedDateEvents.map(item => renderEventSimple(item))
        )}
      </ScrollView>
    </View>
  );

  // List View (all events)
  const renderListView = () => (
    <ScrollView
      style={styles.listContainer}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {allItems.map((item, index) => {
        const showDate = index === 0 || allItems[index - 1].date !== item.date;
        return (
          <View key={item.id}>
            {showDate && (
              <View style={styles.listDateHeader}>
                <Text style={styles.listDateText}>
                  {isDateToday(item.date) ? "Aujourd'hui" : `${getWeekDay(item.date)} ${formatDate(item.date)}`}
                </Text>
              </View>
            )}
            {renderEventSimple(item)}
          </View>
        );
      })}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3c72', '#2a5298']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Central Court</Text>
          <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>Aujourd'hui</Text>
          </TouchableOpacity>
        </View>

        {/* View Mode Switcher */}
        <View style={styles.viewModeSwitcher}>
          {[
            { mode: 'today' as ViewMode, icon: 'today', label: 'Accueil' },
            { mode: 'week' as ViewMode, icon: 'calendar', label: 'Semaine' },
            { mode: 'month' as ViewMode, icon: 'grid', label: 'Mois' },
            { mode: 'list' as ViewMode, icon: 'list', label: 'Liste' },
          ].map(item => (
            <TouchableOpacity
              key={item.mode}
              style={[styles.viewModeBtn, viewMode === item.mode && styles.viewModeBtnActive]}
              onPress={() => setViewMode(item.mode)}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={viewMode === item.mode ? Colors.primary : 'rgba(255,255,255,0.7)'}
              />
              <Text style={[styles.viewModeText, viewMode === item.mode && styles.viewModeTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      {viewMode === 'today' && renderTodayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'list' && renderListView()}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Reschedule Modal */}
      <Modal visible={showRescheduleModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier l'horaire</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedEventForReschedule && (
              <View style={styles.rescheduleEventInfo}>
                <View style={[styles.rescheduleEventIcon, { backgroundColor: getEventTypeColor(selectedEventForReschedule.type) + '20' }]}>
                  <Ionicons 
                    name={getEventTypeIcon(selectedEventForReschedule.type) as any} 
                    size={24} 
                    color={getEventTypeColor(selectedEventForReschedule.type)} 
                  />
                </View>
                <View style={styles.rescheduleEventDetails}>
                  <Text style={styles.rescheduleEventTitle}>{selectedEventForReschedule.title}</Text>
                  <Text style={styles.rescheduleEventDate}>
                    {formatDate(selectedEventForReschedule.date)} à {selectedEventForReschedule.time}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.inputLabel}>Nouvel horaire souhaité *</Text>
            <TextInput
              style={styles.input}
              value={rescheduleData.newTime}
              onChangeText={newTime => setRescheduleData({ ...rescheduleData, newTime })}
              placeholder="Ex: 10:00 ou 14:30"
              placeholderTextColor={Colors.text.muted}
            />

            <Text style={styles.inputLabel}>Raison (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={rescheduleData.reason}
              onChangeText={reason => setRescheduleData({ ...rescheduleData, reason })}
              placeholder="Ex: Conflit avec autre RDV..."
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.rescheduleInfo}>
              <Ionicons name="notifications" size={16} color={Colors.primary} />
              <Text style={styles.rescheduleInfoText}>
                Une notification sera envoyée au staff concerné
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, !rescheduleData.newTime && styles.submitBtnDisabled]}
              onPress={submitRescheduleRequest}
              disabled={!rescheduleData.newTime}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Envoyer la demande</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Recommendations Modal */}
      <Modal visible={showRecommendations} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="bulb" size={24} color={Colors.warning} />
                <Text style={styles.modalTitle}>Suggestions</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRecommendations(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.recommendationsList}>
              {recommendations.map(rec => (
                <View key={rec.id} style={[styles.recommendationItem, { borderLeftColor: rec.color }]}>
                  <View style={[styles.recIconContainer, { backgroundColor: rec.color + '20' }]}>
                    <Ionicons name={rec.icon as any} size={22} color={rec.color} />
                  </View>
                  <View style={styles.recContent}>
                    <View style={styles.recHeaderRow}>
                      <Text style={styles.recTitle}>{rec.title}</Text>
                      <View style={[styles.recPriorityBadge, { backgroundColor: rec.priority === 'high' ? Colors.danger + '20' : Colors.warning + '20' }]}>
                        <Text style={[styles.recPriorityText, { color: rec.priority === 'high' ? Colors.danger : Colors.warning }]}>
                          {rec.priority === 'high' ? 'Important' : 'Suggestion'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.recDescription}>{rec.description}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                    <Text style={[styles.typeOptionText, newEvent.type === type && { color: '#fff' }]}>
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
                placeholder="Ex: Séance kiné"
                placeholderTextColor={Colors.text.muted}
              />

              <Text style={styles.inputLabel}>Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newEvent.date}
                onChangeText={date => setNewEvent({ ...newEvent, date })}
                placeholder="2026-02-15"
                placeholderTextColor={Colors.text.muted}
              />

              <Text style={styles.inputLabel}>Heure</Text>
              <TextInput
                style={styles.input}
                value={newEvent.time}
                onChangeText={time => setNewEvent({ ...newEvent, time })}
                placeholder="14:00"
                placeholderTextColor={Colors.text.muted}
              />

              <Text style={styles.inputLabel}>Lieu</Text>
              <TextInput
                style={styles.input}
                value={newEvent.location}
                onChangeText={location => setNewEvent({ ...newEvent, location })}
                placeholder="Paris - Centre sportif"
                placeholderTextColor={Colors.text.muted}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, (!newEvent.title || !newEvent.date) && styles.submitBtnDisabled]}
              onPress={handleAddEvent}
              disabled={!newEvent.title || !newEvent.date}
            >
              <Text style={styles.submitBtnText}>Ajouter</Text>
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
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  todayBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 3,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  viewModeBtnActive: {
    backgroundColor: '#fff',
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  viewModeTextActive: {
    color: Colors.primary,
  },
  // Today View
  todayContainer: {
    flex: 1,
  },
  todayContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionDate: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventsList: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  // Simple Event Card
  eventSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventSimpleBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  eventSimpleContent: {
    flex: 1,
    padding: 14,
  },
  eventSimpleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventSimpleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  eventSimpleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  eventSimpleMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  eventSimpleMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventSimpleMetaText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  eventSimpleDate: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 6,
  },
  rescheduleBtn: {
    padding: 14,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border.light,
  },
  // Urgent Card
  urgentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
    marginBottom: 8,
  },
  urgentInfo: {
    flex: 1,
  },
  urgentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  urgentDeadline: {
    fontSize: 13,
    color: Colors.danger,
    marginTop: 2,
  },
  urgentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Recommendations Button
  recommendationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  recommendationsButtonText: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  // Week View
  weekViewContainer: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  weekNavBtn: {
    padding: 8,
  },
  weekTitleContainer: {
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  weekSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  weekDaysRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  weekDayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  weekDaySelected: {
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
  },
  weekDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  weekDayTextSelected: {
    color: Colors.primary,
  },
  weekDayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayToday: {
    backgroundColor: Colors.primary + '20',
  },
  weekDayNumberSelected: {
    backgroundColor: Colors.primary,
  },
  weekDayNumberText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  weekDayTodayText: {
    color: Colors.primary,
  },
  weekDayNumberTextSelected: {
    color: '#fff',
  },
  weekDayDots: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  weekDayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  weekEventsContainer: {
    flex: 1,
    padding: 16,
  },
  selectedDayTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noEventsText: {
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 8,
  },
  noEventsContainerSmall: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noEventsTextSmall: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  // Month View
  monthViewContainer: {
    flex: 1,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  monthEventsContainer: {
    flex: 1,
    padding: 16,
  },
  // List View
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  listDateHeader: {
    paddingVertical: 8,
    marginTop: 8,
  },
  listDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },
  // FAB
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
  // Modals
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
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalForm: {
    maxHeight: 350,
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
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
  // Reschedule
  rescheduleEventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  rescheduleEventIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleEventDetails: {
    flex: 1,
    marginLeft: 12,
  },
  rescheduleEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  rescheduleEventDate: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  rescheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '10',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  rescheduleInfoText: {
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
  },
  // Recommendations
  recommendationsList: {
    maxHeight: 400,
  },
  recommendationItem: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  recIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recContent: {
    flex: 1,
    marginLeft: 12,
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  recPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  recPriorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
