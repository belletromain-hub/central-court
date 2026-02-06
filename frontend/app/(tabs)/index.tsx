import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import Colors from '../../src/constants/colors';
import { getOnboardingStatus } from '../../src/utils/progressiveOnboarding';
import {
  fetchEvents,
  fetchTournamentWeeks,
  fetchAlerts,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  addObservation as apiAddObservation,
  registerTournament as apiRegisterTournament,
  hideTournament as apiHideTournament,
} from '../../src/services/api';
import { 
  TournamentStatus,
  TOURNAMENT_STATUS_LABELS,
  SURFACE_COLORS 
} from '../../src/data/tournamentsV1';
import { 
  EVENT_CATEGORIES, 
  EventTypeV1, 
  CalendarEventV1,
  Observation
} from '../../src/data/eventsV1';

// Configure French locale
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

export default function CalendarScreenV1() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // State
  const [currentMonth, setCurrentMonth] = useState('2026-02');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEventV1[]>([]);
  const [weekTournaments, setWeekTournaments] = useState<any[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsData, weeksData, alertsData] = await Promise.all([
          fetchEvents(currentMonth),
          fetchTournamentWeeks('atp'),
          fetchAlerts(true),
        ]);
        setEvents(eventsData);
        setWeekTournaments(weeksData);
        setUnreadAlertCount(alertsData.length);
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentMonth]);
  
  // Modals
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeekTournaments | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventV1 | null>(null);
  
  // New event form
  const [newEvent, setNewEvent] = useState<Partial<CalendarEventV1>>({
    type: 'training_tennis',
    title: '',
    date: '',
    time: '',
    location: '',
    visibleToStaff: true,
    observations: []
  });
  
  // Observation input
  const [newObservationText, setNewObservationText] = useState('');
  
  // Event modification
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showSuggestChangeModal, setShowSuggestChangeModal] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Partial<CalendarEventV1>>({});
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [showEventConfirmation, setShowEventConfirmation] = useState(false);
  const [eventConfirmationMessage, setEventConfirmationMessage] = useState('');
  
  // Progressive onboarding trigger
  const [showTravelPrompt, setShowTravelPrompt] = useState(false);
  const [promptTournamentName, setPromptTournamentName] = useState('');
  
  // Check if travel preferences need to be collected
  const checkTravelPreferences = useCallback(async (tournamentName: string) => {
    try {
      const status = await getOnboardingStatus();
      if (status.voyage.status !== 'completed' && status.voyage.status !== 'dismissed') {
        setPromptTournamentName(tournamentName);
        setShowTravelPrompt(true);
      }
    } catch (e) {
      // Silent fail
    }
  }, []);
  
  // Get events for a specific date
  const getEventsForDate = (date: string) => {
    return events.filter(e => e.date === date);
  };
  
  // Get tournament events for calendar marks
  const tournamentMarks = useMemo(() => {
    const marks: Record<string, any> = {};
    
    weekTournaments.forEach(week => {
      // Mark tournaments that have registrations
      week.registrations.forEach(reg => {
        const tournament = week.tournaments.find(t => t.id === reg.tournamentId);
        if (tournament) {
          // Mark all days of the tournament
          let currentDate = new Date(tournament.startDate);
          const endDate = new Date(tournament.endDate);
          
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            marks[dateStr] = {
              marked: true,
              dotColor: EVENT_CATEGORIES.tournament.color,
            };
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
    });
    
    return marks;
  }, [weekTournaments]);
  
  // Combine all marks for calendar
  const calendarMarks = useMemo(() => {
    const marks: Record<string, any> = { ...tournamentMarks };
    
    events.forEach(event => {
      const category = EVENT_CATEGORIES[event.type];
      if (!marks[event.date]) {
        marks[event.date] = { dots: [] };
      }
      if (!marks[event.date].dots) {
        marks[event.date].dots = [];
      }
      marks[event.date].dots.push({ color: category.color });
    });
    
    // Add selected date highlight
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: Colors.primary,
      };
    }
    
    return marks;
  }, [events, selectedDate, tournamentMarks]);
  
  // Handle tournament registration (add or update)
  const handleRegisterTournament = async (weekNumber: number, tournamentId: string, status: TournamentStatus) => {
    let tournamentName = '';
    const week = weekTournaments.find((w: any) => w.weekNumber === weekNumber);
    if (week) {
      const t = week.tournaments.find((t: any) => t.id === tournamentId);
      if (t) tournamentName = t.name;
    }
    try {
      await apiRegisterTournament(tournamentId, status);
      const weeksData = await fetchTournamentWeeks('atp');
      setWeekTournaments(weeksData);
      const updatedWeek = weeksData.find((w: any) => w.weekNumber === weekNumber);
      if (updatedWeek) setSelectedWeek(updatedWeek);
      if ((status === 'participating' || status === 'accepted') && tournamentName) {
        checkTravelPreferences(tournamentName);
      }
    } catch (e) {
      console.error('Registration failed:', e);
    }
  };
  
  // Handle removing registration (pas intéressé - hide tournament)
  const handleRemoveRegistration = async (weekNumber: number, tournamentId: string) => {
    try {
      await apiHideTournament(tournamentId);
      const weeksData = await fetchTournamentWeeks('atp');
      setWeekTournaments(weeksData);
      const updatedWeek = weeksData.find((w: any) => w.weekNumber === weekNumber);
      if (updatedWeek) setSelectedWeek(updatedWeek);
    } catch (e) {
      console.error('Hide failed:', e);
    }
  };
  
  // Handle hiding a tournament without registering (from the list)
  const handleHideTournament = async (weekNumber: number, tournamentId: string) => {
    try {
      await apiHideTournament(tournamentId);
      const weeksData = await fetchTournamentWeeks('atp');
      setWeekTournaments(weeksData);
      const updatedWeek = weeksData.find((w: any) => w.weekNumber === weekNumber);
      if (updatedWeek) setSelectedWeek(updatedWeek);
    } catch (e) {
      console.error('Hide failed:', e);
    }
  };
  
  // Get registration for a specific tournament
  const getRegistration = (week: any, tournamentId: string): any => {
    return (week.registrations || []).find((r: any) => r.tournamentId === tournamentId);
  };
  
  // Get status options based on current status
  const getAvailableStatusOptions = (currentStatus: TournamentStatus): TournamentStatus[] => {
    if (currentStatus === 'pending' || currentStatus === 'accepted' || currentStatus === 'participating') {
      return ['pending', 'accepted', 'participating', 'declined'];
    }
    return ['interested', 'pending', 'accepted', 'participating', 'declined'];
  };
  
  // Check if player has a "participating" or "accepted" status for any tournament this week
  const hasConfirmedParticipation = (week: any): boolean => {
    return (week.registrations || []).some((r: any) => r.status === 'participating' || r.status === 'accepted');
  };
  
  // Get visible tournaments for a week (filter out hidden ones)
  const getVisibleTournaments = (week: WeekTournaments) => {
    const hiddenIds = week.hiddenTournamentIds || [];
    return week.tournaments.filter(t => !hiddenIds.includes(t.id));
  };
  
  // Handle add event
  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) {
      Alert.alert('Erreur', 'Veuillez remplir le titre et la date');
      return;
    }
    
    const event: CalendarEventV1 = {
      id: `evt-${Date.now()}`,
      type: newEvent.type || 'training_tennis',
      title: newEvent.title || '',
      date: newEvent.date || '',
      time: newEvent.time,
      location: newEvent.location,
      observations: [],
      visibleToStaff: newEvent.visibleToStaff !== false
    };
    
    setEvents(prev => [...prev, event]);
    setShowAddEventModal(false);
    setNewEvent({
      type: 'training_tennis',
      title: '',
      date: selectedDate || '',
      time: '',
      location: '',
      visibleToStaff: true,
      observations: []
    });
  };
  
  // Handle add observation
  const handleAddObservation = () => {
    if (!selectedEvent || !newObservationText.trim()) return;
    
    const newObservation: Observation = {
      id: `obs-${Date.now()}`,
      author: 'Moi', // In real app, get from user profile
      role: 'Joueur',
      text: newObservationText.trim(),
      createdAt: new Date().toISOString()
    };
    
    // Update the event with new observation
    setEvents(prev => prev.map(event => {
      if (event.id === selectedEvent.id) {
        return {
          ...event,
          observations: [...event.observations, newObservation]
        };
      }
      return event;
    }));
    
    // Update selected event to show the new observation immediately
    setSelectedEvent(prev => prev ? {
      ...prev,
      observations: [...prev.observations, newObservation]
    } : null);
    
    setNewObservationText('');
  };
  
  // Open edit event modal
  const openEditEvent = () => {
    if (!selectedEvent) return;
    setEditedEvent({
      title: selectedEvent.title,
      date: selectedEvent.date,
      time: selectedEvent.time || '',
      endTime: selectedEvent.endTime || '',
      location: selectedEvent.location || '',
    });
    setShowEventDetailModal(false);
    setShowEditEventModal(true);
  };
  
  // Save event modifications
  const saveEventModifications = () => {
    if (!selectedEvent || !editedEvent.title) return;
    
    setEvents(prev => prev.map(event => {
      if (event.id === selectedEvent.id) {
        return {
          ...event,
          title: editedEvent.title || event.title,
          date: editedEvent.date || event.date,
          time: editedEvent.time || event.time,
          endTime: editedEvent.endTime || event.endTime,
          location: editedEvent.location || event.location,
        };
      }
      return event;
    }));
    
    setShowEditEventModal(false);
    setEventConfirmationMessage('✅ Événement modifié\n\nVos modifications ont été enregistrées.');
    setShowEventConfirmation(true);
  };
  
  // Open suggest change modal
  const openSuggestChange = () => {
    if (!selectedEvent) return;
    setEditedEvent({
      date: selectedEvent.date,
      time: selectedEvent.time || '',
      endTime: selectedEvent.endTime || '',
    });
    setSuggestionMessage('');
    setShowEventDetailModal(false);
    setShowSuggestChangeModal(true);
  };
  
  // Send suggestion to staff
  const sendSuggestion = () => {
    if (!selectedEvent) return;
    
    // Get assigned staff names
    const staffNames = selectedEvent.assignedStaffIds?.length 
      ? selectedEvent.assignedStaffIds.map(id => {
          const staff = DEMO_STAFF.find(s => s.id === id);
          return staff?.name || 'Staff';
        }).join(', ')
      : 'le staff concerné';
    
    setShowSuggestChangeModal(false);
    setEventConfirmationMessage(
      `🔄 Suggestion envoyée\n\n` +
      `${staffNames} recevra votre proposition de modification` +
      (suggestionMessage ? ` avec votre message.` : '.')
    );
    setShowEventConfirmation(true);
    setSuggestionMessage('');
  };
  
  // Get week number for a date
  const getWeekForDate = (date: string) => {
    return weekTournaments.find(week => {
      const start = new Date(week.startDate);
      const end = new Date(week.endDate);
      const d = new Date(date);
      return d >= start && d <= end;
    });
  };
  
  // Render tournament week card
  const renderTournamentWeekCard = (week: WeekTournaments) => {
    const visibleTournaments = getVisibleTournaments(week);
    const registeredTournaments = week.registrations
      .map(r => ({
        tournament: week.tournaments.find(t => t.id === r.tournamentId),
        status: r.status
      }))
      .filter(r => r.tournament);
    
    return (
      <TouchableOpacity
        key={week.weekNumber}
        style={styles.weekCard}
        onPress={() => {
          setSelectedWeek(week);
          setShowTournamentModal(true);
        }}
      >
        <View style={styles.weekCardHeader}>
          <Text style={styles.weekLabel}>Semaine {week.weekNumber}</Text>
          <Text style={styles.weekDates}>{week.weekLabel}</Text>
        </View>
        
        {registeredTournaments.length > 0 ? (
          <View style={styles.registeredTournamentsContainer}>
            {registeredTournaments.map(({ tournament, status }) => {
              if (!tournament) return null;
              const statusInfo = TOURNAMENT_STATUS_LABELS[status];
              return (
                <View key={tournament.id} style={styles.registeredTournamentRow}>
                  <Text style={styles.tournamentFlag}>{tournament.countryFlag}</Text>
                  <Text style={styles.tournamentNameSmall} numberOfLines={1}>{tournament.name}</Text>
                  <View style={[styles.statusBadgeSmall, { backgroundColor: statusInfo.color }]}>
                    <Text style={styles.statusTextSmall}>{statusInfo.emoji}</Text>
                  </View>
                </View>
              );
            })}
            {/* Show how many more available */}
            {visibleTournaments.length > registeredTournaments.length && (
              <Text style={styles.moreAvailableText}>
                +{visibleTournaments.length - registeredTournaments.length} disponible{visibleTournaments.length - registeredTournaments.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        ) : visibleTournaments.length > 0 ? (
          <View style={styles.noTournamentSelected}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.text.muted} />
            <Text style={styles.noTournamentText}>
              {visibleTournaments.length} tournoi{visibleTournaments.length > 1 ? 's' : ''} disponible{visibleTournaments.length > 1 ? 's' : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.noTournamentSelected}>
            <Ionicons name="close-circle-outline" size={24} color={Colors.text.muted} />
            <Text style={styles.noTournamentText}>Pas de tournoi cette semaine</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  // Render events for selected date
  const renderDayEvents = () => {
    if (!selectedDate) return null;
    
    const dayEvents = getEventsForDate(selectedDate);
    const week = getWeekForDate(selectedDate);
    
    // Get all registered tournaments for this week that include this date
    const tournamentsForDay = week ? week.registrations
      .map(reg => week.tournaments.find(t => t.id === reg.tournamentId))
      .filter(t => t && 
        new Date(selectedDate) >= new Date(t.startDate) &&
        new Date(selectedDate) <= new Date(t.endDate)
      ) : [];
    
    return (
      <View style={styles.dayEventsContainer}>
        <View style={styles.dayEventsHeader}>
          <Text style={styles.dayEventsTitle}>
            {new Date(selectedDate).toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </Text>
          <TouchableOpacity
            style={styles.addEventBtn}
            onPress={() => {
              setNewEvent(prev => ({ ...prev, date: selectedDate }));
              setShowAddEventModal(true);
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Tournament info if applicable - show all registered tournaments for this day */}
        {tournamentsForDay.map(tournament => tournament && (
          <View key={tournament.id} style={[styles.eventCard, { borderLeftColor: EVENT_CATEGORIES.tournament.color }]}>
            <View style={styles.eventCardContent}>
              <View style={styles.eventTypeRow}>
                <Text style={styles.eventEmoji}>{EVENT_CATEGORIES.tournament.icon}</Text>
                <Text style={[styles.eventType, { color: EVENT_CATEGORIES.tournament.color }]}>
                  {tournament.category}
                </Text>
              </View>
              <Text style={styles.eventTitle}>{tournament.name}</Text>
              <Text style={styles.eventLocation}>
                {tournament.countryFlag} {tournament.city}, {tournament.country}
              </Text>
            </View>
          </View>
        ))}
        
        {/* Regular events */}
        {dayEvents.map(event => {
          const category = EVENT_CATEGORIES[event.type];
          return (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventCard, { borderLeftColor: category.color }]}
              onPress={() => {
                setSelectedEvent(event);
                setShowEventDetailModal(true);
              }}
            >
              <View style={styles.eventCardContent}>
                <View style={styles.eventTypeRow}>
                  <Text style={styles.eventEmoji}>{category.icon}</Text>
                  <Text style={[styles.eventType, { color: category.color }]}>{category.label}</Text>
                  {event.time && (
                    <Text style={styles.eventTime}>{event.time}{event.endTime ? ` - ${event.endTime}` : ''}</Text>
                  )}
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.location && (
                  <Text style={styles.eventLocation}>{event.location}</Text>
                )}
                {event.observations.length > 0 && (
                  <View style={styles.observationsBadge}>
                    <Ionicons name="chatbubble-ellipses" size={12} color={Colors.text.secondary} />
                    <Text style={styles.observationsCount}>{event.observations.length} observation{event.observations.length > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        
        {dayEvents.length === 0 && tournamentsForDay.length === 0 && (
          <View style={styles.noEventsPlaceholder}>
            <Ionicons name="calendar-outline" size={32} color={Colors.text.muted} />
            <Text style={styles.noEventsText}>Aucun événement</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, '#1565c0']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>🎾 Tennis Assistant</Text>
            <Text style={styles.headerSubtitle}>Calendrier {currentMonth.split('-')[1] === '02' ? 'Février' : ''} 2026</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationBtn}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {DEMO_ALERTS.filter(a => !a.read).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {DEMO_ALERTS.filter(a => !a.read).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={currentMonth}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            onMonthChange={(month) => setCurrentMonth(`${month.year}-${String(month.month).padStart(2, '0')}`)}
            markedDates={calendarMarks}
            markingType="multi-dot"
            theme={{
              calendarBackground: '#fff',
              textSectionTitleColor: Colors.text.secondary,
              selectedDayBackgroundColor: Colors.primary,
              selectedDayTextColor: '#fff',
              todayTextColor: Colors.primary,
              dayTextColor: Colors.text.primary,
              textDisabledColor: Colors.text.muted,
              arrowColor: Colors.primary,
              monthTextColor: Colors.text.primary,
              textMonthFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
            }}
            style={styles.calendar}
          />
        </View>
        
        {/* Selected day events */}
        {selectedDate && renderDayEvents()}
        
        {/* Tournament weeks */}
        <View style={styles.tournamentSection}>
          <Text style={styles.sectionTitle}>🏆 Tournois de la semaine</Text>
          <Text style={styles.sectionSubtitle}>Sélectionnez vos tournois pour chaque semaine</Text>
          
          {weekTournaments.map(renderTournamentWeekCard)}
        </View>
        
        {/* Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Légende</Text>
          <View style={styles.legendGrid}>
            {Object.entries(EVENT_CATEGORIES).map(([key, category]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: category.color }]} />
                <Text style={styles.legendText}>{category.icon} {category.label}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* FAB for quick add */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setNewEvent(prev => ({ ...prev, date: selectedDate || new Date().toISOString().split('T')[0] }));
          setShowAddEventModal(true);
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      
      {/* Tournament Selection Modal */}
      <Modal visible={showTournamentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un tournoi</Text>
              <TouchableOpacity onPress={() => setShowTournamentModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            {selectedWeek && (
              <ScrollView style={styles.tournamentModalContent} showsVerticalScrollIndicator={true}>
                <Text style={styles.weekModalLabel}>
                  Semaine {selectedWeek.weekNumber} • {selectedWeek.weekLabel}
                </Text>
                
                {/* Afficher TOUS les tournois visibles avec leur statut */}
                {getVisibleTournaments(selectedWeek).map(tournament => {
                  const registration = getRegistration(selectedWeek, tournament.id);
                  const isRegistered = !!registration;
                  const currentStatus = registration?.status || 'none';
                  const statusInfo = isRegistered ? TOURNAMENT_STATUS_LABELS[currentStatus] : null;
                  
                  return (
                    <View key={tournament.id} style={styles.tournamentOptionContainer}>
                      <View style={[
                        styles.tournamentOption,
                        isRegistered && styles.tournamentOptionSelected
                      ]}>
                        <View style={styles.tournamentOptionHeader}>
                          <Text style={styles.tournamentOptionFlag}>{tournament.countryFlag}</Text>
                          <View style={styles.tournamentOptionInfo}>
                            <Text style={styles.tournamentOptionName}>{tournament.name}</Text>
                            <Text style={styles.tournamentOptionCity}>{tournament.city}, {tournament.country}</Text>
                          </View>
                          {isRegistered && statusInfo && (
                            <View style={[styles.currentStatusBadge, { backgroundColor: statusInfo.color }]}>
                              <Text style={styles.currentStatusEmoji}>{statusInfo.emoji}</Text>
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.tournamentOptionDetails}>
                          <View style={[styles.categoryBadge, { backgroundColor: SURFACE_COLORS[tournament.surface] + '20' }]}>
                            <Text style={[styles.categoryBadgeText, { color: SURFACE_COLORS[tournament.surface] }]}>
                              {tournament.category}
                            </Text>
                          </View>
                          <View style={[styles.surfaceBadge, { backgroundColor: SURFACE_COLORS[tournament.surface] + '20' }]}>
                            <Text style={[styles.surfaceBadgeText, { color: SURFACE_COLORS[tournament.surface] }]}>
                              {tournament.surface}
                            </Text>
                          </View>
                          <Text style={styles.tournamentPrize}>{tournament.prize}</Text>
                        </View>
                        
                        {/* Status Selection for this tournament */}
                        <View style={styles.statusSectionInline}>
                          <View style={styles.statusGridInline}>
                            {getAvailableStatusOptions(currentStatus).map(status => {
                              const sInfo = TOURNAMENT_STATUS_LABELS[status];
                              const isSelected = currentStatus === status;
                              return (
                                <TouchableOpacity
                                  key={status}
                                  style={[
                                    styles.statusOptionSmall,
                                    isSelected && { backgroundColor: sInfo.color, borderColor: sInfo.color }
                                  ]}
                                  onPress={() => handleRegisterTournament(selectedWeek.weekNumber, tournament.id, status)}
                                >
                                  <Text style={[styles.statusOptionEmojiSmall, isSelected && { color: '#fff' }]}>
                                    {sInfo.emoji}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          
                          {/* Bouton Pas intéressé - masque le tournoi */}
                          <TouchableOpacity
                            style={styles.hideInlineBtnContainer}
                            onPress={() => handleHideTournament(selectedWeek.weekNumber, tournament.id)}
                          >
                            <Ionicons name="eye-off-outline" size={16} color="#9e9e9e" />
                          </TouchableOpacity>
                        </View>
                        
                        {/* Lien Player Zone */}
                        <TouchableOpacity
                          style={styles.playerZoneBtn}
                          onPress={() => Linking.openURL(tournament.playerZoneLink)}
                        >
                          <Ionicons name="open-outline" size={16} color={Colors.primary} />
                          <Text style={styles.playerZoneBtnText}>S'inscrire (Player Zone)</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                
                {/* Message si aucun tournoi visible */}
                {getVisibleTournaments(selectedWeek).length === 0 && (
                  <View style={styles.noTournamentsMessage}>
                    <Ionicons name="calendar-outline" size={48} color={Colors.text.muted} />
                    <Text style={styles.noTournamentsText}>Aucun tournoi disponible</Text>
                    <Text style={styles.noTournamentsHint}>Tous les tournois ont été masqués</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Add Event Modal */}
      <Modal visible={showAddEventModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvel événement</Text>
              <TouchableOpacity onPress={() => setShowAddEventModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Event Type Selector */}
              <Text style={styles.inputLabel}>Type d'événement</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {(Object.entries(EVENT_CATEGORIES) as [EventTypeV1, typeof EVENT_CATEGORIES[EventTypeV1]][])
                  .filter(([key]) => key !== 'tournament')
                  .map(([key, category]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.typeOption,
                      newEvent.type === key && { backgroundColor: category.color }
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, type: key })}
                  >
                    <Text style={styles.typeOptionEmoji}>{category.icon}</Text>
                    <Text style={[
                      styles.typeOptionText,
                      newEvent.type === key && { color: '#fff' }
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Title */}
              <Text style={styles.inputLabel}>Titre *</Text>
              <TextInput
                style={styles.input}
                value={newEvent.title}
                onChangeText={title => setNewEvent({ ...newEvent, title })}
                placeholder="Ex: Séance service"
                placeholderTextColor={Colors.text.muted}
              />
              
              {/* Date */}
              <Text style={styles.inputLabel}>Date *</Text>
              <TextInput
                style={styles.input}
                value={newEvent.date}
                onChangeText={date => setNewEvent({ ...newEvent, date })}
                placeholder="2026-02-15"
                placeholderTextColor={Colors.text.muted}
              />
              
              {/* Time */}
              <Text style={styles.inputLabel}>Heure</Text>
              <TextInput
                style={styles.input}
                value={newEvent.time}
                onChangeText={time => setNewEvent({ ...newEvent, time })}
                placeholder="09:00"
                placeholderTextColor={Colors.text.muted}
              />
              
              {/* Location */}
              <Text style={styles.inputLabel}>Lieu</Text>
              <TextInput
                style={styles.input}
                value={newEvent.location}
                onChangeText={location => setNewEvent({ ...newEvent, location })}
                placeholder="Mouratoglou Academy, Nice"
                placeholderTextColor={Colors.text.muted}
              />
              
              {/* Privacy toggle for personal events */}
              {newEvent.type === 'personal' && (
                <View style={styles.privacyToggle}>
                  <Ionicons name="eye-off" size={20} color={Colors.text.secondary} />
                  <Text style={styles.privacyText}>Cet événement sera masqué pour le staff</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.submitBtn, (!newEvent.title || !newEvent.date) && styles.submitBtnDisabled]}
              onPress={handleAddEvent}
              disabled={!newEvent.title || !newEvent.date}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Event Detail Modal */}
      <Modal visible={showEventDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détail événement</Text>
              <TouchableOpacity onPress={() => setShowEventDetailModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            {selectedEvent && (
              <ScrollView style={styles.eventDetailContent}>
                <View style={[styles.eventDetailHeader, { backgroundColor: EVENT_CATEGORIES[selectedEvent.type].color + '15' }]}>
                  <Text style={styles.eventDetailEmoji}>{EVENT_CATEGORIES[selectedEvent.type].icon}</Text>
                  <View>
                    <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
                    <Text style={[styles.eventDetailType, { color: EVENT_CATEGORIES[selectedEvent.type].color }]}>
                      {EVENT_CATEGORIES[selectedEvent.type].label}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.eventDetailInfo}>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.text.secondary} />
                    <Text style={styles.eventDetailText}>
                      {new Date(selectedEvent.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                  
                  {selectedEvent.time && (
                    <View style={styles.eventDetailRow}>
                      <Ionicons name="time-outline" size={18} color={Colors.text.secondary} />
                      <Text style={styles.eventDetailText}>
                        {selectedEvent.time}{selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ''}
                      </Text>
                    </View>
                  )}
                  
                  {selectedEvent.location && (
                    <View style={styles.eventDetailRow}>
                      <Ionicons name="location-outline" size={18} color={Colors.text.secondary} />
                      <Text style={styles.eventDetailText}>{selectedEvent.location}</Text>
                    </View>
                  )}
                </View>
                
                {/* Observations section */}
                <View style={styles.observationsSection}>
                  <Text style={styles.observationsTitle}>💬 Observations</Text>
                  
                  {selectedEvent.observations.length > 0 ? (
                    selectedEvent.observations.map(obs => (
                      <View key={obs.id} style={styles.observationCard}>
                        <View style={styles.observationHeader}>
                          <Text style={styles.observationAuthor}>{obs.author}</Text>
                          <Text style={styles.observationRole}>{obs.role}</Text>
                        </View>
                        <Text style={styles.observationText}>{obs.text}</Text>
                        <Text style={styles.observationDate}>
                          {new Date(obs.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noObservationsText}>Aucune observation pour le moment</Text>
                  )}
                  
                  {/* Add observation form */}
                  <View style={styles.addObservationSection}>
                    <Text style={styles.addObservationLabel}>Ajouter une observation</Text>
                    <TextInput
                      style={styles.observationInput}
                      placeholder="Ex: Focus service slice. 45 min travail rebond haut."
                      placeholderTextColor={Colors.text.muted}
                      multiline
                      numberOfLines={3}
                      maxLength={200}
                      onChangeText={(text) => {
                        // Store temporarily - will be used on submit
                        setNewObservationText(text);
                      }}
                      value={newObservationText}
                    />
                    <View style={styles.observationFooter}>
                      <Text style={styles.charCount}>{newObservationText.length}/200</Text>
                      <TouchableOpacity
                        style={[styles.addObservationBtn, !newObservationText.trim() && styles.addObservationBtnDisabled]}
                        onPress={handleAddObservation}
                        disabled={!newObservationText.trim()}
                      >
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={styles.addObservationBtnText}>Envoyer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {/* Action buttons - Modifier / Suggérer */}
                <View style={styles.eventActionsSection}>
                  <TouchableOpacity style={styles.editEventBtn} onPress={openEditEvent}>
                    <Ionicons name="create-outline" size={18} color="#1a1a1a" />
                    <Text style={styles.editEventBtnText}>Modifier</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.suggestChangeBtn} onPress={openSuggestChange}>
                    <Ionicons name="git-compare-outline" size={18} color="#9b51e0" />
                    <Text style={styles.suggestChangeBtnText}>Suggérer une modification</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Edit Event Modal */}
      <Modal visible={showEditEventModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier l'événement</Text>
              <TouchableOpacity onPress={() => setShowEditEventModal(false)}>
                <Ionicons name="close" size={24} color="#9e9e9e" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editInputGroup}>
              <Text style={styles.editInputLabel}>Titre</Text>
              <TextInput
                style={styles.editInput}
                value={editedEvent.title}
                onChangeText={(text) => setEditedEvent(prev => ({ ...prev, title: text }))}
                placeholder="Titre de l'événement"
                placeholderTextColor="#bdbdbd"
              />
            </View>
            
            <View style={styles.editInputGroup}>
              <Text style={styles.editInputLabel}>Date</Text>
              <TextInput
                style={styles.editInput}
                value={editedEvent.date}
                onChangeText={(text) => setEditedEvent(prev => ({ ...prev, date: text }))}
                placeholder="2026-02-05"
                placeholderTextColor="#bdbdbd"
              />
            </View>
            
            <View style={styles.editTimeRow}>
              <View style={[styles.editInputGroup, { flex: 1 }]}>
                <Text style={styles.editInputLabel}>Début</Text>
                <TextInput
                  style={styles.editInput}
                  value={editedEvent.time}
                  onChangeText={(text) => setEditedEvent(prev => ({ ...prev, time: text }))}
                  placeholder="09:00"
                  placeholderTextColor="#bdbdbd"
                />
              </View>
              <View style={[styles.editInputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.editInputLabel}>Fin</Text>
                <TextInput
                  style={styles.editInput}
                  value={editedEvent.endTime}
                  onChangeText={(text) => setEditedEvent(prev => ({ ...prev, endTime: text }))}
                  placeholder="11:00"
                  placeholderTextColor="#bdbdbd"
                />
              </View>
            </View>
            
            <View style={styles.editInputGroup}>
              <Text style={styles.editInputLabel}>Lieu</Text>
              <TextInput
                style={styles.editInput}
                value={editedEvent.location}
                onChangeText={(text) => setEditedEvent(prev => ({ ...prev, location: text }))}
                placeholder="Lieu de l'événement"
                placeholderTextColor="#bdbdbd"
              />
            </View>
            
            <View style={styles.editActionsRow}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setShowEditEventModal(false)}>
                <Text style={styles.editCancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={saveEventModifications}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.editSaveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Suggest Change Modal */}
      <Modal visible={showSuggestChangeModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Suggérer une modification</Text>
              <TouchableOpacity onPress={() => setShowSuggestChangeModal(false)}>
                <Ionicons name="close" size={24} color="#9e9e9e" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.suggestionInfo}>
              <Ionicons name="information-circle-outline" size={18} color="#2d9cdb" />
              <Text style={styles.suggestionInfoText}>
                Votre suggestion sera envoyée au staff concerné pour validation
              </Text>
            </View>
            
            <View style={styles.editInputGroup}>
              <Text style={styles.editInputLabel}>Nouvelle date (optionnel)</Text>
              <TextInput
                style={styles.editInput}
                value={editedEvent.date}
                onChangeText={(text) => setEditedEvent(prev => ({ ...prev, date: text }))}
                placeholder="2026-02-06"
                placeholderTextColor="#bdbdbd"
              />
            </View>
            
            <View style={styles.editTimeRow}>
              <View style={[styles.editInputGroup, { flex: 1 }]}>
                <Text style={styles.editInputLabel}>Nouveau début</Text>
                <TextInput
                  style={styles.editInput}
                  value={editedEvent.time}
                  onChangeText={(text) => setEditedEvent(prev => ({ ...prev, time: text }))}
                  placeholder="10:00"
                  placeholderTextColor="#bdbdbd"
                />
              </View>
              <View style={[styles.editInputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.editInputLabel}>Nouvelle fin</Text>
                <TextInput
                  style={styles.editInput}
                  value={editedEvent.endTime}
                  onChangeText={(text) => setEditedEvent(prev => ({ ...prev, endTime: text }))}
                  placeholder="12:00"
                  placeholderTextColor="#bdbdbd"
                />
              </View>
            </View>
            
            <View style={styles.editInputGroup}>
              <Text style={styles.editInputLabel}>Message (optionnel)</Text>
              <TextInput
                style={[styles.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={suggestionMessage}
                onChangeText={setSuggestionMessage}
                placeholder="Expliquez la raison de votre demande..."
                placeholderTextColor="#bdbdbd"
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.editActionsRow}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setShowSuggestChangeModal(false)}>
                <Text style={styles.editCancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestSendBtn} onPress={sendSuggestion}>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.suggestSendBtnText}>Envoyer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Event Confirmation Modal */}
      <Modal visible={showEventConfirmation} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModalContent}>
            <Text style={styles.confirmationModalText}>{eventConfirmationMessage}</Text>
            <TouchableOpacity 
              style={styles.confirmationOkBtn} 
              onPress={() => {
                setShowEventConfirmation(false);
                setSelectedEvent(null);
              }}
            >
              <Text style={styles.confirmationOkBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Travel Preferences Prompt Modal */}
      <Modal visible={showTravelPrompt} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.travelPromptContent}>
            <Text style={styles.travelPromptEmoji}>✈️</Text>
            <Text style={styles.travelPromptTitle}>Préparer ton voyage ?</Text>
            <Text style={styles.travelPromptText}>
              Tu participes à <Text style={{ fontWeight: '700' }}>{promptTournamentName}</Text>. Configure tes préférences de voyage pour recevoir des recommandations personnalisées.
            </Text>
            <TouchableOpacity
              style={styles.travelPromptBtn}
              onPress={() => {
                setShowTravelPrompt(false);
                router.push('/preferences/voyage');
              }}
            >
              <Ionicons name="airplane" size={18} color="#fff" />
              <Text style={styles.travelPromptBtnText}>Configurer mes préférences</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.travelPromptSkip}
              onPress={() => setShowTravelPrompt(false)}
            >
              <Text style={styles.travelPromptSkipText}>Plus tard</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  notificationBtn: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#eb5757',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendar: {
    borderRadius: 16,
  },
  dayEventsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  dayEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayEventsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  addEventBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  eventCardContent: {
    padding: 12,
  },
  eventTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 'auto',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  observationsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  observationsCount: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  noEventsPlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noEventsText: {
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 8,
  },
  tournamentSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  weekDates: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  selectedTournamentInfo: {
    gap: 8,
  },
  tournamentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tournamentFlag: {
    fontSize: 28,
  },
  tournamentDetails: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  tournamentCategory: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noTournamentSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  noTournamentText: {
    fontSize: 14,
    color: Colors.text.muted,
  },
  legendSection: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  weekModalLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  tournamentList: {
    maxHeight: 400,
  },
  tournamentOption: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tournamentOptionSelected: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '08',
  },
  tournamentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tournamentOptionFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  tournamentOptionInfo: {
    flex: 1,
  },
  tournamentOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  tournamentOptionCity: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  tournamentOptionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  surfaceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  surfaceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tournamentPrize: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginLeft: 'auto',
  },
  playerZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  playerZoneBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  noTournamentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    marginTop: 10,
  },
  noTournamentBtnText: {
    fontSize: 14,
    color: Colors.text.secondary,
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
  typeOptionEmoji: {
    fontSize: 14,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.text.muted + '15',
    borderRadius: 10,
  },
  privacyText: {
    fontSize: 13,
    color: Colors.text.secondary,
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
  eventDetailContent: {
    maxHeight: 420,
  },
  eventDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  eventDetailEmoji: {
    fontSize: 40,
  },
  eventDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  eventDetailType: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventDetailInfo: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventDetailText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  observationsSection: {
    marginTop: 20,
  },
  observationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  observationCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  observationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  observationAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  observationRole: {
    fontSize: 12,
    color: Colors.primary,
  },
  observationText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  observationDate: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 6,
  },
  noObservationsText: {
    fontSize: 14,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
  addObservationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  addObservationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  observationInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  observationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  charCount: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  addObservationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addObservationBtnDisabled: {
    opacity: 0.5,
  },
  addObservationBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Status section styles
  statusSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  statusSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
    minWidth: 90,
  },
  statusOptionEmoji: {
    fontSize: 16,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  // Locked tournament styles (when accepted/participating)
  lockedTournamentMessage: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  lockedBadgeEmoji: {
    fontSize: 18,
    color: '#fff',
  },
  lockedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  lockedTournamentName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  lockedTournamentHint: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  // Cancel registration button
  cancelRegistrationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 8,
  },
  cancelRegistrationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#f44336',
  },
  // Tournament option container
  tournamentOptionContainer: {
    marginBottom: 0,
  },
  // Tournament actions
  tournamentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  // Hide tournament button
  hideTournamentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  hideTournamentText: {
    fontSize: 11,
    color: '#9e9e9e',
    fontWeight: '500',
  },
  // No tournaments message
  noTournamentsMessage: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noTournamentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 12,
  },
  noTournamentsHint: {
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 4,
  },
  // New modal structure styles
  tournamentModalContent: {
    maxHeight: 500,
    paddingBottom: 16,
  },
  selectedTournamentSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 10,
    marginTop: 8,
  },
  otherTournamentsHeader: {
    marginTop: 12,
    marginBottom: 4,
  },
  separatorLine: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginBottom: 12,
  },
  lockedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    marginTop: 12,
  },
  lockedMessageText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  // Multi-registration styles
  registeredTournamentsContainer: {
    gap: 6,
  },
  registeredTournamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  tournamentNameSmall: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  statusBadgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextSmall: {
    fontSize: 12,
    color: '#fff',
  },
  moreAvailableText: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Current status badge
  currentStatusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentStatusEmoji: {
    fontSize: 14,
    color: '#fff',
  },
  // Inline status selection
  statusSectionInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  statusGridInline: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  statusOptionSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  statusOptionEmojiSmall: {
    fontSize: 16,
  },
  hideInlineBtnContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  // Event actions section (Modifier / Suggérer)
  eventActionsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  editEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  editEventBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  suggestChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9b51e0',
    borderStyle: 'dashed',
  },
  suggestChangeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9b51e0',
  },
  // Edit modal styles
  editInputGroup: {
    marginBottom: 16,
  },
  editInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9e9e9e',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
  },
  editTimeRow: {
    flexDirection: 'row',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  editCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9e9e9e',
  },
  editSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  editSaveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Suggestion modal
  suggestionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#e8f4fc',
    borderRadius: 8,
    marginBottom: 16,
  },
  suggestionInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#2d9cdb',
    lineHeight: 18,
  },
  suggestSendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#9b51e0',
  },
  suggestSendBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Confirmation modal
  confirmationModalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  confirmationModalText: {
    fontSize: 15,
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  confirmationOkBtn: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  confirmationOkBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Travel Preferences Prompt
  travelPromptContent: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  travelPromptEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  travelPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
    textAlign: 'center',
  },
  travelPromptText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  travelPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2D5016',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  travelPromptBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  travelPromptSkip: {
    marginTop: 16,
    paddingVertical: 8,
  },
  travelPromptSkipText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
});
