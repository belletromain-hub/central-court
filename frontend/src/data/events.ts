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

// Événements enrichis avec plus de médical et entraînement
export const sampleEvents: CalendarEvent[] = [
  // === VOYAGES ===
  {
    id: 'e1',
    type: 'travel',
    title: 'Vol Paris → Montpellier',
    description: 'AF 7520 - Terminal 2F',
    location: 'CDG → Montpellier',
    date: '2026-02-01',
    time: '18:30',
    status: 'confirmed',
    priority: 'high'
  },
  
  // === MÉDICAL - Semaine 1 ===
  {
    id: 'med1',
    type: 'medical',
    title: 'Check-up complet Dr. Martin',
    description: 'Bilan pré-saison terre battue - analyses sang, cardio, articulations',
    location: 'Paris - Clinique du Sport',
    date: '2026-02-03',
    time: '09:00',
    endTime: '12:00',
    status: 'confirmed',
    priority: 'high',
    contact: '+33 1 45 67 89 00'
  },
  {
    id: 'med2',
    type: 'medical',
    title: 'Séance kiné - Épaule',
    description: 'Travail de récupération épaule droite avec Thomas',
    location: 'Cabinet Physio Sport Paris',
    date: '2026-02-03',
    time: '15:00',
    endTime: '16:00',
    status: 'confirmed',
    priority: 'medium'
  },
  {
    id: 'med3',
    type: 'medical',
    title: 'Massage récupération',
    description: 'Session deep tissue - préparation tournoi',
    location: 'CNE - Salle récup',
    date: '2026-02-04',
    time: '18:00',
    endTime: '19:00',
    status: 'confirmed',
    priority: 'medium'
  },
  
  // === ENTRAÎNEMENT - Semaine 1 ===
  {
    id: 'train1',
    type: 'training',
    title: 'Tennis - Service & Volée',
    description: 'Travail technique avec Coach Durand - focus montée au filet',
    location: 'CNE - Terrain 3',
    date: '2026-02-03',
    time: '07:00',
    endTime: '09:00',
    status: 'confirmed',
    priority: 'high'
  },
  {
    id: 'train2',
    type: 'training',
    title: 'Prépa physique - Cardio',
    description: 'Endurance et interval training avec préparateur',
    location: 'CNE - Salle fitness',
    date: '2026-02-03',
    time: '14:00',
    endTime: '15:30',
    status: 'confirmed',
    priority: 'medium'
  },
  {
    id: 'train3',
    type: 'training',
    title: 'Tennis - Revers lifté',
    description: 'Session technique revers - prépa terre battue',
    location: 'CNE - Terrain 2',
    date: '2026-02-04',
    time: '08:00',
    endTime: '10:30',
    status: 'confirmed',
    priority: 'high'
  },
  {
    id: 'train4',
    type: 'training',
    title: 'Renforcement musculaire',
    description: 'Jambes et core - prévention blessures',
    location: 'CNE - Salle musculation',
    date: '2026-02-04',
    time: '14:00',
    endTime: '16:00',
    status: 'confirmed',
    priority: 'medium'
  },
  {
    id: 'train5',
    type: 'training',
    title: 'Match d\'entraînement',
    description: 'Sparring avec Lucas Pouille - 3 sets',
    location: 'CNE - Court central',
    date: '2026-02-05',
    time: '10:00',
    endTime: '12:30',
    status: 'confirmed',
    priority: 'high'
  },
  
  // === MÉDIA ===
  {
    id: 'e2',
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
    id: 'media2',
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
  
  // === SPONSOR ===
  {
    id: 'sponsor1',
    type: 'sponsor',
    title: 'Shooting Nike',
    description: 'Nouvelle collection été 2026 - tenues Roland Garros',
    location: 'Studio Boulogne',
    date: '2026-02-06',
    time: '10:00',
    endTime: '17:00',
    status: 'pending',
    priority: 'medium',
    contact: '+33 1 55 00 00 00'
  },
  {
    id: 'sponsor2',
    type: 'sponsor',
    title: 'Dîner gala Rolex',
    description: 'Événement partenaire principal - dress code formel',
    location: 'Monaco - Hôtel de Paris',
    date: '2026-02-20',
    time: '19:30',
    status: 'pending',
    priority: 'high',
    contact: '+377 98 06 30 00'
  },
  
  // === MÉDICAL - Semaine 2 ===
  {
    id: 'med4',
    type: 'medical',
    title: 'Séance kiné - Récup match',
    description: 'Post-tournoi Montpellier - travail global',
    location: 'Arena Montpellier - Kiné tournoi',
    date: '2026-02-07',
    time: '09:00',
    endTime: '10:00',
    status: 'confirmed',
    priority: 'medium'
  },
  {
    id: 'med5',
    type: 'medical',
    title: 'Cryothérapie',
    description: 'Session récupération intensive',
    location: 'Centre Cryo Paris',
    date: '2026-02-09',
    time: '11:00',
    endTime: '11:30',
    status: 'pending',
    priority: 'low'
  },
  {
    id: 'med6',
    type: 'medical',
    title: 'Ostéopathe',
    description: 'Bilan et ajustements Dr. Lefebvre',
    location: 'Cabinet Ostéo Sport',
    date: '2026-02-10',
    time: '14:00',
    endTime: '15:00',
    status: 'confirmed',
    priority: 'medium',
    contact: '+33 1 42 33 44 55'
  },
  {
    id: 'med7',
    type: 'medical',
    title: 'Nutrition - Bilan',
    description: 'RDV nutritionniste - ajustement régime tournée',
    location: 'Visio',
    date: '2026-02-11',
    time: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    priority: 'medium'
  },
  
  // === ENTRAÎNEMENT - Semaine 2 ===
  {
    id: 'train6',
    type: 'training',
    title: 'Reprise légère',
    description: 'Post-tournoi - échauffement et étirements',
    location: 'CNE - Terrain 1',
    date: '2026-02-09',
    time: '09:00',
    endTime: '10:30',
    status: 'confirmed',
    priority: 'low'
  },
  {
    id: 'train7',
    type: 'training',
    title: 'Tennis - Retour de service',
    description: 'Travail spécifique retour - anticipation',
    location: 'CNE - Terrain 2',
    date: '2026-02-10',
    time: '08:00',
    endTime: '10:00',
    status: 'confirmed',
    priority: 'high'
  },
  {
    id: 'train8',
    type: 'training',
    title: 'Yoga & Mobilité',
    description: 'Session récupération active avec prof yoga',
    location: 'CNE - Studio',
    date: '2026-02-10',
    time: '17:00',
    endTime: '18:00',
    status: 'confirmed',
    priority: 'low'
  },
  {
    id: 'train9',
    type: 'training',
    title: 'Prépa Rotterdam',
    description: 'Adaptation indoor - surface rapide',
    location: 'CNE - Court indoor',
    date: '2026-02-11',
    time: '09:00',
    endTime: '11:30',
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'train10',
    type: 'training',
    title: 'Sparring intensif',
    description: 'Match avec Ugo Humbert - prépa Rotterdam',
    location: 'CNE - Court central indoor',
    date: '2026-02-12',
    time: '10:00',
    endTime: '12:00',
    status: 'pending',
    priority: 'high'
  },
  
  // === VOYAGE ===
  {
    id: 'travel2',
    type: 'travel',
    title: 'Vol Montpellier → Rotterdam',
    description: 'Via Amsterdam - KL 1268',
    location: 'Montpellier → AMS → Rotterdam',
    date: '2026-02-08',
    time: '12:00',
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'travel3',
    type: 'travel',
    title: 'Vol Rotterdam → Dubai',
    description: 'Emirates EK 148 - Classe Affaires',
    location: 'Rotterdam → Dubai',
    date: '2026-02-16',
    time: '14:30',
    status: 'pending',
    priority: 'high'
  },
  
  // === MÉDICAL - Semaine 3+ ===
  {
    id: 'med8',
    type: 'medical',
    title: 'Podologue',
    description: 'Contrôle semelles orthopédiques',
    location: 'Cabinet Podologie Sport',
    date: '2026-02-13',
    time: '11:00',
    endTime: '12:00',
    status: 'pending',
    priority: 'low'
  },
  {
    id: 'med9',
    type: 'medical',
    title: 'IRM genou préventif',
    description: 'Contrôle annuel - Dr. Bernard',
    location: 'Centre Imagerie Médicale',
    date: '2026-02-18',
    time: '08:30',
    endTime: '09:30',
    status: 'pending',
    priority: 'medium',
    contact: '+33 1 44 55 66 77'
  },
  {
    id: 'med10',
    type: 'medical',
    title: 'Séance psy sport',
    description: 'Préparation mentale - gestion pression',
    location: 'Visio avec Dr. Sophie Laurent',
    date: '2026-02-14',
    time: '16:00',
    endTime: '17:00',
    status: 'confirmed',
    priority: 'medium'
  },
];
