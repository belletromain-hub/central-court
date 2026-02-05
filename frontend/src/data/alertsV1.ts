// Système d'alertes et notifications V1

export type AlertType = 
  | 'flight_missing'      // Vol non réservé
  | 'hotel_missing'       // Hôtel non réservé  
  | 'registration_pending' // Inscription non confirmée
  | 'observation_new'     // Nouvelle observation
  | 'slot_suggestion'     // Suggestion de créneau
  | 'reminder';           // Rappel général

export type AlertPriority = 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  tournamentId?: string;
  tournamentName?: string;
  eventId?: string;
  createdAt: string;
  dueDate?: string;
  read: boolean;
  dismissed: boolean;
  // Pour les suggestions de créneaux
  fromUserId?: string;
  fromUserName?: string;
  fromUserRole?: string;
  targetSlot?: {
    date: string;
    time: string;
    endTime: string;
  };
}

export interface NotificationPreferences {
  inApp: boolean;
  push: boolean;
  email: boolean;
  // Délais de rappel (en jours)
  reminderDays: number[];
}

// Configuration par défaut
export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  inApp: true,
  push: true,
  email: true,
  reminderDays: [7, 3] // 7 jours et 3 jours avant
};

// Labels et couleurs pour les types d'alertes
export const ALERT_TYPE_CONFIG: Record<AlertType, { 
  icon: string; 
  color: string; 
  label: string;
  actionLabel?: string;
}> = {
  flight_missing: {
    icon: '✈️',
    color: '#f44336',
    label: 'Vol manquant',
    actionLabel: 'Réserver un vol'
  },
  hotel_missing: {
    icon: '🏨',
    color: '#ff9800',
    label: 'Hôtel manquant',
    actionLabel: 'Réserver un hôtel'
  },
  registration_pending: {
    icon: '📋',
    color: '#2196f3',
    label: 'Inscription à confirmer',
    actionLabel: 'Voir le tournoi'
  },
  observation_new: {
    icon: '💬',
    color: '#4caf50',
    label: 'Nouvelle observation',
    actionLabel: 'Voir'
  },
  slot_suggestion: {
    icon: '🔄',
    color: '#9c27b0',
    label: 'Suggestion de créneau',
    actionLabel: 'Répondre'
  },
  reminder: {
    icon: '⏰',
    color: '#607d8b',
    label: 'Rappel',
    actionLabel: 'Voir'
  }
};

// Fonction pour générer des alertes basées sur les tournois et événements
export function generateTournamentAlerts(
  tournaments: any[], // WeekTournaments[]
  events: any[], // CalendarEventV1[]
  reminderDays: number[] = [7, 3]
): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  tournaments.forEach(week => {
    // Pour chaque inscription à un tournoi
    week.registrations?.forEach((reg: any) => {
      const tournament = week.tournaments.find((t: any) => t.id === reg.tournamentId);
      if (!tournament) return;
      
      // Ne vérifier que si le statut est "participating" ou "accepted"
      if (reg.status !== 'participating' && reg.status !== 'accepted' && reg.status !== 'pending') return;
      
      const tournamentStart = new Date(tournament.startDate);
      const daysUntil = Math.ceil((tournamentStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Vérifier si on est dans la période de rappel
      if (daysUntil <= 0 || daysUntil > Math.max(...reminderDays)) return;
      
      const shouldAlert = reminderDays.some(days => daysUntil <= days);
      if (!shouldAlert) return;
      
      // Vérifier si un vol est réservé pour ce tournoi
      const hasFlightToTournament = events.some(e => 
        e.type === 'travel' && 
        e.title.toLowerCase().includes(tournament.city.toLowerCase()) &&
        new Date(e.date) <= tournamentStart
      );
      
      if (!hasFlightToTournament) {
        alerts.push({
          id: `alert-flight-${tournament.id}-${daysUntil}`,
          type: 'flight_missing',
          priority: daysUntil <= 3 ? 'high' : 'medium',
          title: `Vol non réservé - ${tournament.name}`,
          message: `Le tournoi ${tournament.name} commence dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}. Aucun vol n'est encore réservé.`,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          createdAt: new Date().toISOString(),
          dueDate: tournament.startDate,
          read: false,
          dismissed: false
        });
      }
      
      // Vérifier si un hôtel est réservé (on cherche un événement perso ou voyage mentionnant hôtel)
      const hasHotel = events.some(e => 
        (e.title.toLowerCase().includes('hôtel') || 
         e.title.toLowerCase().includes('hotel') ||
         e.title.toLowerCase().includes('hébergement')) &&
        new Date(e.date) >= new Date(tournament.startDate) &&
        new Date(e.date) <= new Date(tournament.endDate)
      );
      
      if (!hasHotel) {
        alerts.push({
          id: `alert-hotel-${tournament.id}-${daysUntil}`,
          type: 'hotel_missing',
          priority: daysUntil <= 3 ? 'high' : 'medium',
          title: `Hôtel non réservé - ${tournament.name}`,
          message: `Le tournoi ${tournament.name} commence dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}. Aucun hébergement n'est enregistré.`,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          createdAt: new Date().toISOString(),
          dueDate: tournament.startDate,
          read: false,
          dismissed: false
        });
      }
      
      // Vérifier si l'inscription est confirmée
      if (reg.status === 'pending' || reg.status === 'interested') {
        alerts.push({
          id: `alert-reg-${tournament.id}-${daysUntil}`,
          type: 'registration_pending',
          priority: daysUntil <= 3 ? 'high' : 'medium',
          title: `Inscription à confirmer - ${tournament.name}`,
          message: `Votre inscription au ${tournament.name} n'est pas encore confirmée. Le tournoi commence dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}.`,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          createdAt: new Date().toISOString(),
          dueDate: tournament.startDate,
          read: false,
          dismissed: false
        });
      }
    });
  });
  
  return alerts;
}

// Fonction pour créer une alerte de nouvelle observation
export function createObservationAlert(
  eventId: string,
  eventTitle: string,
  authorName: string,
  authorRole: string,
  observationText: string
): Alert {
  return {
    id: `alert-obs-${eventId}-${Date.now()}`,
    type: 'observation_new',
    priority: 'low',
    title: `Nouvelle observation de ${authorName}`,
    message: `${authorRole} a ajouté une observation sur "${eventTitle}": "${observationText.substring(0, 100)}${observationText.length > 100 ? '...' : ''}"`,
    eventId,
    createdAt: new Date().toISOString(),
    read: false,
    dismissed: false,
    fromUserId: authorName.toLowerCase().replace(/\s/g, '-'),
    fromUserName: authorName,
    fromUserRole: authorRole
  };
}

// Fonction pour créer une suggestion de créneau
export function createSlotSuggestion(
  fromUserName: string,
  fromUserRole: string,
  targetUserName: string,
  eventTitle: string,
  slot: { date: string; time: string; endTime: string },
  message: string
): Alert {
  return {
    id: `alert-slot-${Date.now()}`,
    type: 'slot_suggestion',
    priority: 'medium',
    title: `Suggestion de ${fromUserName}`,
    message: `${fromUserRole} souhaite prendre le créneau ${slot.time}-${slot.endTime} du ${new Date(slot.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}. Message: "${message}"`,
    createdAt: new Date().toISOString(),
    read: false,
    dismissed: false,
    fromUserId: fromUserName.toLowerCase().replace(/\s/g, '-'),
    fromUserName,
    fromUserRole,
    targetSlot: slot
  };
}

// Alertes de démo
export const DEMO_ALERTS: Alert[] = [
  {
    id: 'demo-alert-1',
    type: 'flight_missing',
    priority: 'high',
    title: 'Vol non réservé - Open Occitanie',
    message: 'Le tournoi Open Occitanie commence dans 5 jours. Aucun vol n\'est encore réservé pour Montpellier.',
    tournamentId: 'montpellier-2026',
    tournamentName: 'Open Occitanie',
    createdAt: new Date().toISOString(),
    dueDate: '2026-02-02',
    read: false,
    dismissed: false
  },
  {
    id: 'demo-alert-2',
    type: 'hotel_missing',
    priority: 'medium',
    title: 'Hôtel non réservé - Rotterdam',
    message: 'Le tournoi ABN AMRO Open commence dans 12 jours. Pensez à réserver votre hébergement.',
    tournamentId: 'rotterdam-2026',
    tournamentName: 'ABN AMRO Open',
    createdAt: new Date().toISOString(),
    dueDate: '2026-02-09',
    read: false,
    dismissed: false
  },
  {
    id: 'demo-alert-3',
    type: 'observation_new',
    priority: 'low',
    title: 'Nouvelle observation de Dr. Laurent',
    message: 'Kiné a ajouté une observation sur "Séance Kiné Épaule": "Épaule droite OK pour entraînement..."',
    eventId: 'evt-020',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: true,
    dismissed: false,
    fromUserName: 'Dr. Sophie Laurent',
    fromUserRole: 'Kiné'
  }
];
