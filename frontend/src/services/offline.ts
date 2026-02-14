import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = 'chefmate_cache_';
const QUEUE_KEY = 'chefmate_mutation_queue';

// --- Recipe Cache ---

export async function cacheRecipes(recipes: any[]) {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}recipes`, JSON.stringify(recipes));
    await AsyncStorage.setItem(`${CACHE_PREFIX}recipes_ts`, Date.now().toString());
  } catch (err) {
    console.error('Failed to cache recipes:', err);
  }
}

export async function getCachedRecipes(): Promise<any[] | null> {
  try {
    const data = await AsyncStorage.getItem(`${CACHE_PREFIX}recipes`);
    if (!data) return null;

    // Check freshness — 1 hour cache
    const ts = await AsyncStorage.getItem(`${CACHE_PREFIX}recipes_ts`);
    if (ts && Date.now() - parseInt(ts) > 3600000) return null;

    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function cacheRecipeDetail(id: string, recipe: any) {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}recipe_${id}`, JSON.stringify(recipe));
  } catch (err) {
    console.error('Failed to cache recipe detail:', err);
  }
}

export async function getCachedRecipeDetail(id: string): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(`${CACHE_PREFIX}recipe_${id}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// --- Mutation Queue ---

interface QueuedMutation {
  id: string;
  type: string; // 'addInventory' | 'deleteInventory' | 'toggleShoppingItem'
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  data?: any;
  createdAt: number;
}

export async function queueMutation(mutation: Omit<QueuedMutation, 'id' | 'createdAt'>) {
  try {
    const queue = await getQueue();
    queue.push({
      ...mutation,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to queue mutation:', err);
  }
}

export async function getQueue(): Promise<QueuedMutation[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function replayQueue(apiCall: (m: QueuedMutation) => Promise<void>) {
  const queue = await getQueue();
  if (queue.length === 0) return;

  const failed: QueuedMutation[] = [];
  for (const mutation of queue) {
    try {
      await apiCall(mutation);
    } catch {
      failed.push(mutation);
    }
  }

  if (failed.length > 0) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } else {
    await clearQueue();
  }
}

// --- Network Status ---

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? true;
  } catch {
    return true; // Assume online if we can't check
  }
}

export function onNetworkChange(callback: (isConnected: boolean) => void) {
  return NetInfo.addEventListener(state => {
    callback(state.isConnected ?? true);
  });
}
