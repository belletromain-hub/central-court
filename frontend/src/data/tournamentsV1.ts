// Tournois ATP/WTA/ITF pour V1 MVP - Février 2026

export type TournamentStatus = 'interested' | 'pending' | 'registered' | 'accepted' | 'declined' | 'participating' | 'none';

export interface Tournament {
  id: string;
  name: string;
  city: string;
  country: string;
  countryFlag: string;
  category: string;
  surface: 'Hard Indoor' | 'Hard Outdoor' | 'Clay' | 'Grass';
  prize: string;
  playerZoneLink: string;
  deadlineDate: string;
  startDate: string;
  endDate: string;
}

export interface WeekTournaments {
  weekNumber: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  tournaments: Tournament[];
  selectedTournamentId: string | null;
  status: TournamentStatus;
}

// Tournois ATP Février 2026
export const ATP_TOURNAMENTS_FEB_2026: WeekTournaments[] = [
  {
    weekNumber: 6,
    weekLabel: '2-8 février 2026',
    startDate: '2026-02-02',
    endDate: '2026-02-08',
    tournaments: [
      {
        id: 'montpellier-2026',
        name: 'Open Occitanie',
        city: 'Montpellier',
        country: 'France',
        countryFlag: '🇫🇷',
        category: 'ATP 250',
        surface: 'Hard Indoor',
        prize: '€768,735',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/montpellier',
        deadlineDate: '2026-01-26',
        startDate: '2026-02-02',
        endDate: '2026-02-08'
      },
      {
        id: 'pune-2026',
        name: 'Tata Open Maharashtra',
        city: 'Pune',
        country: 'Inde',
        countryFlag: '🇮🇳',
        category: 'ATP 250',
        surface: 'Hard Outdoor',
        prize: '$661,145',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/pune',
        deadlineDate: '2026-01-26',
        startDate: '2026-02-02',
        endDate: '2026-02-08'
      }
    ],
    selectedTournamentId: null,
    status: 'none'
  },
  {
    weekNumber: 7,
    weekLabel: '9-15 février 2026',
    startDate: '2026-02-09',
    endDate: '2026-02-15',
    tournaments: [
      {
        id: 'rotterdam-2026',
        name: 'ABN AMRO Open',
        city: 'Rotterdam',
        country: 'Pays-Bas',
        countryFlag: '🇳🇱',
        category: 'ATP 500',
        surface: 'Hard Indoor',
        prize: '€2,477,345',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/rotterdam',
        deadlineDate: '2026-02-02',
        startDate: '2026-02-09',
        endDate: '2026-02-15'
      },
      {
        id: 'delray-2026',
        name: 'Delray Beach Open',
        city: 'Delray Beach',
        country: 'USA',
        countryFlag: '🇺🇸',
        category: 'ATP 250',
        surface: 'Hard Outdoor',
        prize: '$768,735',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/delray-beach',
        deadlineDate: '2026-02-02',
        startDate: '2026-02-09',
        endDate: '2026-02-15'
      }
    ],
    selectedTournamentId: null,
    status: 'none'
  },
  {
    weekNumber: 8,
    weekLabel: '16-22 février 2026',
    startDate: '2026-02-16',
    endDate: '2026-02-22',
    tournaments: [
      {
        id: 'doha-2026',
        name: 'Qatar ExxonMobil Open',
        city: 'Doha',
        country: 'Qatar',
        countryFlag: '🇶🇦',
        category: 'ATP 250',
        surface: 'Hard Outdoor',
        prize: '$1,495,665',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/doha',
        deadlineDate: '2026-02-09',
        startDate: '2026-02-16',
        endDate: '2026-02-22'
      },
      {
        id: 'buenos-aires-2026',
        name: 'Argentina Open',
        city: 'Buenos Aires',
        country: 'Argentine',
        countryFlag: '🇦🇷',
        category: 'ATP 250',
        surface: 'Clay',
        prize: '$768,735',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/buenos-aires',
        deadlineDate: '2026-02-09',
        startDate: '2026-02-16',
        endDate: '2026-02-22'
      }
    ],
    selectedTournamentId: null,
    status: 'none'
  },
  {
    weekNumber: 9,
    weekLabel: '23 fév - 1 mars 2026',
    startDate: '2026-02-23',
    endDate: '2026-03-01',
    tournaments: [
      {
        id: 'acapulco-2026',
        name: 'Abierto Mexicano Telcel',
        city: 'Acapulco',
        country: 'Mexique',
        countryFlag: '🇲🇽',
        category: 'ATP 500',
        surface: 'Hard Outdoor',
        prize: '$2,234,550',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/acapulco',
        deadlineDate: '2026-02-16',
        startDate: '2026-02-23',
        endDate: '2026-03-01'
      },
      {
        id: 'dubai-2026',
        name: 'Dubai Duty Free Championships',
        city: 'Dubai',
        country: 'Émirats',
        countryFlag: '🇦🇪',
        category: 'ATP 500',
        surface: 'Hard Outdoor',
        prize: '$2,794,840',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/dubai',
        deadlineDate: '2026-02-16',
        startDate: '2026-02-23',
        endDate: '2026-03-01'
      },
      {
        id: 'santiago-2026',
        name: 'Chile Dove Men+Care Open',
        city: 'Santiago',
        country: 'Chili',
        countryFlag: '🇨🇱',
        category: 'ATP 250',
        surface: 'Clay',
        prize: '$768,735',
        playerZoneLink: 'https://playerzone.atptour.com/tournaments/santiago',
        deadlineDate: '2026-02-16',
        startDate: '2026-02-23',
        endDate: '2026-03-01'
      }
    ],
    selectedTournamentId: null,
    status: 'none'
  }
];

// Statuts tournoi avec labels français
export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, { label: string; emoji: string; color: string }> = {
  interested: { label: 'Intéressé', emoji: '🤔', color: '#ff9800' },
  pending: { label: 'En attente', emoji: '⏳', color: '#2196f3' },
  registered: { label: 'Inscrit', emoji: '✓', color: '#4caf50' },
  accepted: { label: 'Accepté', emoji: '✅', color: '#388e3c' },
  participating: { label: 'Participe', emoji: '🎾', color: '#6a1b9a' },
  declined: { label: 'Refusé', emoji: '❌', color: '#f44336' },
  none: { label: 'Aucun', emoji: '—', color: '#9e9e9e' }
};

// Surface colors
export const SURFACE_COLORS: Record<string, string> = {
  'Hard Indoor': '#3f51b5',
  'Hard Outdoor': '#2196f3',
  'Clay': '#ff5722',
  'Grass': '#4caf50'
};
