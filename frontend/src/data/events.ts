// Types d'événements pour le calendrier unifié
export type EventType = 'tournament' | 'media' | 'medical' | 'training' | 'travel' | 'sponsor';

export interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  location?: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  contact?: string;
  linkedTournamentId?: string;
}

export const getEventTypeLabel = (type: EventType): string => {
  switch (type) {
    case 'tournament': return 'Tournoi';
    case 'media': return 'Média';
    case 'medical': return 'Médical';
    case 'training': return 'Entraînement';
    case 'travel': return 'Voyage';
    case 'sponsor': return 'Sponsor';
    default: return 'Événement';
  }
};

export const getEventTypeColor = (type: EventType): string => {
  switch (type) {
    case 'tournament': return '#1da1f2';
    case 'media': return '#9c27b0';
    case 'medical': return '#e0245e';
    case 'training': return '#4CAF50';
    case 'travel': return '#ff9800';
    case 'sponsor': return '#00bcd4';
    default: return '#757575';
  }
};

export const getEventTypeIcon = (type: EventType): string => {
  switch (type) {
    case 'tournament': return 'trophy';
    case 'media': return 'camera';
    case 'medical': return 'medkit';
    case 'training': return 'fitness';
    case 'travel': return 'airplane';
    case 'sponsor': return 'briefcase';
    default: return 'calendar';
  }
};

// Événements de démonstration
export const sampleEvents: CalendarEvent[] = [
  {
    id: 'e1',
    type: 'media',
    title: 'Interview L\'Équipe',
    description: 'Interview exclusive pour la préparation Roland Garros',
    location: 'Paris - Siège L\'Équipe',
    date: '2026-02-05',
    time: '14:00',
    endTime: '15:30',
    status: 'confirmed',
    priority: 'high',
    contact: '+33 1 40 93 20 00'
  },
  {
    id: 'e2',
    type: 'medical',
    title: 'Check-up Dr. Martin',
    description: 'Bilan complet pré-saison terre battue',
    location: 'Paris - Clinique du Sport',
    date: '2026-02-03',
    time: '09:00',
    endTime: '11:00',
    status: 'confirmed',
    priority: 'high',
    contact: '+33 1 45 67 89 00'
  },
  {
    id: 'e3',
    type: 'training',
    title: 'Session avec Coach Durand',
    description: 'Travail sur le service et le revers',
    location: 'CNE - Terrain 3',
    date: '2026-02-04',
    time: '08:00',
    endTime: '11:00',
    status: 'confirmed',
    priority: 'medium'
  },
  {
    id: 'e4',
    type: 'travel',
    title: 'Vol Paris → Montpellier',
    description: 'AF 7520 - Terminal 2F',
    location: 'CDG → Montpellier',
    date: '2026-02-01',
    time: '18:30',
    status: 'confirmed',
    priority: 'high'
  },
  {
    id: 'e5',
    type: 'sponsor',
    title: 'Shooting Nike',
    description: 'Nouvelle collection été 2026',
    location: 'Studio Boulogne',
    date: '2026-02-06',
    time: '10:00',
    endTime: '17:00',
    status: 'pending',
    priority: 'medium',
    contact: '+33 1 55 00 00 00'
  },
  {
    id: 'e6',
    type: 'media',
    title: 'Conférence de presse',
    description: 'Avant-match Open Occitanie',
    location: 'Arena Montpellier',
    date: '2026-02-02',
    time: '16:00',
    endTime: '17:00',
    status: 'pending',
    priority: 'medium',
    linkedTournamentId: '1'
  },
  {
    id: 'e7',
    type: 'training',
    title: 'Préparation physique',
    description: 'Session cardio et renforcement',
    location: 'Salle CNE',
    date: '2026-02-04',
    time: '14:00',
    endTime: '16:00',
    status: 'confirmed',
    priority: 'medium'
  },
  {
    id: 'e8',
    type: 'sponsor',
    title: 'Dîner gala Rolex',
    description: 'Événement partenaire principal',
    location: 'Monaco - Hôtel de Paris',
    date: '2026-02-20',
    time: '19:30',
    status: 'pending',
    priority: 'high',
    contact: '+377 98 06 30 00'
  },
  {
    id: 'e9',
    type: 'medical',
    title: 'Séance kiné',
    description: 'Récupération épaule droite',
    location: 'Cabinet Physio Sport',
    date: '2026-02-07',
    time: '09:00',
    endTime: '10:00',
    status: 'confirmed',
    priority: 'medium'
  },
  {
    id: 'e10',
    type: 'travel',
    title: 'Vol Montpellier → Rotterdam',
    description: 'Via Amsterdam - KL 1268',
    location: 'Montpellier → AMS → Rotterdam',
    date: '2026-02-08',
    time: '12:00',
    status: 'pending',
    priority: 'high'
  }
];
