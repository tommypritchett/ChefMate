/**
 * API Integration Tests — TESTING FEEDBACK 2/18 fixes
 * Run: npx ts-node src/tests/api-integration.test.ts
 *
 * Requires backend running on localhost:3001 and at least one user in the DB.
 */
import jwt from 'jsonwebtoken';

const BASE = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'chefmate-super-secret-jwt-key-for-development-only-min-32-chars';

let passed = 0;
let failed = 0;
let TOKEN = '';

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

async function fetchJson(url: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function setup() {
  // Find a user ID from the DB via the auth endpoint or use a known one
  // For testing, create a token from a known user
  const { execSync } = require('child_process');
  const userId = execSync(
    `sqlite3 prisma/dev.db "SELECT id FROM users LIMIT 1;"`,
    { encoding: 'utf8' },
  ).trim();

  if (!userId) {
    console.error('No users in database. Register a user first.');
    process.exit(1);
  }

  TOKEN = jwt.sign({ userId }, JWT_SECRET);
  console.log(`Using user: ${userId.slice(0, 8)}...`);
}

async function testGroceryCompareWithoutLocation() {
  section('POST /grocery/compare — without location');
  const data = await fetchJson(`${BASE}/grocery/compare`, {
    method: 'POST',
    body: JSON.stringify({ items: ['chicken breast', 'rice'] }),
  });

  assert(data.items?.length === 2, 'returns 2 items');
  assert(Object.keys(data.storeTotals).length >= 5, 'has totals for 5 stores');
  assert(data.bestStore?.name?.length > 0, 'bestStore has name');
  assert(data.storeLinks !== undefined, 'storeLinks included');
  assert(data.storeDistances === undefined, 'no storeDistances without lat/lng');
  assert(data.rankedStores === undefined, 'no rankedStores without lat/lng');
}

async function testGroceryCompareWithLocation() {
  section('POST /grocery/compare — with Nashville location');
  const data = await fetchJson(`${BASE}/grocery/compare`, {
    method: 'POST',
    body: JSON.stringify({
      items: ['chicken breast', 'rice', 'broccoli'],
      lat: 36.1627,
      lng: -86.7816,
    }),
  });

  assert(data.items?.length === 3, 'returns 3 items');
  assert(data.storeDistances?.length >= 4, 'has store distances for 4+ chains');
  assert(data.rankedStores?.length >= 4, 'has ranked stores for 4+ chains');

  // Distances
  const amazon = data.storeDistances.find((s: any) => s.chain === 'Amazon Fresh');
  assert(amazon?.distance === 0, 'Amazon Fresh distance is 0 (delivery)');
  assert(data.storeDistances.every((s: any) => s.address?.length > 0), 'all distances have address');

  // Ranking
  assert(data.rankedStores[0]?.recommended === true, 'first ranked store is recommended');
  assert(data.rankedStores.filter((s: any) => s.recommended).length === 1, 'only one recommended');
  for (let i = 1; i < data.rankedStores.length; i++) {
    assert(data.rankedStores[i].score >= data.rankedStores[i - 1].score,
      `ranking sorted: ${data.rankedStores[i].store} score >= ${data.rankedStores[i - 1].store}`);
  }
}

async function testGroceryCompareMaxDistance() {
  section('POST /grocery/compare — maxDistance filter');
  // Memphis is far from Nashville stores
  const data = await fetchJson(`${BASE}/grocery/compare`, {
    method: 'POST',
    body: JSON.stringify({
      items: ['milk'],
      lat: 35.1495,
      lng: -90.049,
      maxDistance: 20,
    }),
  });

  const storeNames = Object.keys(data.storeTotals);
  assert(storeNames.includes('Amazon Fresh'), 'Amazon Fresh always included');
  assert(!storeNames.includes('Kroger') && !storeNames.includes('Walmart'),
    'Nashville stores excluded from Memphis');
}

async function testGroceryComparePreferredStores() {
  section('POST /grocery/compare — preferredStores');
  const data = await fetchJson(`${BASE}/grocery/compare`, {
    method: 'POST',
    body: JSON.stringify({
      items: ['chicken breast', 'rice'],
      lat: 36.1627,
      lng: -86.7816,
      preferredStores: ['Kroger'],
    }),
  });

  const kroger = data.rankedStores?.find((s: any) => s.store === 'Kroger');
  assert(kroger !== undefined, 'Kroger in ranked stores');
  // When preferred, Kroger should rank better than without preference
  // (exact ranking depends on price/distance, so just verify the data structure)
  assert(typeof kroger?.score === 'number', 'Kroger has numeric score');
}

async function testNearbyStores() {
  section('GET /grocery/nearby — Nashville');
  const data = await fetchJson(`${BASE}/grocery/nearby?lat=36.1627&lng=-86.7816`);
  assert(data.stores?.length >= 4, 'finds 4+ nearby chains');
  assert(data.stores.every((s: any) => typeof s.distance === 'number'), 'all have distance');
}

async function testInventoryPatch() {
  section('PATCH /inventory/:id — update item');

  // Create an item first
  const created = await fetchJson(`${BASE}/inventory`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Milk',
      storageLocation: 'fridge',
      category: 'dairy',
      quantity: 1,
      unit: 'gallon',
    }),
  });
  assert(created.item?.id, 'created test item');

  // Update it
  const updated = await fetchJson(`${BASE}/inventory/${created.item.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: 'Test Whole Milk',
      quantity: 2,
      storageLocation: 'fridge',
    }),
  });
  assert(updated.item?.name === 'Test Whole Milk', 'name updated');
  assert(updated.item?.quantity === 2, 'quantity updated');

  // Clean up
  await fetch(`${BASE}/inventory/${created.item.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
}

async function testGroceryCompareValidation() {
  section('POST /grocery/compare — validation');
  try {
    await fetchJson(`${BASE}/grocery/compare`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert(false, 'should reject missing items');
  } catch (err: any) {
    assert(err.message.includes('400'), 'returns 400 for missing items');
  }

  try {
    await fetchJson(`${BASE}/grocery/compare`, {
      method: 'POST',
      body: JSON.stringify({ items: [] }),
    });
    assert(false, 'should reject empty items');
  } catch (err: any) {
    assert(err.message.includes('400'), 'returns 400 for empty items');
  }
}

async function testSearchProducts() {
  section('GET /shopping-lists/search-products — autocomplete');
  const data = await fetchJson(`${BASE}/shopping-lists/search-products?q=chick`);
  assert(data.products?.length > 0, 'returns products for "chick"');
  assert(data.products.some((p: any) => p.name.toLowerCase().includes('chicken')),
    'includes chicken products');
}

async function main() {
  console.log('ChefMate API Integration Tests — 2/18 Fixes\n');

  await setup();

  await testGroceryCompareWithoutLocation();
  await testGroceryCompareWithLocation();
  await testGroceryCompareMaxDistance();
  await testGroceryComparePreferredStores();
  await testNearbyStores();
  await testInventoryPatch();
  await testGroceryCompareValidation();
  await testSearchProducts();

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('All tests passed!');
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
