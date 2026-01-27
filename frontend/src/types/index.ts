// Types globaux pour Central Court

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'player' | 'agent' | 'physio' | 'coach';
  avatar?: string;
}

export interface Document {
  id: string;
  category: 'identity' | 'contracts' | 'invoices' | 'medical';
  name: string;
  fileType: 'pdf' | 'image' | 'other';
  fileUri?: string;
  uploadedAt: string;
  expiryDate?: string;
  notes?: string;
}

export interface CountryDays {
  country: string;
  countryCode: string;
  flag: string;
  days: number;
  limit: number;
  lastEntry?: string;
}

export interface TaxHistory {
  year: number;
  countries: CountryDays[];
  lastUpdate: string;
}

export const documentCategories = [
  { id: 'identity', label: 'Documents d\'identité', icon: 'id-card' },
  { id: 'contracts', label: 'Contrats', icon: 'file-contract' },
  { id: 'invoices', label: 'Factures', icon: 'receipt' },
  { id: 'medical', label: 'Médical', icon: 'medkit' }
] as const;
