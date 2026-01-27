import { format, parseISO, differenceInDays, isBefore, isAfter, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'd MMM yyyy', { locale: fr });
  } catch {
    return dateString;
  }
};

export const formatDateShort = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'd MMM', { locale: fr });
  } catch {
    return dateString;
  }
};

export const formatDateRange = (start: string, end: string): string => {
  try {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    return `${format(startDate, 'd', { locale: fr })} - ${format(endDate, 'd MMM yyyy', { locale: fr })}`;
  } catch {
    return `${start} - ${end}`;
  }
};

export const formatTime = (time: string): string => {
  return time;
};

export const getDaysUntil = (dateString: string): number => {
  try {
    const targetDate = parseISO(dateString);
    const today = new Date();
    return differenceInDays(targetDate, today);
  } catch {
    return 0;
  }
};

export const isDeadlineSoon = (deadline: string, hoursThreshold: number = 48): boolean => {
  const daysUntil = getDaysUntil(deadline);
  return daysUntil >= 0 && daysUntil <= (hoursThreshold / 24);
};

export const isExpired = (dateString: string): boolean => {
  try {
    return isBefore(parseISO(dateString), new Date());
  } catch {
    return false;
  }
};

export const isDateToday = (dateString: string): boolean => {
  try {
    return isToday(parseISO(dateString));
  } catch {
    return false;
  }
};

export const getMonthYear = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'MMMM yyyy', { locale: fr });
  } catch {
    return dateString;
  }
};

export const getWeekDay = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'EEEE', { locale: fr });
  } catch {
    return '';
  }
};
