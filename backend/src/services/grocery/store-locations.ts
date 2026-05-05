import { STORES, round } from './mock-prices';

interface StoreLocation {
  chain: string;
  lat: number;
  lng: number;
  address: string;
}

// Sample store locations (Nashville, TN area — expand per deployment region)
const STORE_LOCATIONS: StoreLocation[] = [
  // Kroger
  { chain: 'Kroger', lat: 36.1627, lng: -86.7816, address: '2601 Charlotte Ave, Nashville, TN' },
  { chain: 'Kroger', lat: 36.1184, lng: -86.8383, address: '4560 Harding Pike, Nashville, TN' },
  { chain: 'Kroger', lat: 36.1062, lng: -86.7459, address: '2131 Abbott Martin Rd, Nashville, TN' },
  { chain: 'Kroger', lat: 36.0846, lng: -86.7137, address: '2601 Nolensville Pike, Nashville, TN' },
  // Walmart
  { chain: 'Walmart', lat: 36.1092, lng: -86.8884, address: '7044 Charlotte Pike, Nashville, TN' },
  { chain: 'Walmart', lat: 36.0413, lng: -86.7023, address: '5824 Nolensville Pike, Antioch, TN' },
  { chain: 'Walmart', lat: 36.2309, lng: -86.8151, address: '3458 Dickerson Pike, Nashville, TN' },
  // Target
  { chain: 'Target', lat: 36.1282, lng: -86.8422, address: '32 White Bridge Rd, Nashville, TN' },
  { chain: 'Target', lat: 36.1107, lng: -86.8169, address: '3790 Charlotte Ave, Nashville, TN' },
  { chain: 'Target', lat: 36.1527, lng: -86.7927, address: '2566 W End Ave, Nashville, TN' },
  // Aldi
  { chain: 'Aldi', lat: 36.1369, lng: -86.8757, address: '6826 Charlotte Pike, Nashville, TN' },
  { chain: 'Aldi', lat: 36.0738, lng: -86.7029, address: '5305 Nolensville Pike, Nashville, TN' },
  { chain: 'Aldi', lat: 36.2151, lng: -86.7256, address: '2421 Gallatin Pike, Nashville, TN' },
  // Amazon Fresh — delivery only, no physical distance
  { chain: 'Amazon Fresh', lat: 0, lng: 0, address: 'Delivery only' },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface StoreDistance {
  chain: string;
  distance: number;
  address: string;
  logoColor: string;
  homeUrl: string;
}

export function getNearestStores(userLat: number, userLng: number, maxMiles: number = 20): StoreDistance[] {
  const chainDistances: Record<string, StoreDistance> = {};

  for (const loc of STORE_LOCATIONS) {
    if (loc.chain === 'Amazon Fresh') {
      chainDistances[loc.chain] = {
        chain: loc.chain,
        distance: 0,
        address: 'Delivery to your area',
        logoColor: STORES.amazon.logoColor,
        homeUrl: STORES.amazon.homeUrl,
      };
      continue;
    }

    const dist = haversineDistance(userLat, userLng, loc.lat, loc.lng);
    if (!chainDistances[loc.chain] || dist < chainDistances[loc.chain].distance) {
      const storeKey = Object.entries(STORES).find(([, v]) => v.name === loc.chain)?.[0] as keyof typeof STORES;
      chainDistances[loc.chain] = {
        chain: loc.chain,
        distance: round(dist),
        address: loc.address,
        logoColor: storeKey ? STORES[storeKey].logoColor : '#6b7280',
        homeUrl: storeKey ? STORES[storeKey].homeUrl : '',
      };
    }
  }

  return Object.values(chainDistances)
    .filter(s => s.distance <= maxMiles || s.chain === 'Amazon Fresh')
    .sort((a, b) => a.distance - b.distance);
}

export function scoreStores(
  storeTotals: Record<string, number>,
  distances: StoreDistance[],
  _preferredStores?: string[],
): Array<{ store: string; total: number; distance: number; score: number; recommended: boolean; cheapest?: boolean; closest?: boolean }> {
  const distMap: Record<string, number> = {};
  for (const d of distances) {
    distMap[d.chain] = d.distance;
  }

  const entries = Object.entries(storeTotals).map(([store, total]) => {
    const distance = distMap[store] ?? 99;
    const maxTotal = Math.max(...Object.values(storeTotals));
    const priceScore = (total / maxTotal) * 80;
    const distScore = (Math.min(distance, 20) / 20) * 20;
    const score = round(priceScore + distScore);
    return { store, total, distance, score, recommended: false, cheapest: false, closest: false };
  });

  entries.sort((a, b) => a.score - b.score);
  if (entries.length > 0) entries[0].recommended = true;

  const cheapest = [...entries].sort((a, b) => a.total - b.total);
  if (cheapest.length > 0) cheapest[0].cheapest = true;

  const closestPhysical = [...entries]
    .filter(e => e.store !== 'Amazon Fresh' && e.distance > 0)
    .sort((a, b) => a.distance - b.distance);
  const physicalStores = entries.filter(e => e.store !== 'Amazon Fresh');
  const closestStore = closestPhysical.length > 0 ? closestPhysical[0]
    : physicalStores.length > 0 ? physicalStores.sort((a, b) => a.distance - b.distance)[0]
    : null;
  if (closestStore) closestStore.closest = true;

  return entries;
}
