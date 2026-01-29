// Location service with mocked data for distance calculation
import { Platform, Linking } from 'react-native';

export interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distance: string;
  duration: string;
  durationMinutes: number;
}

// Mock popular tennis locations
export const popularLocations: Location[] = [
  { name: 'CNE - Centre National d\'Entraînement', address: 'Rue Henri Cochet, 75016 Paris', lat: 48.8461, lng: 2.2495 },
  { name: 'Roland Garros', address: '2 Av. Gordon Bennett, 75016 Paris', lat: 48.8469, lng: 2.2492 },
  { name: 'Arena Montpellier', address: 'Avenue de la Pompignane, 34000 Montpellier', lat: 43.6167, lng: 3.9096 },
  { name: 'Mouratoglou Academy', address: 'Route des Dolines, 06560 Sophia Antipolis', lat: 43.6218, lng: 7.0521 },
  { name: 'ATP Training Center Dubai', address: 'Dubai Sports City', lat: 25.0379, lng: 55.2207 },
  { name: 'Monte Carlo Country Club', address: 'Monaco', lat: 43.7514, lng: 7.4393 },
  { name: 'USTA Billie Jean King Center', address: 'Flushing Meadows, NY', lat: 40.7500, lng: -73.8467 },
];

// Mock hotel locations for housing
export const hotelLocations: Location[] = [
  { name: 'Hilton Rotterdam', address: 'Weena 10, 3012 CM Rotterdam', lat: 51.9244, lng: 4.4777 },
  { name: 'Marriott Montpellier', address: 'Place de la Comédie, 34000 Montpellier', lat: 43.6086, lng: 3.8796 },
  { name: 'Burj Al Arab Dubai', address: 'Jumeirah Street, Dubai', lat: 25.1412, lng: 55.1853 },
  { name: 'Hôtel de Paris Monaco', address: 'Place du Casino, Monaco', lat: 43.7393, lng: 7.4272 },
];

// Calculate distance between two points (Haversine formula)
const calculateHaversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Mock distance calculation
export const getDistance = async (
  origin: Location,
  destination: Location
): Promise<DistanceResult> => {
  // Calculate straight-line distance
  const distanceKm = calculateHaversineDistance(
    origin.lat, origin.lng,
    destination.lat, destination.lng
  );
  
  // Estimate travel time (average 40km/h in city, 80km/h for longer distances)
  const averageSpeed = distanceKm > 50 ? 80 : 40;
  const durationMinutes = Math.round((distanceKm / averageSpeed) * 60);
  
  // Format results
  let distanceStr: string;
  if (distanceKm < 1) {
    distanceStr = `${Math.round(distanceKm * 1000)} m`;
  } else {
    distanceStr = `${distanceKm.toFixed(1)} km`;
  }
  
  let durationStr: string;
  if (durationMinutes < 60) {
    durationStr = `${durationMinutes} min`;
  } else {
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    durationStr = `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }
  
  return {
    distance: distanceStr,
    duration: durationStr,
    durationMinutes,
  };
};

// Open location in external maps app
export const openInMaps = (location: string | Location): void => {
  let query: string;
  
  if (typeof location === 'string') {
    query = encodeURIComponent(location);
  } else {
    query = `${location.lat},${location.lng}`;
  }
  
  const url = Platform.select({
    ios: `maps:0,0?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}`,
  });
  
  Linking.openURL(url).catch(() => {
    // Fallback to Google Maps web
    const webUrl = typeof location === 'string'
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
      : `https://www.google.com/maps/@${location.lat},${location.lng},15z`;
    Linking.openURL(webUrl);
  });
};

// Search locations (mock implementation)
export const searchLocations = async (query: string): Promise<Location[]> => {
  const normalizedQuery = query.toLowerCase();
  
  // Search in popular locations
  const results = [...popularLocations, ...hotelLocations].filter(
    loc => 
      loc.name.toLowerCase().includes(normalizedQuery) ||
      loc.address.toLowerCase().includes(normalizedQuery)
  );
  
  // If no results, return a mock result based on query
  if (results.length === 0 && query.length > 2) {
    return [{
      name: query,
      address: `${query} (adresse à préciser)`,
      lat: 48.8566, // Default to Paris
      lng: 2.3522,
    }];
  }
  
  return results.slice(0, 5);
};

export default {
  getDistance,
  openInMaps,
  searchLocations,
  popularLocations,
  hotelLocations,
};
