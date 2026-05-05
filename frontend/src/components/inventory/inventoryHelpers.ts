export { STORAGE_LOCATIONS, INVENTORY_CATEGORIES as CATEGORIES } from '../../constants/food';
export const SORT_OPTIONS = ['location', 'category', 'expiry'] as const;
export type SortMode = typeof SORT_OPTIONS[number];

export const FILTER_PILLS = [
  { key: 'all', label: 'All', emoji: '📦' },
  { key: 'fridge', label: 'Fridge', emoji: '🧊' },
  { key: 'pantry', label: 'Pantry', emoji: '🏪' },
  { key: 'freezer', label: 'Freezer', emoji: '❄️' },
  { key: 'spices', label: 'Spices', emoji: '🌶️' },
  { key: 'produce', label: 'Produce', emoji: '🥬' },
  { key: 'expiring', label: 'Expiring Soon', emoji: '⚠️' },
] as const;

export const LOCATION_EMOJI: Record<string, string> = {
  fridge: '🧊',
  pantry: '🏪',
  freezer: '❄️',
};

export const CATEGORY_EMOJI: Record<string, string> = {
  'meat/protein': '🥩',
  produce: '🥬',
  dairy: '🧀',
  grains: '🌾',
  condiments: '🧂',
  beverages: '☕',
  other: '📦',
};

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  storageLocation: string;
  quantity: number | null;
  unit: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PhotoItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  storageLocation: string;
  confidence: number;
  selected: boolean;
}

export type PhotoState = 'idle' | 'analyzing' | 'results' | 'error' | 'added';

export interface ConvoMessage {
  role: 'user' | 'assistant';
  text: string;
}

// Re-export from shared utils so existing imports don't break
export { validateQuantity } from '../../utils/validation';

export const isExpiringSoon = (expiresAt: string | null, storageLocation?: string): boolean => {
  if (!expiresAt) return false;
  const thresholdDays = storageLocation === 'freezer' ? 14 : 3;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff < thresholdDays * 24 * 60 * 60 * 1000;
};

export const isExpired = (expiresAt: string | null, storageLocation?: string): boolean => {
  if (!expiresAt) return false;
  if (storageLocation === 'freezer') {
    const gracePeriod = 120 * 24 * 60 * 60 * 1000;
    return new Date(expiresAt).getTime() + gracePeriod < Date.now();
  }
  return new Date(expiresAt).getTime() < Date.now();
};

export const getDaysUntilExpiry = (expiresAt: string): number => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};

export const formatExpiry = (expiresAt: string | null, storageLocation?: string): { text: string; status: 'normal' | 'warn' | 'expired' } => {
  if (!expiresAt) return { text: '', status: 'normal' };
  if (isExpired(expiresAt, storageLocation)) {
    const d = new Date(expiresAt);
    return { text: `Exp ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, status: 'expired' };
  }
  if (isExpiringSoon(expiresAt, storageLocation)) {
    const days = getDaysUntilExpiry(expiresAt);
    return { text: `${days} day${days !== 1 ? 's' : ''} left`, status: 'warn' };
  }
  const d = new Date(expiresAt);
  return { text: `Exp ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, status: 'normal' };
};

export const getTimeSinceAdded = (createdAt: string): string => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Added today';
  if (days === 1) return 'Added 1 day ago';
  if (days < 7) return `Added ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'Added 1 week ago';
  return `Added ${weeks} weeks ago`;
};

export const getItemEmoji = (item: InventoryItem): string => {
  const cat = (item.category || 'other').toLowerCase();
  const loc = item.storageLocation?.toLowerCase() || 'pantry';
  if (cat === 'dairy') return '🧀';
  if (cat === 'meat/protein' || cat === 'meat' || cat === 'protein') return '🥩';
  if (cat === 'produce') return '🥬';
  if (cat === 'grains') return '🌾';
  if (cat === 'beverages') return '🥤';
  if (cat === 'condiments') return '🧂';
  if (loc === 'freezer') return '🧊';
  return '📦';
};

export const getIconBgClass = (item: InventoryItem): string => {
  const loc = item.storageLocation?.toLowerCase() || 'pantry';
  const cat = (item.category || '').toLowerCase();
  if (cat === 'condiments' || cat === 'spices') return 'bg-[#FFF0F0]';
  if (loc === 'fridge') return 'bg-[#EEF6FF]';
  if (loc === 'freezer') return 'bg-[#F0F0FF]';
  if (loc === 'pantry') return 'bg-[#FFF5E8]';
  return 'bg-[#FFF0E8]';
};
