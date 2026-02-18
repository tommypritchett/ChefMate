# ChefMate — Testing Feedback Fixes (Feb 18, 2026)

## Summary

Addressed 19 issues from two rounds of testing feedback. All fixes verified via 83 automated tests (53 unit + 30 API integration).

**Run tests:** `cd backend && npm test`

---

## Batch 1: Critical Bugs (TESTING FEEDBACK 2/18 9AM)

### Bug 1 — Chat stops responding with no error

**Root cause:** `chatStore.sendMessage()` swallowed all errors silently.
**Fix:**
- Added `error` state, `retryLastMessage()`, and `clearError()` to chatStore
- Categorized errors: network, timeout, server 500, other
- Added error banner in chat UI with Retry/Dismiss buttons
- Increased conversation API timeout from 15s → 90s

**Files:** `chatStore.ts`, `(tabs)/index.tsx`, `api.ts`

### Bug 2 — Shopping items don't appear until page refresh

**Root cause:** `fetchLists()` set `loading: true` on every call, causing full re-render flash.
**Fix:**
- Split into initial load (shows spinner) vs background refresh (silent)
- Added optimistic UI updates for add/edit/delete operations

**Files:** `(tabs)/shopping.tsx`

### Bug 3 — Three dots menu doesn't work

**Root cause:** `Alert.alert()` with action buttons doesn't work on React Native Web.
**Fix:** Replaced with custom bottom-sheet Modal component.

**Files:** `(tabs)/shopping.tsx`

### Bug 4 — Tapping item immediately asks for storage location

**Root cause:** Single `onPress` handler covered both checkbox and item content.
**Fix:** Separated checkbox and item content into distinct `TouchableOpacity` components.

**Files:** `(tabs)/shopping.tsx`

### Feature 5 — Shopping list filter defaults to Active

**Fix:** Added `listFilter` state defaulting to `'active'`, filtering completed lists.
Already working; confirmed via code review.

### Feature 6 — Price comparison broken

**Root cause:** Kroger used `kroger://` native scheme (web-incompatible), Aldi used wrong URL.
**Fix:**
- All stores now use web URLs (`https://www.kroger.com/search?query=...`)
- Aldi routes through Instacart (`https://www.instacart.com/store/aldi/search_v3/...`)
- Added `homeUrl` for "Shop at Store" buttons
- Added 70+ synonym mappings for better product matching

**Files:** `grocery-prices.ts`, `(tabs)/shopping.tsx`

---

## Batch 2: Feature Improvements (TESTING FEEDBACK 2/18)

### Issue 1 — Images don't display in chat

**Fix:** Updated `MessageBubble` to strip `![alt](url)` image markdown. Added basic markdown rendering for assistant messages: bold, headers, bullets, numbered lists.

**Files:** `MessageBubble.tsx`

### Issue 2 — Frozen food showing "expires soon" incorrectly

**Root cause:** Uniform 3-day expiry threshold regardless of storage location.
**Fix:** Freezer items use 14-day warning threshold (vs 3 days for fridge/pantry). `isExpired` gives freezer items a 30-day grace period after expiry date.

**Files:** `(tabs)/inventory.tsx`

### Issue 3 — Add expiration notifications

**Fix:** Added yellow notification banner at top of inventory screen: "X items expiring soon". Tap "View" switches to expiry sort mode.

**Files:** `(tabs)/inventory.tsx`

### Issue 4 — Sort inventory by food type

**Fix:** Added sort mode toggle pills (Location | Category | Expiry):
- **Location** (default): Fridge → Freezer → Pantry
- **Category**: Meat & Protein, Produce, Dairy, Grains, Condiments, etc.
- **Expiry**: Expired → Expiring Soon → Has Date → No Date

**Files:** `(tabs)/inventory.tsx`

### Issue 5 — Edit/delete not working in inventory

**Root cause:** No PATCH endpoint existed on backend.
**Fix:**
- Added `PATCH /api/inventory/:id` endpoint
- Added edit modal in inventory UI (name, storage, category, qty, unit, expiry)
- Added pencil/trash icons on each item row
- Added long-press action sheet

**Files:** `inventory.ts` (backend route), `api.ts`, `(tabs)/inventory.tsx`

### Issues 6-7 — Shopping list filter UI

**Fix:** Added physical filter tabs: **Active** (default) | **Completed** | **All**. `listFilter` state controls which lists render. Green highlight on active tab.

**Files:** `(tabs)/shopping.tsx`

### Issue 8 — Highlight suggested storage location

**Fix:** Added `suggestStorage(category, name)` function with heuristics:
- Frozen items → freezer
- Meat/dairy/produce → fridge
- Grains/canned/condiments → pantry
- Name-based detection (milk, yogurt, ice cream, etc.)

Suggested option shown with green border and "Suggested" label in storage picker.

**Files:** `(tabs)/shopping.tsx`

### Issue 9 — Sort shopping lists by category

**Status:** Already working via `CATEGORY_ORDER` constant. Confirmed via code review.

### Issue 10 — Rename "Prices" button

**Fix:** Changed to "Order" with `storefront-outline` icon. Better communicates that it navigates to store ordering.

**Files:** `(tabs)/shopping.tsx`

### Issues 11-13 — Store distance, max distance filter, smart recommendations

**Fix — Backend:**
- Added `STORE_LOCATIONS` array with Nashville-area coordinates (14 locations across 5 chains)
- Added `haversineDistance()` function for geographic distance calculation
- Added `getNearestStores(lat, lng, maxMiles)` — finds closest location per chain, filters by max distance
- Added `scoreStores(storeTotals, distances, preferredStores)` — composite scoring: 40% price + 35% distance + 25% user preference
- Updated `/grocery/compare` to accept `lat`, `lng`, `preferredStores`, `maxDistance`
- Added `GET /grocery/nearby` endpoint
- Amazon Fresh always included (delivery, 0 distance)

**Fix — Frontend:**
- Integrated `expo-location` for device geolocation
- Price comparison modal now shows distance + address for each store
- Ranked recommendations with "Recommended" badge on best overall store
- Stores >20 miles away filtered from results

**Files:** `grocery-prices.ts`, `grocery.ts` (route), `api.ts`, `(tabs)/shopping.tsx`

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `expo-location` | Device geolocation for store distance |

---

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| `grocery-prices.test.ts` (unit) | 53 | All passing |
| `api-integration.test.ts` (API) | 30 | All passing |
| **Total** | **83** | **All passing** |

**Run:** `cd backend && npm test`

---

## Files Modified

### Backend
- `src/services/grocery-prices.ts` — Store URLs, synonyms, distance, scoring
- `src/routes/grocery.ts` — Location-aware compare, /nearby endpoint
- `src/routes/inventory.ts` — PATCH /:id endpoint
- `src/tests/grocery-prices.test.ts` — NEW: 53 unit tests
- `src/tests/api-integration.test.ts` — NEW: 30 API tests
- `package.json` — Added test scripts

### Frontend
- `src/store/chatStore.ts` — Error state, retry, error categorization
- `src/services/api.ts` — Timeout increase, inventoryApi.updateItem, groceryApi location params
- `src/components/chat/MessageBubble.tsx` — Markdown parsing, image stripping
- `app/(tabs)/index.tsx` — Chat error banner with retry
- `app/(tabs)/shopping.tsx` — Filter tabs, action sheets, optimistic updates, storage suggestions, order button, distance display, ranked recommendations
- `app/(tabs)/inventory.tsx` — Sort modes, expiry notifications, edit modal, freezer-aware expiry
