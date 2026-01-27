import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tournament, tournaments as initialTournaments } from '../data/tournaments';
import { CalendarEvent, sampleEvents } from '../data/events';
import { Document, CountryDays } from '../types';

interface AppState {
  tournaments: Tournament[];
  events: CalendarEvent[];
  documents: Document[];
  taxHistory: CountryDays[];
  currentYear: number;
}

interface AppContextType extends AppState {
  updateTournamentStatus: (id: string, status: 'pending' | 'confirmed' | 'withdrawn') => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  updateCountryDays: (countryCode: string, days: number) => void;
  addCountry: (country: CountryDays) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOURNAMENTS: '@central_court_tournaments',
  EVENTS: '@central_court_events',
  DOCUMENTS: '@central_court_documents',
  TAX_HISTORY: '@central_court_tax_history',
};

const initialTaxHistory: CountryDays[] = [
  { country: 'France', countryCode: 'FR', flag: '🇫🇷', days: 45, limit: 183 },
  { country: 'Espagne', countryCode: 'ES', flag: '🇪🇸', days: 22, limit: 183 },
  { country: 'États-Unis', countryCode: 'US', flag: '🇺🇸', days: 18, limit: 183 },
  { country: 'Australie', countryCode: 'AU', flag: '🇦🇺', days: 14, limit: 183 },
  { country: 'Émirats Arabes Unis', countryCode: 'AE', flag: '🇦🇪', days: 8, limit: 183 },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments);
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [taxHistory, setTaxHistory] = useState<CountryDays[]>(initialTaxHistory);
  const currentYear = new Date().getFullYear();

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data when it changes
  useEffect(() => {
    saveData();
  }, [tournaments, events, documents, taxHistory]);

  const loadData = async () => {
    try {
      const [storedTournaments, storedEvents, storedDocs, storedTax] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOURNAMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.EVENTS),
        AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.TAX_HISTORY),
      ]);

      if (storedTournaments) setTournaments(JSON.parse(storedTournaments));
      if (storedEvents) setEvents(JSON.parse(storedEvents));
      if (storedDocs) setDocuments(JSON.parse(storedDocs));
      if (storedTax) setTaxHistory(JSON.parse(storedTax));
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

  const updateCountryDays = (countryCode: string, days: number) => {
    setTaxHistory(prev =>
      prev.map(c => (c.countryCode === countryCode ? { ...c, days } : c))
    );
  };

  const addCountry = (country: CountryDays) => {
    setTaxHistory(prev => [...prev, country]);
  };

  return (
    <AppContext.Provider
      value={{
        tournaments,
        events,
        documents,
        taxHistory,
        currentYear,
        updateTournamentStatus,
        addEvent,
        updateEvent,
        deleteEvent,
        addDocument,
        deleteDocument,
        updateCountryDays,
        addCountry,
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
