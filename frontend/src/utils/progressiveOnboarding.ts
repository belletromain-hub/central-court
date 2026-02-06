import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'user_preferences';
const ONBOARDING_STATUS_KEY = 'progressive_onboarding_status';

// Types
export type ModuleId = 'voyage' | 'hotel' | 'food';
export type ModuleStatus = 'pending' | 'shown' | 'skipped' | 'completed' | 'dismissed';

export interface VoyagePreferences {
  travelClass: 'economy' | 'premium' | 'business' | 'first' | null;
  airlines: string[];
}

export interface HotelPreferences {
  amenities: string[];
}

export interface FoodPreferences {
  cuisines: string[];
  restrictions: string[];
}

export interface UserPreferences {
  voyage?: VoyagePreferences;
  hotel?: HotelPreferences;
  food?: FoodPreferences;
}

export interface OnboardingStatus {
  voyage: {
    status: ModuleStatus;
    completedAt?: string;
    reminderCount: number;
  };
  hotel: {
    status: ModuleStatus;
    completedAt?: string;
    reminderCount: number;
  };
  food: {
    status: ModuleStatus;
    completedAt?: string;
    reminderCount: number;
  };
  installDate: string;
}

// Default status
const getDefaultStatus = (): OnboardingStatus => ({
  voyage: { status: 'pending', reminderCount: 0 },
  hotel: { status: 'pending', reminderCount: 0 },
  food: { status: 'pending', reminderCount: 0 },
  installDate: new Date().toISOString(),
});

// Get onboarding status
export const getOnboardingStatus = async (): Promise<OnboardingStatus> => {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_STATUS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Initialize if not exists
    const defaultStatus = getDefaultStatus();
    await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, JSON.stringify(defaultStatus));
    return defaultStatus;
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return getDefaultStatus();
  }
};

// Update module status
export const updateModuleStatus = async (
  moduleId: ModuleId, 
  status: ModuleStatus
): Promise<void> => {
  try {
    const current = await getOnboardingStatus();
    current[moduleId].status = status;
    if (status === 'completed') {
      current[moduleId].completedAt = new Date().toISOString();
    }
    await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, JSON.stringify(current));
  } catch (error) {
    console.error('Error updating module status:', error);
  }
};

// Increment reminder count
export const incrementReminderCount = async (moduleId: ModuleId): Promise<number> => {
  try {
    const current = await getOnboardingStatus();
    current[moduleId].reminderCount += 1;
    await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, JSON.stringify(current));
    return current[moduleId].reminderCount;
  } catch (error) {
    console.error('Error incrementing reminder:', error);
    return 0;
  }
};

// Get user preferences
export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const data = await AsyncStorage.getItem(PREFS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting preferences:', error);
    return {};
  }
};

// Save module preferences
export const saveModulePreferences = async <K extends keyof UserPreferences>(
  moduleId: K,
  preferences: UserPreferences[K]
): Promise<void> => {
  try {
    const current = await getUserPreferences();
    current[moduleId] = preferences;
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(current));
    await updateModuleStatus(moduleId as ModuleId, 'completed');
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

// Check if should show module
export const shouldShowModule = async (moduleId: ModuleId): Promise<boolean> => {
  try {
    const status = await getOnboardingStatus();
    const moduleStatus = status[moduleId];
    
    // Don't show if completed or dismissed
    if (moduleStatus.status === 'completed' || moduleStatus.status === 'dismissed') {
      return false;
    }
    
    // Check max reminders (3)
    if (moduleStatus.reminderCount >= 3) {
      return false;
    }
    
    // Calculate days since install
    const installDate = new Date(status.installDate);
    const now = new Date();
    const daysSinceInstall = Math.floor((now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (moduleId) {
      case 'voyage':
        // Show after 3 days or when viewing international tournament
        return daysSinceInstall >= 3 || moduleStatus.status === 'shown';
      
      case 'hotel':
        // Show 2 days after voyage completed or 5 days after install
        if (status.voyage.status === 'completed' && status.voyage.completedAt) {
          const voyageDate = new Date(status.voyage.completedAt);
          const daysSinceVoyage = Math.floor((now.getTime() - voyageDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceVoyage >= 2;
        }
        return daysSinceInstall >= 5;
      
      case 'food':
        // Show after hotel completed or 7 days after install
        if (status.hotel.status === 'completed') {
          return true;
        }
        return daysSinceInstall >= 7;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking module:', error);
    return false;
  }
};

// Airlines data
export const AIRLINES = [
  // Premium 5-étoiles
  { id: 'qr', name: 'Qatar Airways', flag: '🇶🇦', category: 'premium' },
  { id: 'ek', name: 'Emirates', flag: '🇦🇪', category: 'premium' },
  { id: 'sq', name: 'Singapore Airlines', flag: '🇸🇬', category: 'premium' },
  { id: 'ey', name: 'Etihad Airways', flag: '🇦🇪', category: 'premium' },
  // Europe
  { id: 'af', name: 'Air France', flag: '🇫🇷', category: 'europe' },
  { id: 'ba', name: 'British Airways', flag: '🇬🇧', category: 'europe' },
  { id: 'lh', name: 'Lufthansa', flag: '🇩🇪', category: 'europe' },
  { id: 'lx', name: 'Swiss International', flag: '🇨🇭', category: 'europe' },
  { id: 'os', name: 'Austrian Airlines', flag: '🇦🇹', category: 'europe' },
  { id: 'kl', name: 'KLM', flag: '🇳🇱', category: 'europe' },
  { id: 'sn', name: 'Brussels Airlines', flag: '🇧🇪', category: 'europe' },
  { id: 'ib', name: 'Iberia', flag: '🇪🇸', category: 'europe' },
  // Americas
  { id: 'ac', name: 'Air Canada', flag: '🇨🇦', category: 'americas' },
  { id: 'dl', name: 'Delta Airlines', flag: '🇺🇸', category: 'americas' },
  { id: 'aa', name: 'American Airlines', flag: '🇺🇸', category: 'americas' },
  { id: 'ua', name: 'United Airlines', flag: '🇺🇸', category: 'americas' },
  // Asia-Pacific
  { id: 'nh', name: 'ANA', flag: '🇯🇵', category: 'asia' },
  { id: 'jl', name: 'Japan Airlines', flag: '🇯🇵', category: 'asia' },
  { id: 'qf', name: 'Qantas', flag: '🇦🇺', category: 'asia' },
  // Other
  { id: 'tk', name: 'Turkish Airlines', flag: '🇹🇷', category: 'other' },
];

// Hotel amenities
export const HOTEL_AMENITIES = [
  { id: 'gym', emoji: '🏋️', label: 'Salle de sport' },
  { id: 'wifi', emoji: '📶', label: 'Wifi performant' },
  { id: 'pool', emoji: '🏊', label: 'Piscine' },
  { id: 'spa', emoji: '💆', label: 'Spa / Massage' },
  { id: 'tennis', emoji: '🎾', label: 'Courts de tennis' },
  { id: 'restaurant', emoji: '🍽️', label: 'Restaurant sur place' },
  { id: 'parking', emoji: '🚗', label: 'Parking gratuit' },
  { id: 'shuttle', emoji: '🧳', label: 'Navette aéroport' },
];

// Cuisines
export const CUISINES = [
  { id: 'healthy', emoji: '🥗', label: 'Healthy / Bio' },
  { id: 'mediterranean', emoji: '🍝', label: 'Méditerranéenne' },
  { id: 'asian', emoji: '🍣', label: 'Asiatique' },
  { id: 'grilled', emoji: '🥩', label: 'Grillades / Viandes' },
  { id: 'mexican', emoji: '🌮', label: 'Mexicaine / Tex-Mex' },
  { id: 'french', emoji: '🥖', label: 'Française' },
  { id: 'fastcasual', emoji: '🍕', label: 'Fast-Casual' },
  { id: 'vegetarian', emoji: '🌱', label: 'Végétarienne / Vegan' },
];

// Restrictions
export const RESTRICTIONS = [
  { id: 'gluten_free', emoji: '🌾', label: 'Sans gluten' },
  { id: 'lactose_free', emoji: '🥛', label: 'Sans lactose' },
  { id: 'vegetarian', emoji: '🌱', label: 'Végétarien' },
  { id: 'vegan', emoji: '🥕', label: 'Vegan' },
  { id: 'nuts_allergy', emoji: '🥜', label: 'Allergies noix' },
  { id: 'seafood_allergy', emoji: '🐚', label: 'Allergies fruits de mer' },
  { id: 'halal', emoji: '🕌', label: 'Halal' },
  { id: 'kosher', emoji: '✡️', label: 'Casher' },
];

// Travel classes
export const TRAVEL_CLASSES = [
  { id: 'economy', emoji: '💺', label: 'Économie', description: 'Budget-friendly' },
  { id: 'premium', emoji: '🎫', label: 'Économie Premium', description: 'Plus de confort' },
  { id: 'business', emoji: '✨', label: 'Business', description: 'Services premium' },
  { id: 'first', emoji: '👑', label: 'Première Classe', description: 'Luxe absolu' },
];
