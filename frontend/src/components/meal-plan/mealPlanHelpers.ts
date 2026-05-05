import { Alert, Platform } from 'react-native';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Platform-safe confirm dialog (Alert.alert can be unreliable on web) */
export function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// Re-export from shared utils so existing imports don't break
export { getWeekDateObjects as getWeekDates } from '../../utils/dateHelpers';

export function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Generate array of dates between start and end inclusive */
export function getDateRange(startStr: string, endStr: string): Date[] {
  const dates: Date[] = [];
  const cur = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export const validateMacro = (value: string, macroName: string): string => {
  if (!value.trim()) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num < 0) return `${macroName} cannot be negative`;
  if (macroName === 'Calories' && num > 5000) return 'Calories seem too high (max 5000)';
  if (macroName !== 'Calories' && num > 500) return `${macroName} seems too high (max 500g)`;
  return '';
};
