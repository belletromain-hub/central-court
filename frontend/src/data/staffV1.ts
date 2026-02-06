// Données Staff V1 MVP

export type StaffRole = 
  | 'coach' 
  | 'physical_trainer' 
  | 'physio' 
  | 'nutritionist' 
  | 'mental_coach' 
  | 'agent' 
  | 'manager';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  roleLabel: string;
  email: string;
  phone?: string;
  avatar?: string;
  color: string;
  notificationPrefs: {
    observations: boolean;
    slotSuggestions: boolean;
    tournamentUpdates: boolean;
  };
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  coach: 'Coach',
  physical_trainer: 'Préparateur Physique',
  physio: 'Kiné',
  nutritionist: 'Nutritionniste',
  mental_coach: 'Préparateur Mental',
  agent: 'Agent',
  manager: 'Manager'
};

export const STAFF_ROLE_COLORS: Record<StaffRole, string> = {
  coach: '#1976d2',
  physical_trainer: '#388e3c',
  physio: '#c2185b',
  nutritionist: '#ff9800',
  mental_coach: '#9c27b0',
  agent: '#607d8b',
  manager: '#5d4037'
};

// Staff de démo
export const DEMO_STAFF: StaffMember[] = [
  {
    id: 'staff-001',
    name: 'Patrick Mouratoglou',
    role: 'coach',
    roleLabel: 'Coach Principal',
    email: 'patrick@mouratoglou.com',
    phone: '+33 6 12 34 56 78',
    color: '#1976d2',
    notificationPrefs: {
      observations: true,
      slotSuggestions: true,
      tournamentUpdates: true
    }
  },
  {
    id: 'staff-002',
    name: 'Marc Dupont',
    role: 'physical_trainer',
    roleLabel: 'Préparateur Physique',
    email: 'marc.dupont@training.com',
    phone: '+33 6 23 45 67 89',
    color: '#388e3c',
    notificationPrefs: {
      observations: true,
      slotSuggestions: true,
      tournamentUpdates: false
    }
  },
  {
    id: 'staff-003',
    name: 'Dr. Sophie Laurent',
    role: 'physio',
    roleLabel: 'Kinésithérapeute',
    email: 'sophie.laurent@kine.fr',
    phone: '+33 6 34 56 78 90',
    color: '#c2185b',
    notificationPrefs: {
      observations: true,
      slotSuggestions: true,
      tournamentUpdates: false
    }
  },
  {
    id: 'staff-004',
    name: 'Claire Martin',
    role: 'nutritionist',
    roleLabel: 'Nutritionniste',
    email: 'claire.martin@nutrition.com',
    color: '#ff9800',
    notificationPrefs: {
      observations: true,
      slotSuggestions: false,
      tournamentUpdates: false
    }
  },
  {
    id: 'staff-005',
    name: 'Jean-Pierre Blanc',
    role: 'mental_coach',
    roleLabel: 'Préparateur Mental',
    email: 'jp.blanc@mental.com',
    color: '#9c27b0',
    notificationPrefs: {
      observations: true,
      slotSuggestions: true,
      tournamentUpdates: false
    }
  },
  {
    id: 'staff-006',
    name: 'Thomas Bernard',
    role: 'agent',
    roleLabel: 'Agent',
    email: 'thomas@agence-sport.com',
    phone: '+33 6 45 67 89 01',
    color: '#607d8b',
    notificationPrefs: {
      observations: false,
      slotSuggestions: false,
      tournamentUpdates: true
    }
  }
];

// Fonction utilitaire pour obtenir un staff par ID
export const getStaffById = (id: string): StaffMember | undefined => {
  return DEMO_STAFF.find(s => s.id === id);
};

// Fonction pour obtenir les noms des staff assignés à un événement
export const getAssignedStaffNames = (staffIds: string[]): string[] => {
  return staffIds
    .map(id => getStaffById(id))
    .filter(Boolean)
    .map(s => s!.name);
};
