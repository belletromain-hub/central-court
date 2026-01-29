import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tournament, tournaments as initialTournaments } from '../data/tournaments';
import { CalendarEvent, sampleEvents } from '../data/events';
import { Document, CountryDays, Channel, Message, Recommendation, TeamType } from '../types';

interface AppState {
  tournaments: Tournament[];
  events: CalendarEvent[];
  documents: Document[];
  taxHistory: CountryDays[];
  channels: Channel[];
  messages: Message[];
  recommendations: Recommendation[];
  currentYear: number;
}

interface AppContextType extends AppState {
  updateTournamentStatus: (id: string, status: 'pending' | 'confirmed' | 'withdrawn') => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  updateDocumentSharing: (id: string, sharedWith: TeamType[]) => void;
  updateCountryDays: (countryCode: string, days: number) => void;
  addCountry: (country: CountryDays) => void;
  setTaxHistory: (history: CountryDays[]) => void;
  sendMessage: (channelId: string, content: string) => void;
  markChannelAsRead: (channelId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOURNAMENTS: '@central_court_tournaments',
  EVENTS: '@central_court_events',
  DOCUMENTS: '@central_court_documents',
  TAX_HISTORY: '@central_court_tax_history',
  MESSAGES: '@central_court_messages',
};

const initialTaxHistory: CountryDays[] = [
  { country: 'Monaco', countryCode: 'MC', flag: '🇲🇨', days: 20, limit: 183 },
  { country: 'France', countryCode: 'FR', flag: '🇫🇷', days: 5, limit: 183 },
  { country: 'Australie', countryCode: 'AU', flag: '🇦🇺', days: 3, limit: 183 },
];

const initialChannels: Channel[] = [
  {
    id: 'agent',
    type: 'agent',
    name: 'Marie Leblanc',
    icon: 'briefcase',
    color: '#1da1f2',
    lastMessage: 'J\'ai confirmé Rotterdam, on en parle ?',
    lastMessageTime: '10:30',
    unreadCount: 2,
    members: ['Marie Leblanc']
  },
  {
    id: 'medical',
    type: 'medical',
    name: 'Staff Médical',
    icon: 'medkit',
    color: '#e0245e',
    lastMessage: 'RDV kiné confirmé pour demain 9h',
    lastMessageTime: '09:15',
    unreadCount: 1,
    members: ['Dr. Martin', 'Thomas (Kiné)', 'Dr. Lefebvre']
  },
  {
    id: 'technical',
    type: 'technical',
    name: 'Staff Technique',
    icon: 'fitness',
    color: '#4CAF50',
    lastMessage: 'Super session ce matin ! 💪',
    lastMessageTime: 'Hier',
    unreadCount: 0,
    members: ['Coach Durand', 'Prépa physique Marc']
  },
  {
    id: 'logistics',
    type: 'logistics',
    name: 'Logistique',
    icon: 'airplane',
    color: '#ff9800',
    lastMessage: 'Billets Rotterdam envoyés par email',
    lastMessageTime: 'Hier',
    unreadCount: 0,
    members: ['Sophie (Travel)', 'Hôtels & Transport']
  },
  {
    id: 'all',
    type: 'all',
    name: 'Équipe complète',
    icon: 'people',
    color: '#9c27b0',
    lastMessage: 'Briefing pré-saison ce vendredi 14h',
    lastMessageTime: 'Lun',
    unreadCount: 0,
    members: ['Toute l\'équipe']
  },
];

const initialMessages: Message[] = [
  {
    id: 'm1',
    channelId: 'agent',
    senderId: 'marie',
    senderName: 'Marie Leblanc',
    senderRole: 'Agent',
    content: 'Salut ! J\'ai eu Rotterdam au téléphone, ils sont très contents de t\'avoir.',
    timestamp: '2026-02-01T09:30:00',
    read: true
  },
  {
    id: 'm2',
    channelId: 'agent',
    senderId: 'marie',
    senderName: 'Marie Leblanc',
    senderRole: 'Agent',
    content: 'J\'ai confirmé Rotterdam, on en parle ?',
    timestamp: '2026-02-01T10:30:00',
    read: false
  },
  {
    id: 'm3',
    channelId: 'medical',
    senderId: 'thomas',
    senderName: 'Thomas',
    senderRole: 'Kiné',
    content: 'RDV kiné confirmé pour demain 9h. On travaillera sur l\'épaule.',
    timestamp: '2026-02-01T09:15:00',
    read: false
  },
  {
    id: 'm4',
    channelId: 'technical',
    senderId: 'coach',
    senderName: 'Coach Durand',
    senderRole: 'Coach',
    content: 'Super session ce matin ! Le service était précis. 💪',
    timestamp: '2026-01-31T12:00:00',
    read: true
  },
  {
    id: 'm5',
    channelId: 'logistics',
    senderId: 'sophie',
    senderName: 'Sophie',
    senderRole: 'Travel Manager',
    content: 'Billets Rotterdam envoyés par email. Hôtel Hilton confirmé.',
    timestamp: '2026-01-31T14:00:00',
    read: true
  },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments);
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [taxHistory, setTaxHistory] = useState<CountryDays[]>(initialTaxHistory);
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const currentYear = new Date().getFullYear();

  // Generate smart recommendations based on data
  const recommendations: Recommendation[] = React.useMemo(() => {
    const recs: Recommendation[] = [];
    
    // Fiscal recommendation - Dubai
    const dubaiDays = taxHistory.find(c => c.countryCode === 'AE')?.days || 0;
    const franceDays = taxHistory.find(c => c.countryCode === 'FR')?.days || 0;
    
    // Check for tournament gaps
    const confirmedTournaments = tournaments.filter(t => t.status === 'confirmed');
    const nextTournamentDate = confirmedTournaments.length > 0 
      ? new Date(confirmedTournaments[0].dates.start)
      : null;
    
    // Dubai fiscal optimization recommendation
    if (dubaiDays < 90 && franceDays > 30) {
      recs.push({
        id: 'rec-dubai',
        type: 'fiscal',
        title: 'Optimisation fiscale Dubai',
        description: `Vous n'avez que ${dubaiDays} jours à Dubai cette année. Un séjour prolongé (3+ semaines) entre les tournois vous rapprocherait des 183 jours pour la résidence fiscale aux EAU - 0% d'impôt sur les gains.`,
        action: 'dubai',
        actionLabel: 'Voir les options',
        priority: 'high',
        icon: 'trending-up',
        color: '#ff9800'
      });
    }
    
    // Training recommendation if gap in schedule
    recs.push({
      id: 'rec-training',
      type: 'training',
      title: 'Bloc entraînement terre battue',
      description: 'Période idéale pour un stage intensif à Barcelone ou Monaco avant la saison sur terre.',
      priority: 'medium',
      icon: 'fitness',
      color: '#4CAF50'
    });
    
    // Health check reminder
    const medicalEvents = events.filter(e => e.type === 'medical');
    if (medicalEvents.length < 3) {
      recs.push({
        id: 'rec-health',
        type: 'health',
        title: 'Bilan médical recommandé',
        description: 'Pensez à planifier un check-up complet avant la saison intensive.',
        priority: 'medium',
        icon: 'heart',
        color: '#e0245e'
      });
    }
    
    return recs;
  }, [taxHistory, tournaments, events]);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data when it changes
  useEffect(() => {
    saveData();
  }, [tournaments, events, documents, taxHistory, messages]);

  const loadData = async () => {
    try {
      const [storedTournaments, storedEvents, storedDocs, storedTax, storedMessages] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOURNAMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.EVENTS),
        AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.TAX_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.MESSAGES),
      ]);

      if (storedTournaments) setTournaments(JSON.parse(storedTournaments));
      if (storedEvents) setEvents(JSON.parse(storedEvents));
      if (storedDocs) setDocuments(JSON.parse(storedDocs));
      if (storedTax) setTaxHistory(JSON.parse(storedTax));
      if (storedMessages) setMessages(JSON.parse(storedMessages));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(tournaments)),
        AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events)),
        AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents)),
        AsyncStorage.setItem(STORAGE_KEYS.TAX_HISTORY, JSON.stringify(taxHistory)),
        AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages)),
      ]);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const updateTournamentStatus = (id: string, status: 'pending' | 'confirmed' | 'withdrawn') => {
    setTournaments(prev =>
      prev.map(t => (t.id === id ? { ...t, status } : t))
    );
  };

  const addEvent = (event: CalendarEvent) => {
    setEvents(prev => [...prev, event]);
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev =>
      prev.map(e => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const addDocument = (doc: Document) => {
    setDocuments(prev => [...prev, doc]);
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const updateDocumentSharing = (id: string, sharedWith: TeamType[]) => {
    setDocuments(prev =>
      prev.map(d => (d.id === id ? { ...d, sharedWith } : d))
    );
  };

  const updateCountryDays = (countryCode: string, days: number) => {
    setTaxHistory(prev =>
      prev.map(c => (c.countryCode === countryCode ? { ...c, days } : c))
    );
  };

  const addCountry = (country: CountryDays) => {
    setTaxHistory(prev => [...prev, country]);
  };

  const sendMessage = (channelId: string, content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      channelId,
      senderId: 'player',
      senderName: 'Vous',
      senderRole: 'Joueur',
      content,
      timestamp: new Date().toISOString(),
      read: true
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Update channel last message
    setChannels(prev =>
      prev.map(c => c.id === channelId ? {
        ...c,
        lastMessage: content,
        lastMessageTime: 'À l\'instant'
      } : c)
    );
  };

  const markChannelAsRead = (channelId: string) => {
    setMessages(prev =>
      prev.map(m => m.channelId === channelId ? { ...m, read: true } : m)
    );
    setChannels(prev =>
      prev.map(c => c.id === channelId ? { ...c, unreadCount: 0 } : c)
    );
  };

  return (
    <AppContext.Provider
      value={{
        tournaments,
        events,
        documents,
        taxHistory,
        channels,
        messages,
        recommendations,
        currentYear,
        updateTournamentStatus,
        addEvent,
        updateEvent,
        deleteEvent,
        addDocument,
        deleteDocument,
        updateDocumentSharing,
        updateCountryDays,
        addCountry,
        setTaxHistory,
        sendMessage,
        markChannelAsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
