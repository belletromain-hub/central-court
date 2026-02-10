import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Document, CountryDays, Channel, Message, Recommendation, TeamType } from '../types';

// Simplified App State - tournaments and events now come from API
interface AppState {
  documents: Document[];
  taxHistory: CountryDays[];
  channels: Channel[];
  messages: Message[];
  recommendations: Recommendation[];
  currentYear: number;
}

interface AppContextType extends AppState {
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
    name: 'Agent',
    icon: 'briefcase',
    color: '#1976d2',
    lastMessage: 'J\'ai confirmé Rotterdam, on en parle ?',
    lastMessageTime: '10:30',
    unreadCount: 1,
    members: ['Marie Leblanc']
  },
  {
    id: 'medical',
    type: 'medical',
    name: 'Staff Médical',
    icon: 'medkit',
    color: '#e53935',
    lastMessage: 'RDV kiné demain 9h',
    lastMessageTime: '09:15',
    unreadCount: 1,
    members: ['Dr Martin', 'Thomas (Kiné)']
  },
  {
    id: 'technical',
    type: 'technical',
    name: 'Staff Technique',
    icon: 'tennisball',
    color: '#43A047',
    lastMessage: 'Super session ce matin !',
    lastMessageTime: 'Hier',
    unreadCount: 0,
    members: ['Coach Durand', 'Prépa physique Marc']
  },
];

const initialMessages: Message[] = [
  {
    id: 'm1',
    channelId: 'agent',
    senderId: 'marie',
    senderName: 'Marie Leblanc',
    senderRole: 'Agent',
    content: 'J\'ai confirmé Rotterdam, on en parle ?',
    timestamp: '2026-02-01T10:30:00',
    read: false
  },
  {
    id: 'm2',
    channelId: 'medical',
    senderId: 'thomas',
    senderName: 'Thomas',
    senderRole: 'Kiné',
    content: 'RDV kiné confirmé pour demain 9h.',
    timestamp: '2026-02-01T09:15:00',
    read: false
  },
];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [taxHistory, setTaxHistoryState] = useState<CountryDays[]>(initialTaxHistory);
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const currentYear = new Date().getFullYear();

  // Generate recommendations based on data
  const recommendations: Recommendation[] = React.useMemo(() => {
    const recs: Recommendation[] = [];
    
    const franceDays = taxHistory.find(c => c.countryCode === 'FR')?.days || 0;
    
    if (franceDays > 30) {
      recs.push({
        id: 'rec-fiscal',
        type: 'fiscal',
        title: 'Optimisation fiscale',
        description: `Attention: ${franceDays} jours en France. Pensez à planifier vos séjours hors France.`,
        priority: 'high',
        icon: 'trending-up',
        color: '#ff9800'
      });
    }
    
    return recs;
  }, [taxHistory]);

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedDocs, savedTax] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
          AsyncStorage.getItem(STORAGE_KEYS.TAX_HISTORY),
        ]);
        
        if (savedDocs) setDocuments(JSON.parse(savedDocs));
        if (savedTax) setTaxHistoryState(JSON.parse(savedTax));
      } catch (error) {
        console.error('Error loading app data:', error);
      }
    };
    loadData();
  }, []);

  // Document functions
  const addDocument = async (doc: Document) => {
    const newDocs = [...documents, doc];
    setDocuments(newDocs);
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(newDocs));
  };

  const deleteDocument = async (id: string) => {
    const newDocs = documents.filter(d => d.id !== id);
    setDocuments(newDocs);
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(newDocs));
  };

  const updateDocumentSharing = async (id: string, sharedWith: TeamType[]) => {
    const newDocs = documents.map(d => 
      d.id === id ? { ...d, sharedWith } : d
    );
    setDocuments(newDocs);
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(newDocs));
  };

  // Tax functions
  const updateCountryDays = async (countryCode: string, days: number) => {
    const newHistory = taxHistory.map(c => 
      c.countryCode === countryCode ? { ...c, days } : c
    );
    setTaxHistoryState(newHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.TAX_HISTORY, JSON.stringify(newHistory));
  };

  const addCountry = async (country: CountryDays) => {
    const newHistory = [...taxHistory, country];
    setTaxHistoryState(newHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.TAX_HISTORY, JSON.stringify(newHistory));
  };

  const setTaxHistory = async (history: CountryDays[]) => {
    setTaxHistoryState(history);
    await AsyncStorage.setItem(STORAGE_KEYS.TAX_HISTORY, JSON.stringify(history));
  };

  // Message functions
  const sendMessage = (channelId: string, content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      channelId,
      senderId: 'user',
      senderName: 'Vous',
      senderRole: 'Joueur',
      content,
      timestamp: new Date().toISOString(),
      read: true,
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Update channel last message
    setChannels(prev => prev.map(c => 
      c.id === channelId 
        ? { ...c, lastMessage: content, lastMessageTime: 'À l\'instant' }
        : c
    ));
  };

  const markChannelAsRead = (channelId: string) => {
    setChannels(prev => prev.map(c => 
      c.id === channelId ? { ...c, unreadCount: 0 } : c
    ));
    setMessages(prev => prev.map(m => 
      m.channelId === channelId ? { ...m, read: true } : m
    ));
  };

  const value: AppContextType = {
    documents,
    taxHistory,
    channels,
    messages,
    recommendations,
    currentYear,
    addDocument,
    deleteDocument,
    updateDocumentSharing,
    updateCountryDays,
    addCountry,
    setTaxHistory,
    sendMessage,
    markChannelAsRead,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
