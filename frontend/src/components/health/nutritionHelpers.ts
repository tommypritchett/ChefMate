export const PRIMARY_GOALS = [
  { key: 'high-protein', label: 'High Protein', icon: 'barbell', color: '#3b82f6', description: 'Prioritize protein-rich foods & recipes' },
  { key: 'low-carb', label: 'Low Carb', icon: 'trending-down-outline', color: '#f97316', description: 'Reduce carbohydrates, favor low-carb options' },
  { key: 'keto', label: 'Keto', icon: 'flash-outline', color: '#8b5cf6', description: 'High fat, very low carb ketogenic diet' },
  { key: 'vegetarian', label: 'Vegetarian', icon: 'leaf', color: '#D4652E', description: 'No meat, plant-based with dairy & eggs' },
  { key: 'vegan', label: 'Vegan', icon: 'leaf', color: '#B8521F', description: 'Fully plant-based, no animal products' },
  { key: 'gluten-free', label: 'Gluten Free', icon: 'ban-outline', color: '#ec4899', description: 'Avoid wheat, barley, rye' },
  { key: 'dairy-free', label: 'Dairy Free', icon: 'ban-outline', color: '#06b6d4', description: 'No milk, cheese, butter, cream' },
];

export const TRACKING_GOALS = [
  { key: 'calories', label: 'Daily Calories', unit: 'kcal', icon: 'flame-outline', color: '#f59e0b', placeholder: 'e.g. 2000' },
  { key: 'protein', label: 'Daily Protein', unit: 'g', icon: 'barbell-outline', color: '#3b82f6', placeholder: 'e.g. 150' },
  { key: 'carbs', label: 'Daily Carbs', unit: 'g', icon: 'leaf-outline', color: '#f97316', placeholder: 'e.g. 200' },
  { key: 'fat', label: 'Daily Fat', unit: 'g', icon: 'water-outline', color: '#ef4444', placeholder: 'e.g. 65' },
  { key: 'weight', label: 'Target Weight', unit: 'lbs', icon: 'scale-outline', color: '#8b5cf6', placeholder: 'e.g. 160' },
];

export const ALL_GOAL_DEFS = [
  ...PRIMARY_GOALS.map(g => ({ ...g, hasTarget: false, unit: '' })),
  ...TRACKING_GOALS.map(g => ({ ...g, hasTarget: true })),
];

export const MAX_PRIMARY_GOALS = 2;
export const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Re-export from shared constants so existing imports don't break
export { CARD_SHADOW } from '../../constants/styles';

// Re-export from shared utils so existing imports don't break
export { getWeekDateStrings as getWeekDates } from '../../utils/dateHelpers';

export function getMonthGrid(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows: (string | null)[][] = [];
  let row: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) row.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const str = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    row.push(str);
    if (row.length === 7) { rows.push(row); row = []; }
  }
  if (row.length > 0) { while (row.length < 7) row.push(null); rows.push(row); }
  return rows;
}

export function getMotivation(percent: number, goalReached: boolean) {
  if (goalReached) return { text: 'Goal reached! Amazing work!', color: '#D4652E', icon: 'trophy' as const };
  if (percent >= 90) return { text: "Almost there! You're so close!", color: '#D4652E', icon: 'checkmark-circle' as const };
  if (percent >= 75) return { text: 'Incredible progress! The finish line is near!', color: '#3b82f6', icon: 'rocket' as const };
  if (percent >= 50) return { text: 'Over halfway! Keep the momentum going!', color: '#3b82f6', icon: 'trending-up' as const };
  if (percent >= 25) return { text: "Great start — you're building real momentum!", color: '#f59e0b', icon: 'flash' as const };
  return { text: 'Every step counts. Stay consistent!', color: '#8B7355', icon: 'footsteps' as const };
}

export const validateTargetValue = (value: string, goalType: string): string => {
  if (!value.trim()) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num <= 0) return 'Value must be greater than 0';
  if (goalType === 'calories' && (num < 500 || num > 10000)) {
    return 'Calories should be between 500-10000';
  }
  if ((goalType === 'protein' || goalType === 'carbs' || goalType === 'fat') && (num < 10 || num > 1000)) {
    return 'Macros should be between 10-1000g';
  }
  return '';
};

export const validateWeight = (value: string): string => {
  if (!value.trim()) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num < 50 || num > 500) return 'Weight should be between 50-500 lbs';
  return '';
};

export const validateMacro = (value: string, macroName: string): string => {
  if (!value.trim()) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num < 0) return `${macroName} cannot be negative`;
  if (macroName === 'Calories' && num > 5000) return 'Calories seem too high (max 5000)';
  if (macroName !== 'Calories' && num > 500) return `${macroName} seems too high (max 500g)`;
  return '';
};
