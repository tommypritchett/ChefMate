# ChefMate Testing Guide

Manual test procedures for inventory and AI features.

---

## TEST 1: Text-Based Conversational Inventory (Chat Tab)

**Steps:**
1. Open Chat tab
2. Type: `I have 2 pounds of chicken breast, 3 onions, and a bag of rice`
3. Wait for AI response
4. Verify AI confirms items were added (e.g., "Added 3 items to your inventory")
5. Open Inventory tab
6. Verify chicken breast, onions, and rice appear in the list with correct storage locations

**Expected:** AI parses natural language, auto-infers categories/storage, adds items.
**Result:** PASS / FAIL

---

## TEST 2: Text-Based Conversational Inventory (Inventory Tab)

**Steps:**
1. Open Inventory tab
2. Tap purple **Quick Add** button
3. Verify modal opens with Text/Voice toggle (Text selected by default)
4. Type: `I got chicken, rice, and onions`
5. Tap send button or press Enter
6. Wait for AI response in the mini chat
7. Verify AI confirms items added
8. Tap **Close**
9. Verify items appear in inventory list below

**Expected:** Items parsed, added to inventory, list refreshes on close.
**Result:** PASS / FAIL

---

## TEST 3: Voice-Based Conversational Inventory (Inventory Tab)

**Steps:**
1. Open Inventory tab
2. Tap **Quick Add** button
3. Select **Voice** mode toggle
4. Grant microphone permission if prompted
5. Tap large mic button
6. Say: "I bought chicken breast and rice"
7. Verify transcribed text appears on screen
8. Tap send button (or voice auto-sends on stop)
9. Verify AI response appears in chat
10. Tap **Close** and verify items in inventory

**Note:** Voice requires Web Speech API (Chrome/Edge). Not supported on all devices.
**Result:** PASS / FAIL

---

## TEST 4: Photo Inventory Analysis

**Steps:**
1. Open Inventory tab
2. Tap blue **Scan** button
3. On web: file picker opens. On mobile: choose "Take Photo" or "Choose from Library"
4. Select/take a photo of food items
5. Verify modal shows "Analyzing photo..." with spinner
6. Wait for analysis to complete
7. **Verify: Results screen appears** with detected items, confidence %, and checkboxes
8. Tap to deselect any incorrect items
9. Tap **Add (N)** button in header
10. **Verify: Success screen** shows green checkmark with "Added to Inventory!"
11. Tap **Done**
12. **Verify: Items appear** in inventory list

**Error scenarios to test:**
- Photo with no food → Error screen: "No food items could be identified"
- Cancel photo picker → Nothing happens (no error)
- Network offline → Error screen: "Failed to analyze photo"

**Result:** PASS / FAIL

---

## TEST 5: Recipe Suggestion with Inventory Validation

**Prerequisites:** Add some items to inventory first:
- Chicken breast (added 3+ days ago if possible)
- Rice
- Onions (set expiry to within 3 days)

**Steps:**
1. Open Chat tab
2. Type: `What should I make for dinner?`
3. **Verify: AI suggests recipe(s)**
4. **Verify: AI calls compare_recipe_ingredients** (shows inventory check)
5. **Verify: AI asks about old/expiring items** (e.g., "Your onions expire soon — still good?")
6. Reply: `Yes`
7. **Verify: AI shows missing items** for the recipe
8. **Verify: AI offers** "Want me to add missing items to your shopping list?"
9. Reply: `Yes`
10. **Verify: AI confirms** items added to shopping list
11. Open **Shopping** tab and verify items are there

**Result:** PASS / FAIL

---

## TEST 6: Photo Analysis Error Recovery

**Steps:**
1. Open Inventory tab
2. Tap **Scan** → select a non-food image (e.g., blank wall, text document)
3. Wait for analysis
4. **Verify: Error screen** appears with message
5. **Verify: "Retry Photo" button** is present and functional
6. **Verify: "Add Manually" button** opens the standard Add Item form
7. Tap "Add Manually" → verify form opens correctly

**Result:** PASS / FAIL

---

## TEST 7: All Inventory Input Methods Work

Verify each method adds items correctly:

| # | Method | Location | Action |
|---|--------|----------|--------|
| 1 | Chat (text) | Chat tab | Type "I bought milk and eggs" |
| 2 | Quick Add (text) | Inventory tab | Quick Add > Text > "I got bread and butter" |
| 3 | Quick Add (voice) | Inventory tab | Quick Add > Voice > Speak items |
| 4 | Photo scan | Inventory tab | Scan > Pick photo > Confirm items |
| 5 | Manual form | Inventory tab | + button > Fill form > Add |

After all 5 methods, verify all items appear in inventory grouped by storage location.

**Result:** PASS / FAIL

---

## TEST 8: Shopping List Tab Navigation

**Steps:**
1. Verify bottom tab bar shows 5 tabs: Chat AI, Recipes, Meal Plan, Shopping, Inventory
2. Tap **Shopping** tab → verify Shopping Lists screen loads
3. Verify "From Meal Plan" generate button is visible
4. Create a new list → verify it appears in list selector
5. Verify **Profile** is NOT in the tab bar
6. Tap the **person icon** in the top-right header → verify Profile screen opens
7. From Profile, tap "Sign Out" → verify logout works

**Result:** PASS / FAIL

---

## TEST 9: Recipe Favorites Section

**Steps:**
1. Open a recipe detail page → tap the save/favorite button
2. Go back to **Recipes** tab
3. **Verify: "My Favorites" section** appears at the top with a horizontal scroll
4. Verify the favorited recipe appears as a small card
5. Tap the favorite card → verify it navigates to recipe detail

**Result:** PASS / FAIL

---

## TEST 10: Recipe Filters (Category + Dietary Tags)

**Steps:**
1. Open **Recipes** tab
2. Tap **Chicken** category filter → verify only chicken recipes show
3. Tap **Breakfast** → verify only breakfast recipes show
4. Tap **All** → verify all recipes return
5. Tap the **filter icon** (funnel) next to the search bar
6. **Verify: Dietary tag filter chips** appear below categories
7. Tap **high-protein** → verify filtered results
8. Tap **vegetarian** in addition → verify results match both tags
9. Tap **Clear** → verify tags are cleared, all results return
10. Try combining a category (e.g., Mexican) + a tag (e.g., quick)

**Result:** PASS / FAIL

---

## TEST 11: Voice Continuous Mode + Silence Detection

**Steps:**
1. Open Inventory → Quick Add → Voice mode
2. Tap mic button
3. Say: "I bought chicken"
4. **Pause 1 second** → say: "and rice"
5. **Pause 1 second** → say: "and some onions"
6. **Verify:** All items appear in transcription (not just first phrase)
7. **Stop talking for 3 seconds**
8. **Verify:** Voice automatically stops after ~2.5s of silence
9. Verify complete transcription is in the text field

**Result:** PASS / FAIL

---

## Notes

- **Demo mode** (no OPENAI_API_KEY): Chat uses fallback tool execution. Photo scan returns mock items (chicken, broccoli, rice, soy sauce). All features work but responses are less conversational.
- **Voice features** require Chrome/Edge with Web Speech API. Safari and Firefox have limited support.
- **Photo analysis** on web uses file picker (no camera). On iOS/Android, offers camera or library choice.
- **Backend must be running** on port 3001 for all tests. Frontend on port 8081.
