// Country code mapping and flag emoji utilities for tournaments

export const COUNTRY_CODES: Record<string, string> = {
  // Grand Slams
  'Australia': 'AU',
  'France': 'FR',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'Great Britain': 'GB',
  'USA': 'US',
  'United States': 'US',

  // Europe
  'Austria': 'AT',
  'Belgium': 'BE',
  'Croatia': 'HR',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Germany': 'DE',
  'Greece': 'GR',
  'Hungary': 'HU',
  'Ireland': 'IE',
  'Italy': 'IT',
  'Luxembourg': 'LU',
  'Monaco': 'MC',
  'Netherlands': 'NL',
  'Norway': 'NO',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Romania': 'RO',
  'Russia': 'RU',
  'Serbia': 'RS',
  'Slovakia': 'SK',
  'Spain': 'ES',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Turkey': 'TR',
  'Turkiye': 'TR',

  // Americas
  'Argentina': 'AR',
  'Brazil': 'BR',
  'Canada': 'CA',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Ecuador': 'EC',
  'Mexico': 'MX',
  'Peru': 'PE',
  'Uruguay': 'UY',

  // Asia-Pacific
  'China': 'CN',
  'Hong Kong': 'HK',
  'India': 'IN',
  'Indonesia': 'ID',
  'Japan': 'JP',
  'Kazakhstan': 'KZ',
  'Malaysia': 'MY',
  'New Zealand': 'NZ',
  'Philippines': 'PH',
  'Singapore': 'SG',
  'South Korea': 'KR',
  'Korea': 'KR',
  'Korea, Rep.': 'KR',
  'Taiwan': 'TW',
  'Thailand': 'TH',
  'Sri Lanka': 'LK',
  'Uzbekistan': 'UZ',
  'Vietnam': 'VN',

  // Middle East & Africa
  'Bahrain': 'BH',
  'Egypt': 'EG',
  'Israel': 'IL',
  'Morocco': 'MA',
  'Qatar': 'QA',
  'Saudi Arabia': 'SA',
  'South Africa': 'ZA',
  'Tunisia': 'TN',
  'United Arab Emirates': 'AE',
  'UAE': 'AE',
};

export const getCountryCode = (countryName: string): string => {
  return COUNTRY_CODES[countryName] || 'XX';
};

export const getFlagEmoji = (countryName: string): string => {
  let code = COUNTRY_CODES[countryName];
  if (!code) return '';
  if (code === 'UK') code = 'GB';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};
