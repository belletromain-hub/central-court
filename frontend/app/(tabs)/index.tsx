import React, { useState, useMemo, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, CalendarList, LocaleConfig } from 'react-native-calendars';
import Colors from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { formatDateRange, formatDate, formatDateShort, getDaysUntil, isDeadlineSoon, getWeekDay } from '../../src/utils/dateFormatter';
import { getSurfaceColor, getSurfaceIcon, getEnvironmentIcon } from '../../src/data/tournaments';
import { getEventTypeColor, getEventTypeIcon, getEventTypeLabel, EventType, CalendarEvent } from '../../src/data/events';
import { Recommendation } from '../../src/types';

// Configure French locale
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

type ViewMode = 'timeline' | 'week' | 'month';
type FilterType = 'all' | 'tournament' | 'media' | 'medical' | 'training' | 'travel' | 'sponsor';
type StatusFilter = 'all' | 'confirmed' | 'pending';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { tournaments, events, updateTournamentStatus, addEvent, deleteEvent, recommendations } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Create marked dates for calendar
  const markedDates = useMemo(() => {
    const marks: any = {};
    
    allItems.forEach(item => {
      const color = item.type === 'tournament' 
        ? (item as any).tournament ? getSurfaceColor((item as any).tournament.surface) : Colors.primary
        : getEventTypeColor(item.type);
      
      if (!marks[item.date]) {
        marks[item.date] = { dots: [], marked: true };
      }
      marks[item.date].dots.push({ color });
    });
    
    // Add selected date styling
    if (marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: Colors.primary };
    } else {
      marks[selectedDate] = { selected: true, selectedColor: Colors.primary };
    }
    
    return marks;
  }, [allItems, selectedDate]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return allItems.filter(item => item.date === selectedDate);
  }, [allItems, selectedDate]);

  // Get events for the selected week
  const weekEvents = useMemo(() => {
    const selected = new Date(selectedDate);
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - selected.getDay() + 1); // Monday
    
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

  const navigateWeek = (direction: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction * 7));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const renderEventCompact = (item: any) => {
    const color = item.type === 'tournament'
      ? getSurfaceColor(item.tournament?.surface || 'Hard')
      : getEventTypeColor(item.type);
    const icon = item.type === 'tournament' ? 'trophy' : getEventTypeIcon(item.type);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.eventCompact, { borderLeftColor: color }]}
      >
        <View style={[styles.eventCompactIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={14} color={color} />
        </View>
        <View style={styles.eventCompactContent}>
          <Text style={styles.eventCompactTitle} numberOfLines={1}>{item.title}</Text>
          {item.time && <Text style={styles.eventCompactTime}>{item.time}</Text>}
        </View>
        {item.status === 'confirmed' && (
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        )}
      </TouchableOpacity>
    );
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

  // Week View Render
  const renderWeekView = () => {
    const weekStart = new Date(weekEvents[0].date);
    const weekEnd = new Date(weekEvents[6].date);
    const monthYear = weekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return (
      <View style={styles.weekViewContainer}>
        {/* Week Header */}
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

        {/* Days Row */}
        <View style={styles.weekDaysRow}>
          {weekEvents.map((dayData, index) => {
            const isToday = dayData.date === new Date().toISOString().split('T')[0];
            const isSelected = dayData.date === selectedDate;
            const hasEvents = dayData.events.length > 0;

            return (
              <TouchableOpacity
                key={dayData.date}
                style={[
                  styles.weekDayColumn,
                  isSelected && styles.weekDaySelected,
                ]}
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

        {/* Selected Day Events */}
        <ScrollView style={styles.weekEventsContainer}>
          <Text style={styles.selectedDayTitle}>
            {getWeekDay(selectedDate)} {formatDate(selectedDate)}
          </Text>
          {selectedDateEvents.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Ionicons name="calendar-outline" size={40} color={Colors.text.muted} />
              <Text style={styles.noEventsText}>Aucun événement</Text>
            </View>
          ) : (
            selectedDateEvents.map(item => 
              item.type === 'tournament' && (item as any).tournament
                ? <View key={item.id}>{renderTournamentCard(item)}</View>
                : <View key={item.id}>{renderEventCard(item as CalendarEvent & { id: string })}</View>
            )
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  // Month View Render
  const renderMonthView = () => {
    return (
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
            dotColor: Colors.primary,
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

        {/* Selected Day Events */}
        <ScrollView style={styles.monthEventsContainer}>
          <Text style={styles.selectedDayTitle}>
            {getWeekDay(selectedDate)} {formatDate(selectedDate)}
          </Text>
          {selectedDateEvents.length === 0 ? (
            <View style={styles.noEventsContainerSmall}>
              <Text style={styles.noEventsTextSmall}>Aucun événement ce jour</Text>
            </View>
          ) : (
            selectedDateEvents.map(item => renderEventCompact(item))
          )}
        </ScrollView>
      </View>
    );
  };

  // Timeline View Render (original)
  const renderTimelineView = () => {
    return (
      <>
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
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3c72', '#2a5298']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Le Central Court</Text>
            <Text style={styles.headerSubtitle}>Calendrier Unifié</Text>
          </View>
          <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>Aujourd'hui</Text>
          </TouchableOpacity>
        </View>

        {/* View Mode Switcher */}
        <View style={styles.viewModeSwitcher}>
          {[
            { mode: 'timeline' as ViewMode, icon: 'list', label: 'Liste' },
            { mode: 'week' as ViewMode, icon: 'calendar', label: 'Semaine' },
            { mode: 'month' as ViewMode, icon: 'grid', label: 'Mois' },
          ].map(item => (
            <TouchableOpacity
              key={item.mode}
              style={[styles.viewModeBtn, viewMode === item.mode && styles.viewModeBtnActive]}
              onPress={() => setViewMode(item.mode)}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={viewMode === item.mode ? Colors.primary : 'rgba(255,255,255,0.7)'}
              />
              <Text style={[styles.viewModeText, viewMode === item.mode && styles.viewModeTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Stats Dashboard (only for timeline) */}
      {viewMode === 'timeline' && (
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
      )}

      {/* Content based on view mode */}
      {viewMode === 'timeline' && renderTimelineView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

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
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 4,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewModeBtnActive: {
    backgroundColor: '#fff',
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  viewModeTextActive: {
    color: Colors.primary,
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
  // Week View Styles
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
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  weekSubtitle: {
    fontSize: 13,
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
    paddingVertical: 8,
    borderRadius: 12,
  },
  weekDaySelected: {
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
  },
  weekDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  weekDayTextSelected: {
    color: Colors.primary,
  },
  weekDayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 16,
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
    marginTop: 6,
    gap: 3,
  },
  weekDayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekEventsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 15,
    color: Colors.text.muted,
    marginTop: 12,
  },
  noEventsContainerSmall: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noEventsTextSmall: {
    fontSize: 14,
    color: Colors.text.muted,
  },
  // Month View Styles
  monthViewContainer: {
    flex: 1,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  monthEventsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  eventCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  eventCompactIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCompactContent: {
    flex: 1,
    marginLeft: 10,
  },
  eventCompactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  eventCompactTime: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  // Recommendations
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
});
