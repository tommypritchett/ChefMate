/**
 * Tests for grocery-prices service
 * Run: npx ts-node src/tests/grocery-prices.test.ts
 */
import {
  getPricesForItem,
  getPricesForList,
  getNearestStores,
  scoreStores,
  StoreDistance,
} from '../services/grocery-prices';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function section(title: string) {
  console.log(`\n── ${title} ──`);
}

// ── getPricesForItem ──

section('getPricesForItem — exact match');
{
  const r = getPricesForItem('chicken breast');
  assert(r.item === 'chicken breast', 'returns item name');
  assert(r.stores.length === 5, 'returns 5 stores');
  assert(r.bestPrice.price <= Math.min(...r.stores.map(s => s.price)), 'bestPrice is cheapest');
  assert(r.savings >= 0, 'savings non-negative');
  assert(r.stores.every(s => s.deepLink.startsWith('http')), 'all deep links are web URLs');
}

section('getPricesForItem — synonym match');
{
  const r = getPricesForItem('boneless chicken');
  assert(r.stores.length === 5, 'synonym resolves to 5 stores');
  assert(r.stores[0].price > 0, 'has real price');
}

section('getPricesForItem — partial / word overlap match');
{
  const r = getPricesForItem('fresh broccoli florets');
  assert(r.stores.length === 5, 'partial match returns 5 stores');
}

section('getPricesForItem — fallback for unknown item');
{
  const r = getPricesForItem('xyzzyplugh widget');
  assert(r.stores.length === 5, 'fallback returns 5 stores');
  assert(r.stores.every(s => s.unit === 'each'), 'fallback unit is each');
  assert(r.bestPrice.price > 0, 'fallback has positive price');
}

// ── getPricesForList ──

section('getPricesForList — multi-item');
{
  const r = getPricesForList(['chicken breast', 'rice', 'broccoli']);
  assert(r.items.length === 3, 'returns 3 items');
  assert(Object.keys(r.storeTotals).length >= 5, 'has totals for all stores');
  assert(r.bestStore.name.length > 0, 'bestStore has name');
  assert(r.bestStore.total <= Math.min(...Object.values(r.storeTotals)), 'bestStore is cheapest');
  assert(r.totalSavings >= 0, 'totalSavings non-negative');
}

section('getPricesForList — storeLinks');
{
  const r = getPricesForList(['eggs', 'milk']);
  assert(r.storeLinks !== undefined, 'storeLinks returned');
  assert(r.storeLinks['Kroger']?.homeUrl === 'https://www.kroger.com', 'Kroger home URL correct');
  assert(r.storeLinks['Walmart']?.homeUrl === 'https://www.walmart.com', 'Walmart home URL correct');
  assert(r.storeLinks['Target']?.homeUrl === 'https://www.target.com', 'Target home URL correct');
  assert(r.storeLinks['Aldi']?.homeUrl === 'https://www.aldi.us', 'Aldi home URL correct');
  assert(r.storeLinks['Kroger']?.searchUrl.includes('kroger.com'), 'Kroger search URL uses web');
  assert(r.storeLinks['Aldi']?.searchUrl.includes('instacart.com'), 'Aldi search URL uses Instacart');
}

// ── getNearestStores ──

section('getNearestStores — Nashville downtown');
{
  const stores = getNearestStores(36.1627, -86.7816, 20);
  assert(stores.length >= 4, 'finds at least 4 chains nearby');
  assert(stores.some(s => s.chain === 'Amazon Fresh'), 'includes Amazon Fresh (delivery)');
  assert(stores.find(s => s.chain === 'Amazon Fresh')!.distance === 0, 'Amazon Fresh distance is 0');
  assert(stores.every(s => s.distance <= 20 || s.chain === 'Amazon Fresh'), 'all within 20mi or delivery');
  assert(stores.every(s => s.address.length > 0), 'all have address');
  assert(stores.every(s => s.logoColor.startsWith('#')), 'all have logo color');
  assert(stores.every(s => s.homeUrl.startsWith('http')), 'all have home URL');
}

section('getNearestStores — far away location (only delivery)');
{
  // Los Angeles — no Nashville stores within 20 miles
  const stores = getNearestStores(34.0522, -118.2437, 20);
  assert(stores.length === 1, 'only Amazon Fresh within range');
  assert(stores[0].chain === 'Amazon Fresh', 'Amazon Fresh is delivery');
}

section('getNearestStores — sorts by distance');
{
  const stores = getNearestStores(36.1627, -86.7816, 30);
  for (let i = 1; i < stores.length; i++) {
    assert(stores[i].distance >= stores[i - 1].distance,
      `${stores[i].chain} (${stores[i].distance}mi) >= ${stores[i - 1].chain} (${stores[i - 1].distance}mi)`);
  }
}

// ── scoreStores ──

section('scoreStores — basic scoring');
{
  const totals = { Kroger: 10, Walmart: 8, Aldi: 7, Target: 12 };
  const distances: StoreDistance[] = [
    { chain: 'Kroger', distance: 1, address: '', logoColor: '', homeUrl: '' },
    { chain: 'Walmart', distance: 5, address: '', logoColor: '', homeUrl: '' },
    { chain: 'Aldi', distance: 10, address: '', logoColor: '', homeUrl: '' },
    { chain: 'Target', distance: 2, address: '', logoColor: '', homeUrl: '' },
  ];
  const ranked = scoreStores(totals, distances, []);
  assert(ranked.length === 4, 'returns all 4 stores');
  assert(ranked[0].recommended === true, 'first store is recommended');
  assert(ranked.filter(s => s.recommended).length === 1, 'only one recommended');
  assert(ranked[0].score <= ranked[1].score, 'sorted by score ascending');
}

section('scoreStores — preference bonus');
{
  const totals = { Kroger: 10, Walmart: 10 };
  const distances: StoreDistance[] = [
    { chain: 'Kroger', distance: 5, address: '', logoColor: '', homeUrl: '' },
    { chain: 'Walmart', distance: 5, address: '', logoColor: '', homeUrl: '' },
  ];
  // Without preference: same score
  const noPrefs = scoreStores(totals, distances, []);
  // With Kroger preferred: Kroger should score better (lower)
  const withPref = scoreStores(totals, distances, ['Kroger']);
  const krogerNoPref = noPrefs.find(s => s.store === 'Kroger')!.score;
  const krogerWithPref = withPref.find(s => s.store === 'Kroger')!.score;
  assert(krogerWithPref < krogerNoPref, 'preferred store gets lower (better) score');
  assert(withPref[0].store === 'Kroger', 'preferred Kroger is top ranked');
}

section('scoreStores — distance impacts score');
{
  const totals = { Kroger: 10, Walmart: 10 };
  const distances: StoreDistance[] = [
    { chain: 'Kroger', distance: 1, address: '', logoColor: '', homeUrl: '' },
    { chain: 'Walmart', distance: 15, address: '', logoColor: '', homeUrl: '' },
  ];
  const ranked = scoreStores(totals, distances, []);
  const kroger = ranked.find(s => s.store === 'Kroger')!;
  const walmart = ranked.find(s => s.store === 'Walmart')!;
  assert(kroger.score < walmart.score, 'closer store has better score (same price)');
}

// ── Deep link URL validation ──

section('Deep links — all stores use web URLs');
{
  const r = getPricesForItem('chicken breast');
  for (const s of r.stores) {
    assert(!s.deepLink.includes('kroger://'), `${s.store}: no kroger:// scheme`);
    assert(s.deepLink.startsWith('https://'), `${s.store}: uses https`);
  }
}

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('All tests passed!');
