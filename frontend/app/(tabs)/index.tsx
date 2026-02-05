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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import Colors from '../../src/constants/colors';
import { 
  ATP_TOURNAMENTS_FEB_2026, 
  WeekTournaments, 
  Tournament,
  TournamentStatus,
  TOURNAMENT_STATUS_LABELS,
  SURFACE_COLORS 
} from '../../src/data/tournamentsV1';
import { 
  EVENT_CATEGORIES, 
  EventTypeV1, 
  CalendarEventV1, 
  DEMO_EVENTS_FEB_2026,
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
  
  // State
  const [currentMonth, setCurrentMonth] = useState('2026-02');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEventV1[]>(DEMO_EVENTS_FEB_2026);
  const [weekTournaments, setWeekTournaments] = useState<WeekTournaments[]>(ATP_TOURNAMENTS_FEB_2026);
  
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
  
  // Get events for a specific date
  const getEventsForDate = (date: string) => {
    return events.filter(e => e.date === date);
  };
  
  // Get tournament events for calendar marks
  const tournamentMarks = useMemo(() => {
    const marks: Record<string, any> = {};
    
    weekTournaments.forEach(week => {
      if (week.selectedTournamentId) {
        const tournament = week.tournaments.find(t => t.id === week.selectedTournamentId);
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
      }
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
  
  // Handle tournament selection
  const handleSelectTournament = (weekNumber: number, tournamentId: string | null) => {
    setWeekTournaments(prev => prev.map(week => {
      if (week.weekNumber === weekNumber) {
        return {
          ...week,
          selectedTournamentId: tournamentId,
          status: tournamentId ? 'interested' : 'none'
        };
      }
      return week;
    }));
    setShowTournamentModal(false);
  };
  
  // Handle tournament status change
  const handleStatusChange = (weekNumber: number, status: TournamentStatus) => {
    setWeekTournaments(prev => prev.map(week => {
      if (week.weekNumber === weekNumber) {
        return { ...week, status };
      }
      return week;
    }));
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
    const selectedTournament = week.tournaments.find(t => t.id === week.selectedTournamentId);
    const statusInfo = TOURNAMENT_STATUS_LABELS[week.status];
    
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
        
        {selectedTournament ? (
          <View style={styles.selectedTournamentInfo}>
            <View style={styles.tournamentNameRow}>
              <Text style={styles.tournamentFlag}>{selectedTournament.countryFlag}</Text>
              <View style={styles.tournamentDetails}>
                <Text style={styles.tournamentName}>{selectedTournament.name}</Text>
                <Text style={styles.tournamentCategory}>{selectedTournament.category} • {selectedTournament.surface}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.emoji} {statusInfo.label}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noTournamentSelected}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.text.muted} />
            <Text style={styles.noTournamentText}>
              {week.tournaments.length} tournoi{week.tournaments.length > 1 ? 's' : ''} disponible{week.tournaments.length > 1 ? 's' : ''}
            </Text>
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
    const selectedTournament = week?.tournaments.find(t => t.id === week.selectedTournamentId);
    
    // Check if selected date is during a tournament
    const isTournamentDay = selectedTournament && 
      new Date(selectedDate) >= new Date(selectedTournament.startDate) &&
      new Date(selectedDate) <= new Date(selectedTournament.endDate);
    
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
        
        {/* Tournament info if applicable */}
        {isTournamentDay && selectedTournament && (
          <View style={[styles.eventCard, { borderLeftColor: EVENT_CATEGORIES.tournament.color }]}>
            <View style={styles.eventCardContent}>
              <View style={styles.eventTypeRow}>
                <Text style={styles.eventEmoji}>{EVENT_CATEGORIES.tournament.icon}</Text>
                <Text style={[styles.eventType, { color: EVENT_CATEGORIES.tournament.color }]}>
                  {selectedTournament.category}
                </Text>
              </View>
              <Text style={styles.eventTitle}>{selectedTournament.name}</Text>
              <Text style={styles.eventLocation}>
                {selectedTournament.countryFlag} {selectedTournament.city}, {selectedTournament.country}
              </Text>
            </View>
          </View>
        )}
        
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
        
        {dayEvents.length === 0 && !isTournamentDay && (
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
          <Text style={styles.headerTitle}>🎾 Tennis Assistant</Text>
          <Text style={styles.headerSubtitle}>Calendrier {currentMonth.split('-')[1] === '02' ? 'Février' : ''} 2026</Text>
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
              <>
                <Text style={styles.weekModalLabel}>
                  Semaine {selectedWeek.weekNumber} • {selectedWeek.weekLabel}
                </Text>
                
                <ScrollView style={styles.tournamentList}>
                  {selectedWeek.tournaments.map(tournament => (
                    <TouchableOpacity
                      key={tournament.id}
                      style={[
                        styles.tournamentOption,
                        selectedWeek.selectedTournamentId === tournament.id && styles.tournamentOptionSelected
                      ]}
                      onPress={() => handleSelectTournament(selectedWeek.weekNumber, tournament.id)}
                    >
                      <View style={styles.tournamentOptionHeader}>
                        <Text style={styles.tournamentOptionFlag}>{tournament.countryFlag}</Text>
                        <View style={styles.tournamentOptionInfo}>
                          <Text style={styles.tournamentOptionName}>{tournament.name}</Text>
                          <Text style={styles.tournamentOptionCity}>{tournament.city}, {tournament.country}</Text>
                        </View>
                        {selectedWeek.selectedTournamentId === tournament.id && (
                          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
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
                      
                      <TouchableOpacity
                        style={styles.playerZoneBtn}
                        onPress={() => Linking.openURL(tournament.playerZoneLink)}
                      >
                        <Ionicons name="open-outline" size={16} color={Colors.primary} />
                        <Text style={styles.playerZoneBtnText}>S'inscrire (Player Zone)</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <TouchableOpacity
                  style={styles.noTournamentBtn}
                  onPress={() => handleSelectTournament(selectedWeek.weekNumber, null)}
                >
                  <Ionicons name="close-circle-outline" size={20} color={Colors.text.secondary} />
                  <Text style={styles.noTournamentBtnText}>Aucun tournoi cette semaine</Text>
                </TouchableOpacity>
              </>
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
              </ScrollView>
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
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
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
    maxHeight: 500,
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
});
