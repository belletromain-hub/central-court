// Base de données statique des tournois - Février 2026
export interface Tournament {
  id: string;
  name: string;
  location: string;
  country: string;
  countryFlag: string;
  dates: {
    start: string;
    end: string;
  };
  surface: 'Clay' | 'Hard' | 'Grass' | 'Carpet';
  environment: 'Indoor' | 'Outdoor';
  draw: {
    sgl: number;
    dbl: number;
  };
  prize: string;
  contact: string;
  deadline: string;
  status: 'pending' | 'confirmed' | 'withdrawn';
  links: {
    tickets: string;
    registration: string;
  };
}

export const tournaments: Tournament[] = [
  {
    id: '1',
    name: 'Open Occitanie',
    location: 'Montpellier',
    country: 'France',
    countryFlag: '🇫🇷',
    dates: { start: '2026-02-02', end: '2026-02-08' },
    surface: 'Hard',
    environment: 'Indoor',
    draw: { sgl: 28, dbl: 16 },
    prize: '768 735 €',
    contact: '+33 4 67 15 63 00',
    deadline: '2026-01-26',
    status: 'pending',
    links: {
      tickets: 'https://www.openoccitanie.com/billetterie',
      registration: 'https://www.atptour.com/en/tournaments/montpellier'
    }
  },
  {
    id: '2',
    name: 'Tata Open Maharashtra',
    location: 'Pune',
    country: 'Inde',
    countryFlag: '🇮🇳',
    dates: { start: '2026-02-02', end: '2026-02-08' },
    surface: 'Hard',
    environment: 'Outdoor',
    draw: { sgl: 28, dbl: 16 },
    prize: '661 145 $',
    contact: '+91 20 2553 1234',
    deadline: '2026-01-26',
    status: 'pending',
    links: {
      tickets: 'https://www.tataopenmaharashtra.com',
      registration: 'https://www.atptour.com/en/tournaments/pune'
    }
  },
  {
    id: '3',
    name: 'Córdoba Open',
    location: 'Córdoba',
    country: 'Argentine',
    countryFlag: '🇦🇷',
    dates: { start: '2026-02-09', end: '2026-02-15' },
    surface: 'Clay',
    environment: 'Outdoor',
    draw: { sgl: 28, dbl: 16 },
    prize: '661 145 $',
    contact: '+54 351 424 1234',
    deadline: '2026-01-26',
    status: 'confirmed',
    links: {
      tickets: 'https://www.cordobaopen.com',
      registration: 'https://www.atptour.com/en/tournaments/cordoba'
    }
  },
  {
    id: '4',
    name: 'ABN AMRO Open',
    location: 'Rotterdam',
    country: 'Pays-Bas',
    countryFlag: '🇳🇱',
    dates: { start: '2026-02-09', end: '2026-02-15' },
    surface: 'Hard',
    environment: 'Indoor',
    draw: { sgl: 48, dbl: 16 },
    prize: '2 477 345 €',
    contact: '+31 10 293 3000',
    deadline: '2026-02-02',
    status: 'pending',
    links: {
      tickets: 'https://www.abnamrowtt.nl',
      registration: 'https://www.atptour.com/en/tournaments/rotterdam'
    }
  },
  {
    id: '5',
    name: 'Delray Beach Open',
    location: 'Delray Beach',
    country: 'USA',
    countryFlag: '🇺🇸',
    dates: { start: '2026-02-16', end: '2026-02-22' },
    surface: 'Hard',
    environment: 'Outdoor',
    draw: { sgl: 28, dbl: 16 },
    prize: '768 735 $',
    contact: '+1 561 330 6000',
    deadline: '2026-02-02',
    status: 'pending',
    links: {
      tickets: 'https://www.yellowtennisball.com',
      registration: 'https://www.atptour.com/en/tournaments/delray-beach'
    }
  },
  {
    id: '6',
    name: 'Open 13 Provence',
    location: 'Marseille',
    country: 'France',
    countryFlag: '🇫🇷',
    dates: { start: '2026-02-16', end: '2026-02-22' },
    surface: 'Hard',
    environment: 'Indoor',
    draw: { sgl: 28, dbl: 16 },
    prize: '768 735 €',
    contact: '+33 4 91 14 91 14',
    deadline: '2026-02-09',
    status: 'pending',
    links: {
      tickets: 'https://www.open13provence.com',
      registration: 'https://www.atptour.com/en/tournaments/marseille'
    }
  },
  {
    id: '7',
    name: 'Rio Open',
    location: 'Rio de Janeiro',
    country: 'Brésil',
    countryFlag: '🇧🇷',
    dates: { start: '2026-02-16', end: '2026-02-22' },
    surface: 'Clay',
    environment: 'Outdoor',
    draw: { sgl: 32, dbl: 16 },
    prize: '1 235 475 $',
    contact: '+55 21 2220 1234',
    deadline: '2026-02-09',
    status: 'pending',
    links: {
      tickets: 'https://www.rioopen.com',
      registration: 'https://www.atptour.com/en/tournaments/rio-de-janeiro'
    }
  },
  {
    id: '8',
    name: 'Dubai Tennis Championships',
    location: 'Dubai',
    country: 'EAU',
    countryFlag: '🇦🇪',
    dates: { start: '2026-02-23', end: '2026-03-01' },
    surface: 'Hard',
    environment: 'Outdoor',
    draw: { sgl: 32, dbl: 16 },
    prize: '2 891 895 $',
    contact: '+971 4 417 2222',
    deadline: '2026-02-16',
    status: 'pending',
    links: {
      tickets: 'https://www.dubaidutyfreetennischampionships.com',
      registration: 'https://www.atptour.com/en/tournaments/dubai'
    }
  }
];

export const getSurfaceColor = (surface: string): string => {
  switch (surface) {
    case 'Clay': return '#E2725B';
    case 'Hard': return '#2C5DA3';
    case 'Grass': return '#4CAF50';
    case 'Carpet': return '#757575';
    default: return '#757575';
  }
};

export const getSurfaceIcon = (surface: string): string => {
  switch (surface) {
    case 'Clay': return '🟠';
    case 'Hard': return '🔵';
    case 'Grass': return '🟢';
    case 'Carpet': return '⚫';
    default: return '⚪';
  }
};

export const getEnvironmentIcon = (env: string): string => {
  return env === 'Indoor' ? '🏠' : '☀️';
};
