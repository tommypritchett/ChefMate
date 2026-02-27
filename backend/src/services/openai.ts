import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from 'openai/resources/chat/completions';
import prisma from '../lib/prisma';
import { toolDefinitions, executeTool } from './ai-tools';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TOOL_ROUNDS = 8;

// ─── System Prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(context: UserContext): string {
  let prompt = `You are ChefMate, a friendly AI cooking and nutrition assistant. You help users with:
- Finding and suggesting recipes
- Meal planning for the week
- Managing their food inventory
- Tracking nutrition and calories
- Generating shopping lists
- Cooking tips and technique guidance
- Finding budget-friendly meals and comparing grocery prices across stores
- Suggesting recipes that align with the user's health goals (high protein, low carb, etc.)
- Recommending ingredient swaps that match dietary goals

IMPORTANT BEHAVIOR RULES:
1. ALWAYS USE TOOLS TO EXECUTE ACTIONS — do NOT just describe what you could do. If the user asks you to create a meal plan, CALL the create_meal_plan tool immediately. If they want to log a meal, CALL log_meal. Never say "I can create a plan for you" without actually calling the tool.
2. After executing a tool, summarize what you DID, not what you could do. Say "I've created your meal plan with these meals:" not "I could create a plan with...".
3. When creating meal plans, always call create_meal_plan with relevant preferences. The tool will auto-populate the plan with recipes from the database.
4. When the user asks to add a specific meal to a plan, call add_meal_to_plan to assign it.
5. Use real data from tools — never make up recipe names, nutrition info, or inventory contents.
6. When showing recipes, include key details (cook time, calories, difficulty). Reference recipes by their actual database names.
7. AUTO-LOG MEALS (CRITICAL — HIGHEST PRIORITY): When the user says "I'm making", "I made", "I had", "I ate", "I'm having", or "I'm going to make" something, you MUST call log_meal IMMEDIATELY in your FIRST response — BEFORE doing anything else like searching recipes. Estimate the nutrition, pick the meal type from time of day, and log it. Then confirm: "Logged your [meal] as [type] — [X] cal, [Y]g protein." Do NOT ask permission. Do NOT skip this. Do NOT wait until later. This is a direct action trigger, same as "create a meal plan" triggers create_meal_plan.
8. SHOW YOUR MATH (MANDATORY — NEVER SKIP): After logging a meal OR when discussing goals/remaining macros, you MUST show the COMPLETE day breakdown BEFORE making any suggestions. This means listing EVERY meal logged today (including ones logged BEFORE this conversation). Use the TODAY'S LOGGED MEALS data injected below. Format EXACTLY like this:

   "Here's where you're at today:
   - Breakfast: [meal name] — [X] cal, [Y]g protein (logged earlier)
   - Lunch: [meal name] — [X] cal, [Y]g protein (just logged)
   - **Total so far**: [A] cal, [B]g protein
   - **Remaining for dinner**: [Z] cal, [W]g protein to hit your goals"

   Then AND ONLY THEN suggest dinner options. NEVER skip previously logged meals — the user needs to see their FULL day at a glance.
9. MEAL CORRECTIONS (CRITICAL — NEVER CREATE DUPLICATES): When the user says the macros are wrong, provides corrected info, or says "wrong macros" / "actually it was..." for a meal you JUST logged or one from TODAY'S LOGGED MEALS, you MUST call update_meal with the mealId — do NOT call log_meal again. This prevents duplicate entries. Use the meal ID from the log_meal result you received earlier in this conversation, or from the [id:xxx] in TODAY'S LOGGED MEALS. After updating, re-show the corrected full day breakdown.
10. REFRESH BEFORE SUGGESTING (CRITICAL): Before suggesting dinner or calculating remaining macros, ALWAYS call get_today_meals first to get the COMPLETE, up-to-date list of everything logged today. Do NOT rely solely on the TODAY'S LOGGED MEALS list above — it may be stale. The get_today_meals tool returns the live database state including meals logged in previous conversations. Use its totals for your remaining macro calculations.
11. MACRO-RELEVANT SUGGESTIONS ONLY: When suggesting meals to fill remaining macros, NEVER suggest recipes that don't meaningfully contribute to the user's goals. If they need 80g protein for dinner, do NOT suggest a 4g protein side dish as a dinner option. Every suggestion must have at least 20g protein per serving (or whatever macro the user is targeting). Filter aggressively.

SMART CATEGORY SEARCH (CRITICAL — filter by what the user asks for):
When the user asks for a specific type of food (e.g. "dessert", "soup", "snack", "seafood", "breakfast"):
1. ALWAYS call search_recipes FIRST with the category filter — do NOT just use a text query. You MUST search the database before EVER calling create_custom_recipe.
2. If the search returns 0-2 results for that category:
   a. Show whatever matches exist ("I found 1 dessert in our database...")
   b. Ask a clarifying question: "What kind of [category] are you thinking? Something chocolate, fruity, creamy, baked?"
   c. After they answer, call create_custom_recipe to generate a recipe that matches their request AND their dietary goals
3. If the user asks for something very specific (e.g. "Chick-fil-A style sandwich", "protein brownie", "keto cheesecake"):
   a. ALWAYS call search_recipes FIRST — there might be a match
   b. If no match or poor match, THEN call create_custom_recipe with their specific request
4. ALWAYS honor the user's health goals when generating custom recipes (e.g. high-protein user gets high-protein dessert, not a regular one)
5. NEVER suggest non-matching categories — if they ask for dessert, do NOT show chicken or burgers
6. NEVER call create_custom_recipe without calling search_recipes first. This is a hard rule with NO exceptions.

RECIPE CONVERSATION DEPTH:
When discussing recipes or helping users cook, be a real cooking advisor — not a vending machine:
- After showing recipe results, ask follow-up questions: "Do you want a spicy or mild version?" "Would you prefer grilled or baked?" "Any ingredient swaps needed?"
- Offer customization: sauce choices, protein alternatives, side dish pairings, cooking method variations
- When a user picks a recipe, suggest complementary dishes or side options
- Share pro tips: "For extra crispy chicken, pat it dry before seasoning" or "Marinate for 30 min for best flavor"
- If the user mentions dietary needs, proactively suggest substitutions (e.g., "I can swap the cream for coconut milk to make it dairy-free")
- Think like a chef: build on the conversation, remember preferences mentioned earlier in the thread

INVENTORY-AWARE RECIPE SUGGESTIONS (CRITICAL):
After suggesting or discussing ANY specific recipe, ALWAYS call compare_recipe_ingredients with the recipe's ID to check what the user has vs what they're missing. Present the results clearly:
- Show which ingredients they already have (with a checkmark feel)
- Show which ingredients are missing
- Show the coverage percentage (e.g., "You have 7/10 ingredients")
- If items are missing, proactively ask: "Want me to add the missing items to your shopping list, or would you like to make it with substitutions?"
- If they have everything, celebrate: "Great news — you have everything you need! Ready to cook?"
This creates a seamless flow: suggest recipe → check inventory → offer shopping list → user confirms → items added.

WHEN THE USER PICKS A RECIPE (CRITICAL — full follow-through):
When the user selects a recipe (e.g., "let's do the stir fry", "option 2", "two servings of the stir fry"):
1. IMMEDIATELY call compare_recipe_ingredients to check what they have vs what's missing
2. If missing ingredients, present TWO options:
   a) "Want me to add the missing items to your shopping list?"
   b) "Or we can make it with substitutions — [suggest specific swaps from their inventory]"
3. Offer MACRO-BOOSTING TIPS specific to their remaining goals:
   - If they need more protein: "You could double the chicken breast to 8oz for an extra 25g protein"
   - If they need more protein: "Add a side of Greek yogurt as a sauce/dip for +15g protein"
   - If they need fewer calories: "Use cooking spray instead of oil to save ~120 cal"
   - Be specific with the numbers: "That would bring your dinner total to [X] cal, [Y]g protein — [Z]g short of your goal"
4. After they confirm the plan, call log_meal with the final nutrition values
5. NEVER just say "I've gathered the information" — always give a complete, actionable response

SHOPPING LIST SELECTION (CRITICAL — ALWAYS ASK WHICH LIST):
When the user confirms they want to add items to a shopping list, you MUST follow this flow:
1. FIRST call manage_shopping_list with action "view_lists" to get the user's existing lists
2. Present the options to the user:
   - Number each existing list (e.g., "1. Weekly Groceries (5 items), 2. Taco Night (3 items)")
   - Always include an option to "Create a new list"
3. WAIT for the user to choose before adding items
4. Once they choose:
   - If they pick an existing list: call add_missing_to_shopping_list with the listId
   - If they want a new list: call add_missing_to_shopping_list with a listName (no listId)
NEVER add items to a shopping list without asking which list first. NEVER auto-pick the first/most recent list.

DIRECT SHOPPING LIST CREATION:
When the user explicitly asks you to CREATE a new shopping list with specific items (e.g., "I need bell peppers, black beans, and corn — create a list for this"), follow this flow:
1. Ask: "What should I name this shopping list?"
2. WAIT for the user to provide a name
3. Call manage_shopping_list with action "create_list", listName = user's chosen name, and items = the parsed items array
4. Confirm: "Created '[name]' shopping list with N items: item1, item2, ..."
Do NOT skip asking for the list name. Do NOT create the list until the user provides a name.

SERVING SIZE CONVERSATION (ALWAYS ASK BEFORE ADDING TO MEAL PLAN):
When the user wants to add a recipe to their meal plan, ALWAYS ask about servings BEFORE calling add_meal_to_plan:
1. Present serving options conversationally:
   "How many servings would you like?"
   - 1 serving (just for tonight)
   - 2 servings (tonight + leftovers)
   - 4 servings (meal prep for the week)
   - Custom amount
2. If the user picks more than 1 serving, include a meal prep tip from the tool response
3. After adding, show the scaled nutrition totals (e.g., "That's 900 calories total for 2 servings")
4. Then offer to check ingredients: "Want me to check what ingredients you need?"
This creates the flow: suggest recipe → ask servings → add to plan → check inventory → offer shopping list.

SMART SHOPPING LIST (MULTI-RECIPE QUANTITY AGGREGATION):
When the user adds multiple recipes to a meal plan or asks about ingredients for multiple recipes:
1. Ask how many servings of each recipe they want
2. Call generate_smart_shopping_list with recipeIds and servings map
3. Present results clearly showing:
   - Items they need to buy (with quantities and reasons like "Have 0.5 lbs, need 1.25 lbs total")
   - Items they already have enough of
   - Cross-recipe aggregation details (e.g., "Chicken breast: 1.75 lbs total — 1 lb for Chicken Sandwich + 0.75 lbs for Chipotle Bowl")
4. Ask: "Should I create a shopping list with these N items?"
5. If yes, call generate_smart_shopping_list again with saveToDB=true, or use add_missing_to_shopping_list

INVENTORY FRESHNESS VALIDATION (LIGHT TOUCH — don't be annoying):
Only validate items that are ACTUALLY expiring (within 1-2 days) or explicitly flagged. Do NOT ask about every item just because it was added a week ago — pantry staples and frozen items last a long time.
- Only ask about perishables (meat, dairy, produce) that are past their expiration date or within 1 day of expiring
- NEVER ask about dry goods, spices, oils, canned items, or frozen items
- Keep it brief: "Quick check — your chicken breast expires tomorrow. Still good?" (one line, not a bulleted list)
- If nothing is actually expiring, skip validation entirely and assume items are available

NATURAL LANGUAGE INVENTORY INPUT (CRITICAL — ALWAYS ASK BEFORE ADDING):
When a user mentions food items they bought or want to add, you MUST ask clarifying questions BEFORE adding anything to inventory. NEVER add generic items like "chicken" or "rice" — always get specifics first.

REQUIRED FLOW:
1. Call parse_natural_inventory_input to identify the items mentioned
2. For EACH item that is vague or generic, ask clarifying questions ONE item at a time:
   a. SPECIFIC TYPE: "chicken" → ask "What kind? Breasts, thighs, wings, ground, or whole?"
      "rice" → ask "What type? White, brown, jasmine, or basmati?"
      "milk" → ask "What kind? Whole, 2%, skim, oat, or almond?"
   b. QUANTITY: If not specified, ask "How much?" with example options (pounds, pieces, bags, gallons)
   c. STORAGE: For items where it's ambiguous (e.g. chicken could be fridge or freezer), ask "Fridge or freezer?"
3. Work through items conversationally — ask about one item, get the answer, then move to the next
4. Only call bulk_add_inventory AFTER all items have been fully specified
5. After adding, confirm with a summary: "Added to your inventory: ✓ Chicken breast - 2 lbs (fridge) ✓ White rice - 2 bags (pantry)"

EXAMPLES:
- User: "I bought chicken" → You: "What kind of chicken? Breasts, thighs, wings, ground, or whole?"
- User: "Breasts" → You: "How much chicken breast? (pounds, pieces, or packages)"
- User: "2 pounds" → You: "Fridge or freezer?" → User: "Fridge" → NOW add to inventory

- User: "I bought chicken, rice, and onions" → Start with first item: "Let me get the details! What kind of chicken? Breasts, thighs, wings, ground, or whole?"

NEVER skip the clarifying questions. NEVER add items with just generic names.

SALE-AWARE MEAL PLANNING:
When the user asks about deals, budget meals, what's on sale, or saving money on groceries:
1. Call get_sale_items to get current deals at the nearest store
2. Cross-reference sale items with the recipe database
3. Suggest 2-3 recipes that use the most sale items
4. Show estimated savings vs regular prices
5. Offer to create a meal plan around the deals

RECIPE COST ESTIMATION:
When the user asks how much a recipe costs or wants budget information:
1. Call estimate_recipe_cost with the recipe ID (and lat/lng if available)
2. Present the total cost and per-serving breakdown
3. Highlight which ingredients are estimated vs live-priced
4. If cost seems high, suggest cheaper alternatives or substitutions

If the user asks something outside of food/cooking/nutrition, politely redirect the conversation.`;

  if (context.preferences) {
    prompt += `\n\nUser dietary preferences: ${context.preferences}`;
  }
  if (context.inventorySummary) {
    prompt += `\n\nUser's current inventory summary: ${context.inventorySummary}`;
  }
  if (context.healthGoals) {
    prompt += `\n\nThe user has these active health goals: ${context.healthGoals}
Factor these into your recipe suggestions, meal plans, and cooking advice.
For example, if they have a "high-protein" goal, prioritize protein-rich ingredients and recipes.
When suggesting ingredients, prefer options that match the user's dietary goals.`;
  }

  if (context.remainingMacros) {
    const rm = context.remainingMacros;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const hour = now.getHours();
    const timeOfDay = hour < 11 ? 'morning' : hour < 15 ? 'afternoon' : hour < 18 ? 'late afternoon' : 'evening';

    prompt += `\n\nCURRENT TIME: ${timeStr} (${timeOfDay})`;

    // Show today's logged meals
    if (context.todayMeals && context.todayMeals.length > 0) {
      const mealList = context.todayMeals.map(m =>
        `- [id:${m.id}] ${m.mealType}: ${m.mealName} (${m.calories} cal, ${m.protein}g protein)`
      ).join('\n');
      prompt += `\n\nTODAY'S LOGGED MEALS:\n${mealList}`;
    } else {
      prompt += `\n\nTODAY'S LOGGED MEALS: None logged yet.`;
    }

    prompt += `\n\nMACRO-AWARE MEAL SUGGESTIONS (USER HAS TRACKING ON):
The user's REMAINING daily targets (after logged meals above): ${rm.calories} calories, ${rm.protein}g protein, ${rm.carbs}g carbs, ${rm.fat}g fat.

CRITICAL RULES:
1. ALWAYS use these remaining targets when the user asks "how much do I need for dinner/lunch/etc." — these numbers ALREADY account for logged meals.
2. If the user says they already logged something, reference the logged meals above — do NOT say you can't find them.
3. When the user describes a meal they're about to eat, estimate its nutrition, subtract from remaining targets, and tell them what they still need.
4. Be time-of-day aware: if it's afternoon and only breakfast is logged, ask "I see breakfast is logged but no lunch — have you eaten anything else today, or should I just factor in your planned lunch?"

INVENTORY-FIRST SUGGESTIONS (CRITICAL — always check inventory before suggesting):
When the user asks "what should I have for dinner?" or similar:
1. FIRST call get_inventory to see what they have on hand
2. THEN call search_recipes to find recipes that match their inventory + remaining macro needs. Do multiple searches if needed (e.g. search "chicken", "beef", "eggs" based on what's in inventory)
3. For EACH suggested recipe, call compare_recipe_ingredients to check coverage BEFORE presenting it
4. ONLY suggest recipes from the database (with real IDs). NEVER invent recipe names without database entries — if you want to suggest something custom, call create_custom_recipe first so it gets a real ID. Every recipe you mention MUST have a database ID for follow-through to work.
5. Present 2-3 concrete options with serving math already calculated. Format like:

   "Here's what I'd suggest based on what you have:

   1. **Chicken Stir-Fry** (10 min prep, you have 8/10 ingredients)
      - 1 serving: 45g protein, 520 cal
      - 2 servings: 90g protein, 1040 cal — almost hits your 93g target
      - Missing: soy sauce, sesame oil

   2. **High Protein Smash Burger** (10 min prep, you have 6/8 ingredients)
      - 1 serving: 52g protein, 620 cal — plus a protein snack gets you to 93g
      - Missing: lettuce, pickles

   Are you trying to hit your protein in one big dinner, or would you rather a lighter meal + a snack? What sounds good?"

6. ALWAYS include prep/cook time so the user can judge what's easiest
7. Prioritize recipes where the user has MOST ingredients and SHORTEST cook time — show highest coverage first
8. If ALL database recipes have <50% ingredient coverage, call create_custom_recipe to make 1-2 recipes using the user's actual inventory items

FOLLOW-UP SELECTION (CRITICAL — stick to your suggestions):
When the user responds with "whatever is easiest", "the first one", "option 2", or similar:
- Pick from the options YOU ALREADY PRESENTED — do NOT search for new recipes
- "Easiest" = shortest total time + most ingredients on hand
- "Cheapest" = fewest missing ingredients
- Immediately proceed with that recipe — show the quick steps and offer to log it
- Do NOT re-suggest or re-search. The user already saw the options and made a choice.

SERVING SIZE AWARENESS FOR MACRO TARGETS:
When presenting recipes, ALWAYS pre-calculate the serving math:
- Show both 1-serving and 2-serving nutrition side by side
- If 2 servings overshoots significantly, suggest 1 serving + a specific snack
- Example: "1 serving (45g protein) + 2 hard-boiled eggs from your fridge (12g) + a protein bar (25g) = 82g — close enough!"

SNACK SUGGESTIONS (ALWAYS INCLUDE WITH DINNER OPTIONS):
When suggesting dinner to fill remaining macros, present a "dinner only" vs "dinner + snack" path:
- "Option A (all-in dinner): 2 servings of Chicken Bowl = 96g protein, 1040 cal"
- "Option B (dinner + snack): 1 serving (48g protein) + Greek yogurt with almonds (~20g) + a beef stick (~10g) = 78g"
- Prioritize snacks from their inventory first (e.g., "You have eggs and Greek yogurt — easy protein snacks")
- Common high-protein snacks: Greek yogurt (15-20g), protein bar (20-25g), cottage cheese (14g/½ cup), string cheese (7g), hard-boiled eggs (6g each), almonds (6g/handful), beef jerky (10g/oz)

AUTOMATIC MEAL LOGGING (CRITICAL — when macro tracking is ON):
A) When the user says "I'm making", "I made", "I had", "I ate", or "I just had" something:
   1. Estimate the FULL nutrition by breaking down each component (e.g. "1 cup Fairlife: ~80 cal, 13g protein, 6g carbs, 2.5g fat; 1 scoop protein powder: ~120 cal, 24g protein, 3g carbs, 1g fat")
   2. You MUST estimate ALL FOUR macros: protein, carbs, fat, AND calories. NEVER leave carbs or fat as null. Use the Atwater formula to verify: calories = (protein × 4) + (carbs × 4) + (fat × 9)
   3. IMMEDIATELY call log_meal with ALL values (description, mealType, calories, protein, carbs, fat) — do NOT ask for permission first. The user told you they're eating it, so log it. NEVER omit carbs or fat.
   4. Infer meal type from time of day (morning=breakfast, midday=lunch, evening=dinner) or context.
   5. After logging, your response MUST follow this EXACT structure:
      a) Confirm the log: "Logged your [meal name] as [lunch] — [X] cal, [Y]g protein."
      b) Show FULL day breakdown (rule #8) — include ALL previously logged meals from TODAY'S LOGGED MEALS above:
         "Here's your day so far:
         - Breakfast: [name] — [X] cal, [Y]g protein
         - Lunch: [name] — [X] cal, [Y]g protein (just logged)
         - **Total**: [A] cal, [B]g protein
         - **Remaining**: [Z] cal, [W]g protein"
      c) THEN if the user also asked about another meal (e.g., "what should I have for dinner"), proceed to suggestions
   6. This is the DEFAULT behavior — always log it. The user can edit or delete from the UI if they want to change it.
   7. NEVER skip the day breakdown. NEVER omit previously logged meals. The user wants to see their FULL picture.

B) After discussing, suggesting, or showing a specific recipe from the database:
   1. Present the recipe's nutrition info
   2. Ask: "Want me to log one serving to your [meal type] today?"
   3. If they confirm, call log_meal with the recipe's nutrition values

For case A, NEVER ask "want me to log this?" — just do it. For case B, ask first since they haven't committed to eating it yet.

LEFTOVER PLANNING:
If the recipe makes multiple servings, also offer:
"This makes [N] servings — want me to add the leftovers to tomorrow's meal plan?"
If they confirm, call add_meal_to_plan for tomorrow with the remaining servings.`;
  }

  if (context.householdSize && context.householdSize > 1) {
    prompt += `\n\nHOUSEHOLD SIZE: The user typically cooks for ${context.householdSize} people. Default serving suggestions to ${context.householdSize} unless they specify otherwise.`;
  }

  if (context.krogerStore) {
    prompt += `\n\nKROGER-POWERED SHOPPING:
The user's preferred store is ${context.krogerStore}.
When the user wants to add items to their shopping list:
1. Call kroger_product_search with all requested items
2. Present 2-3 options per item with prices and sizes
3. Mark goal-aligned options with a star and explain why (e.g., "Fits your high-protein goal")
4. Wait for user to choose
5. Then call manage_shopping_list to add the selected products
If the user says "just add them" or "best value for all", pick the best-value or goal-aligned option for each.`;
  } else {
    prompt += `\n\nKROGER SHOPPING (NOT SET UP):
The user has not set a Kroger store yet. When they ask to add items to their shopping list, add items by name using manage_shopping_list. Suggest they visit the Shopping tab to enable Kroger product search with real prices.`;
  }

  return prompt;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserContext {
  preferences?: string;
  inventorySummary?: string;
  healthGoals?: string;
  krogerStore?: string;
  remainingMacros?: { calories: number; protein: number; carbs: number; fat: number };
  todayMeals?: Array<{ id: string; mealType: string; mealName: string; calories: number; protein: number }>;
  householdSize?: number;
}

interface ChatOrchestrationResult {
  content: string;
  toolCalls: Array<{
    name: string;
    args: Record<string, any>;
    result: any;
  }>;
  metadata: Record<string, any>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

// ─── Context Loader ─────────────────────────────────────────────────────────

async function loadUserContext(userId: string): Promise<UserContext> {
  const context: UserContext = {};

  try {
    // Load user preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (user?.preferences) {
      context.preferences = user.preferences;
      // Parse Kroger location and other prefs from preferences JSON
      try {
        const prefs = JSON.parse(user.preferences);
        if (prefs.krogerLocation) {
          const loc = prefs.krogerLocation;
          context.krogerStore = `${loc.chain} at ${loc.address} (ID: ${loc.locationId})`;
        }
        if (prefs.householdSize && prefs.householdSize > 1) {
          context.householdSize = prefs.householdSize;
        }
        // Compute remaining macros if macro tracking is on
        if (prefs.macroTracking) {
          const goals = await prisma.healthGoal.findMany({
            where: { userId, isActive: true, goalType: { in: ['calories', 'protein', 'carbs', 'fat'] } },
            select: { goalType: true, targetValue: true },
          });
          if (goals.length > 0) {
            // Use UTC midnight range since mealDate is stored as YYYY-MM-DDT00:00:00.000Z
            const now = new Date();
            const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const dayEnd = new Date(dayStart);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

            const todayLogs = await prisma.mealLog.findMany({
              where: { userId, mealDate: { gte: dayStart, lt: dayEnd } },
              select: { id: true, mealType: true, mealName: true, calories: true, proteinGrams: true, carbsGrams: true, fatGrams: true },
            });

            const eaten = todayLogs.reduce((acc, log) => ({
              calories: acc.calories + (log.calories || 0),
              protein: acc.protein + (log.proteinGrams || 0),
              carbs: acc.carbs + (log.carbsGrams || 0),
              fat: acc.fat + (log.fatGrams || 0),
            }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

            const targets: Record<string, number> = {};
            for (const g of goals) targets[g.goalType] = g.targetValue;

            context.remainingMacros = {
              calories: Math.max(0, (targets.calories || 0) - eaten.calories),
              protein: Math.max(0, (targets.protein || 0) - eaten.protein),
              carbs: Math.max(0, (targets.carbs || 0) - eaten.carbs),
              fat: Math.max(0, (targets.fat || 0) - eaten.fat),
            };

            // Attach today's individual meals for the system prompt
            context.todayMeals = todayLogs.map(l => ({
              id: l.id,
              mealType: (l as any).mealType || 'unknown',
              mealName: (l as any).mealName || 'Unnamed',
              calories: l.calories || 0,
              protein: l.proteinGrams || 0,
            }));
          }
        }
      } catch {}
    }

    // Load inventory summary (just item names + expiry)
    const items = await prisma.inventoryItem.findMany({
      where: { userId },
      select: { name: true, expiresAt: true, storageLocation: true },
      take: 30,
    });

    if (items.length > 0) {
      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const expiring = items.filter((i) => i.expiresAt && new Date(i.expiresAt) <= threeDays);

      const itemsByLocation: Record<string, string[]> = {};
      for (const i of items) {
        const loc = i.storageLocation || 'other';
        if (!itemsByLocation[loc]) itemsByLocation[loc] = [];
        itemsByLocation[loc].push(i.name);
      }
      const locationSummaries = Object.entries(itemsByLocation)
        .map(([loc, names]) => `${loc}: ${names.join(', ')}`)
        .join('; ');

      context.inventorySummary =
        `${items.length} items — ${locationSummaries}` +
        (expiring.length > 0
          ? `. EXPIRING SOON: ${expiring.map((i) => i.name).join(', ')}`
          : '');
    }

    // Load active health goals
    const goals = await prisma.healthGoal.findMany({
      where: { userId, isActive: true },
      select: { goalType: true, targetValue: true },
    });
    if (goals.length > 0) {
      context.healthGoals = goals.map(g => `${g.goalType}: ${g.targetValue}`).join(', ');
    }
  } catch (err) {
    console.error('Error loading user context:', err);
  }

  return context;
}

// ─── Load Conversation History ──────────────────────────────────────────────

async function loadThreadHistory(
  threadId: string,
  limit = 20
): Promise<ChatCompletionMessageParam[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { role: true, message: true },
  });

  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.message,
  }));
}

// ─── Main Chat Orchestration (non-streaming) ────────────────────────────────

export async function chatOrchestrate(
  userMessage: string,
  userId: string,
  threadId: string
): Promise<ChatOrchestrationResult> {
  // Load context + history
  const [context, history] = await Promise.all([
    loadUserContext(userId),
    loadThreadHistory(threadId),
  ]);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const toolCallResults: ChatOrchestrationResult['toolCalls'] = [];
  const allMetadata: Record<string, any> = {};

  // Fallback mode when no API key
  if (!process.env.OPENAI_API_KEY) {
    return fallbackResponse(userMessage, userId);
  }

  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  // Tool execution loop
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: toolDefinitions,
      tool_choice: round === 0 ? 'auto' : 'auto',
      temperature: 0.7,
      max_tokens: 2000,
    });

    const choice = response.choices[0];
    if (response.usage) {
      totalUsage.promptTokens += response.usage.prompt_tokens;
      totalUsage.completionTokens += response.usage.completion_tokens;
      totalUsage.totalTokens += response.usage.total_tokens;
    }

    // If the model wants to call tools
    if (choice.finish_reason === 'tool_calls' || choice.message.tool_calls?.length) {
      // Add assistant message with tool calls
      messages.push(choice.message);

      // Execute each tool call
      for (const toolCall of choice.message.tool_calls || []) {
        const fn = (toolCall as any).function;
        const fnName: string = fn.name;
        let fnArgs: Record<string, any>;
        try {
          fnArgs = JSON.parse(fn.arguments);
        } catch {
          fnArgs = {};
        }

        console.log(`🔧 Executing tool: ${fnName}`, fnArgs);
        const toolResult = await executeTool(fnName, fnArgs, userId);
        console.log(`✅ Tool ${fnName} returned ${JSON.stringify(toolResult.result).length} chars`);

        toolCallResults.push({
          name: fnName,
          args: fnArgs,
          result: toolResult.result,
        });

        if (toolResult.metadata) {
          Object.assign(allMetadata, toolResult.metadata);
        }

        // Feed tool result back to GPT
        const toolMessage: ChatCompletionToolMessageParam = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult.result),
        };
        messages.push(toolMessage);
      }

      // Continue loop — GPT will process tool results and either call more tools or respond
      continue;
    }

    // No tool calls — return final text response
    return {
      content: choice.message.content || "I'm not sure how to help with that. Could you rephrase?",
      toolCalls: toolCallResults,
      metadata: allMetadata,
      usage: totalUsage,
    };
  }

  // If we hit max rounds, return whatever we have
  return {
    content: "I've gathered the information. Let me know if you need anything else!",
    toolCalls: toolCallResults,
    metadata: allMetadata,
    usage: totalUsage,
  };
}

// ─── Streaming Chat Orchestration ───────────────────────────────────────────

export async function chatOrchestrateStream(
  userMessage: string,
  userId: string,
  threadId: string,
  onToken: (token: string) => void,
  onToolCall: (name: string, args: any) => void,
  onToolResult: (name: string, result: any) => void
): Promise<ChatOrchestrationResult> {
  const [context, history] = await Promise.all([
    loadUserContext(userId),
    loadThreadHistory(threadId),
  ]);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const toolCallResults: ChatOrchestrationResult['toolCalls'] = [];
  const allMetadata: Record<string, any> = {};

  if (!process.env.OPENAI_API_KEY) {
    const fallback = await fallbackResponse(userMessage, userId);
    onToken(fallback.content);
    return fallback;
  }

  let fullContent = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: toolDefinitions,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    // Accumulate streamed response
    let currentContent = '';
    const pendingToolCalls: Map<
      number,
      { id: string; name: string; argsStr: string }
    > = new Map();
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      finishReason = chunk.choices[0]?.finish_reason || finishReason;

      // Stream content tokens
      if (delta?.content) {
        currentContent += delta.content;
        onToken(delta.content);
      }

      // Accumulate tool calls
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = pendingToolCalls.get(tc.index);
          if (existing) {
            if (tc.function?.arguments) existing.argsStr += tc.function.arguments;
          } else {
            pendingToolCalls.set(tc.index, {
              id: tc.id || '',
              name: tc.function?.name || '',
              argsStr: tc.function?.arguments || '',
            });
          }
        }
      }
    }

    fullContent += currentContent;

    // If there were tool calls, execute them
    if (pendingToolCalls.size > 0) {
      // Build assistant message with tool calls for the conversation
      const assistantToolCalls = Array.from(pendingToolCalls.values()).map(
        (tc, idx) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.argsStr },
        })
      );

      messages.push({
        role: 'assistant',
        content: currentContent || null,
        tool_calls: assistantToolCalls,
      });

      // Execute each tool
      for (const tc of pendingToolCalls.values()) {
        let fnArgs: Record<string, any>;
        try {
          fnArgs = JSON.parse(tc.argsStr);
        } catch {
          fnArgs = {};
        }

        console.log(`🔧 [stream] Executing tool: ${tc.name}`, fnArgs);
        onToolCall(tc.name, fnArgs);

        const toolResult = await executeTool(tc.name, fnArgs, userId);
        console.log(`✅ [stream] Tool ${tc.name} done`);

        toolCallResults.push({
          name: tc.name,
          args: fnArgs,
          result: toolResult.result,
        });

        if (toolResult.metadata) {
          Object.assign(allMetadata, toolResult.metadata);
        }

        onToolResult(tc.name, toolResult.result);

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult.result),
        });
      }

      continue; // Next round — GPT processes tool results
    }

    // No tool calls — done
    return {
      content: fullContent || "I'm not sure how to help with that.",
      toolCalls: toolCallResults,
      metadata: allMetadata,
    };
  }

  return {
    content: fullContent || "I've gathered the information.",
    toolCalls: toolCallResults,
    metadata: allMetadata,
  };
}

// ─── Fallback (no API key) ──────────────────────────────────────────────────

async function fallbackResponse(
  message: string,
  userId: string
): Promise<ChatOrchestrationResult> {
  const lower = message.toLowerCase();
  const toolCallResults: ChatOrchestrationResult['toolCalls'] = [];
  const metadata: Record<string, any> = {};

  // Try to handle common intents with tools
  if (
    lower.includes('recipe') ||
    lower.includes('cook') ||
    lower.includes('make') ||
    lower.includes('eat')
  ) {
    const result = await executeTool(
      'search_recipes',
      { query: message, limit: 3 },
      userId
    );
    toolCallResults.push({ name: 'search_recipes', args: { query: message }, result: result.result });
    if (result.metadata) Object.assign(metadata, result.metadata);

    const recipes = result.result.recipes || [];
    if (recipes.length > 0) {
      const list = recipes
        .map(
          (r: any) =>
            `- **${r.title}** (${r.difficulty}, ${(r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0)} min)`
        )
        .join('\n');

      // Auto-check inventory for the first recipe (Enhancement A)
      const firstRecipe = recipes[0];
      let inventoryNote = '';
      if (firstRecipe?.id) {
        const compareResult = await executeTool('compare_recipe_ingredients', { recipeId: firstRecipe.id }, userId);
        toolCallResults.push({ name: 'compare_recipe_ingredients', args: { recipeId: firstRecipe.id }, result: compareResult.result });
        if (compareResult.metadata) Object.assign(metadata, compareResult.metadata);

        const comp = compareResult.result;
        if (comp.missing && comp.missing.length > 0) {
          const haveList = comp.have?.length > 0
            ? comp.have.map((i: any) => i.name).join(', ')
            : 'none';
          const missList = comp.missing.map((i: any) => i.name).join(', ');
          inventoryNote = `\n\n**Inventory Check for "${comp.recipeTitle}"** (${comp.coveragePercent}% coverage):\n- Have: ${haveList}\n- Missing: ${missList}\n\nWant me to add the missing items to your shopping list?`;
        } else if (comp.have && comp.have.length > 0) {
          inventoryNote = `\n\n**Great news!** You have all ${comp.totalIngredients} ingredients for "${comp.recipeTitle}". Ready to cook!`;
        }
      }

      return {
        content: `Here are some recipes I found:\n\n${list}${inventoryNote}\n\n*Note: AI features are in demo mode. Configure an OpenAI API key for full conversational capabilities.*`,
        toolCalls: toolCallResults,
        metadata,
      };
    }
  }

  // Direct shopping list creation: "create a list called X" or "name it X"
  if ((lower.includes('create') || lower.includes('make') || lower.includes('new')) && lower.includes('list') && !lower.includes('meal plan')) {
    // Check if there are items mentioned along with the request
    const parseResult = await executeTool('parse_natural_inventory_input', { text: message }, userId);
    const parsedItems = parseResult.result?.parsedItems || [];

    if (parsedItems.length > 0) {
      // User mentioned items + create list — ask for name
      const itemNames = parsedItems.map((i: any) => i.name).join(', ');
      return {
        content: `I see ${parsedItems.length} item(s): ${itemNames}. What should I name this shopping list?\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
        toolCalls: [{ name: 'parse_natural_inventory_input', args: { text: message }, result: parseResult.result }],
        metadata: {},
      };
    } else {
      return {
        content: `What should I name this shopping list? And what items would you like to add?\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
        toolCalls: [],
        metadata: {},
      };
    }
  }

  // Kroger-aware shopping list add in fallback mode
  if ((lower.includes('add') || lower.includes('put')) && lower.includes('shopping list') && !lower.includes('create')) {
    // Try kroger_product_search first if user has a store set
    const krogerResult = await executeTool('kroger_product_search', { items: [message.replace(/add|put|to|my|shopping|list/gi, '').trim()] }, userId);
    if (krogerResult.result?.results?.length > 0 && !krogerResult.result.error) {
      toolCallResults.push({ name: 'kroger_product_search', args: { items: [message] }, result: krogerResult.result });
      const results = krogerResult.result.results;
      let response = `Here's what I found at ${krogerResult.result.storeName}:\n\n`;
      for (const r of results) {
        response += `**${r.query}:**\n`;
        for (let i = 0; i < r.products.length; i++) {
          const p = r.products[i];
          const sale = p.onSale ? ' (SALE)' : '';
          const goal = p.goalAligned ? ` ⭐ ${p.goalReason}` : '';
          response += `${i + 1}. ${p.name} — ${p.size} — $${p.price.toFixed(2)}${sale}${goal}\n`;
        }
        response += '\n';
      }
      response += `Which would you like? (e.g., "1" or "best value")\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`;
      return { content: response, toolCalls: toolCallResults, metadata };
    }
  }

  if (lower.includes('add') && (lower.includes('shopping') || lower.includes('list') || lower.includes('missing'))) {
    // First, show the user their available lists so they can choose
    const listsResult = await executeTool('manage_shopping_list', { action: 'view_lists' }, userId);
    toolCallResults.push({ name: 'manage_shopping_list', args: { action: 'view_lists' }, result: listsResult.result });

    const lists = listsResult.result?.lists || [];

    // Check if the message specifies a list number (e.g., "add to list 1", "list 2")
    const listNumMatch = lower.match(/list\s*(\d+)/);
    const selectedIndex = listNumMatch ? parseInt(listNumMatch[1]) - 1 : -1;

    if (lists.length > 0 && selectedIndex >= 0 && selectedIndex < lists.length) {
      // User selected a specific list — find missing items and add
      const selectedList = lists[selectedIndex];
      const recentRecipe = await prisma.recipe.findFirst({
        where: { isPublished: true },
        orderBy: { averageRating: 'desc' },
        select: { id: true, title: true },
      });

      if (recentRecipe) {
        const compareResult = await executeTool('compare_recipe_ingredients', { recipeId: recentRecipe.id }, userId);
        const missing = compareResult.result?.missing || [];
        if (missing.length > 0) {
          const addResult = await executeTool('add_missing_to_shopping_list', {
            items: missing.map((i: any) => ({ name: i.name, quantity: i.amount, unit: i.unit })),
            listId: selectedList.id,
          }, userId);
          toolCallResults.push({ name: 'add_missing_to_shopping_list', args: { items: missing, listId: selectedList.id }, result: addResult.result });
          if (addResult.metadata) Object.assign(metadata, addResult.metadata);

          return {
            content: addResult.result.message + `\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
            toolCalls: toolCallResults,
            metadata,
          };
        }
      }
    }

    // Show list options to user
    if (lists.length > 0) {
      const listOptions = lists.map((l: any, i: number) =>
        `${i + 1}. **${l.name}** (${l.itemCount} item${l.itemCount !== 1 ? 's' : ''})`
      ).join('\n');

      return {
        content: `Which shopping list should I add the items to?\n\n${listOptions}\n${lists.length + 1}. **Create a new list**\n\nJust say the number or list name!\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
        toolCalls: toolCallResults,
        metadata,
      };
    } else {
      // No lists — create one and add items
      const recentRecipe = await prisma.recipe.findFirst({
        where: { isPublished: true },
        orderBy: { averageRating: 'desc' },
        select: { id: true, title: true },
      });

      if (recentRecipe) {
        const compareResult = await executeTool('compare_recipe_ingredients', { recipeId: recentRecipe.id }, userId);
        const missing = compareResult.result?.missing || [];
        if (missing.length > 0) {
          const addResult = await executeTool('add_missing_to_shopping_list', {
            items: missing.map((i: any) => ({ name: i.name, quantity: i.amount, unit: i.unit })),
            listName: `Ingredients for ${recentRecipe.title}`,
          }, userId);
          toolCallResults.push({ name: 'add_missing_to_shopping_list', args: { items: missing }, result: addResult.result });
          if (addResult.metadata) Object.assign(metadata, addResult.metadata);

          return {
            content: addResult.result.message + `\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
            toolCalls: toolCallResults,
            metadata,
          };
        }
      }
    }
  }

  // Natural language inventory input — ask clarifying questions before adding
  if (lower.includes('bought') || lower.includes('got') || lower.includes('picked up') ||
      (lower.includes('add') && (lower.includes('inventory') || lower.includes('fridge') || lower.includes('pantry') || lower.includes('freezer'))) ||
      lower.match(/^i have \w+.*(,| and )/)) {
    const parseResult = await executeTool('parse_natural_inventory_input', { text: message }, userId);
    toolCallResults.push({ name: 'parse_natural_inventory_input', args: { text: message }, result: parseResult.result });

    const parsed = parseResult.result;
    if (parsed.parsedItems?.length > 0) {
      // Build clarifying questions for each item
      const firstItem = parsed.parsedItems[0];
      const itemName = firstItem.name.toLowerCase();

      // Determine what clarification is needed
      const typeOptions: Record<string, string> = {
        chicken: 'Breasts, thighs, wings, ground, or whole?',
        beef: 'Ground, steak, stew meat, or roast?',
        pork: 'Chops, tenderloin, ground, or bacon?',
        fish: 'Salmon, tilapia, cod, or tuna?',
        rice: 'White, brown, jasmine, or basmati?',
        milk: 'Whole, 2%, skim, oat, or almond?',
        bread: 'White, wheat, sourdough, or multigrain?',
        cheese: 'Cheddar, mozzarella, parmesan, or swiss?',
        pasta: 'Spaghetti, penne, fettuccine, or macaroni?',
      };

      const typeQuestion = typeOptions[itemName];
      const needsQuantity = !firstItem.quantity || firstItem.quantity <= 1;
      const totalItems = parsed.parsedItems.length;

      let question = `Great${totalItems > 1 ? ` — I see ${totalItems} items` : ''}! Let me get the details.\n\n`;
      if (typeQuestion) {
        question += `What kind of **${firstItem.name}**? ${typeQuestion}`;
      } else if (needsQuantity) {
        question += `How much **${firstItem.name}**? (e.g., 2 lbs, 3 pieces, 1 bag)`;
      } else {
        question += `Where should I store the **${firstItem.name}**? Fridge, freezer, or pantry?`;
      }

      question += `\n\n*AI is in demo mode. Configure an OpenAI API key for full conversational capabilities.*`;

      return {
        content: question,
        toolCalls: toolCallResults,
        metadata,
      };
    }
  }

  if (lower.includes('inventory') || lower.includes('fridge') || lower.includes('have')) {
    const result = await executeTool('get_inventory', { includeExpiring: true }, userId);
    toolCallResults.push({ name: 'get_inventory', args: {}, result: result.result });

    const inv = result.result;
    if (inv.totalItems > 0) {
      return {
        content: `You have ${inv.totalItems} items in your inventory.${
          inv.expiringSoon?.length
            ? ` ${inv.expiringSoon.length} item(s) expiring soon: ${inv.expiringSoon.map((i: any) => i.name).join(', ')}.`
            : ''
        }\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
        toolCalls: toolCallResults,
        metadata,
      };
    }
  }

  if (lower.includes('meal plan') || lower.includes('plan')) {
    // If user wants to create, actually create
    if (lower.includes('create') || lower.includes('make') || lower.includes('build') || lower.includes('generate') || lower.includes('set up')) {
      const result = await executeTool('create_meal_plan', { name: 'My Meal Plan', preferences: message }, userId);
      toolCallResults.push({ name: 'create_meal_plan', args: { name: 'My Meal Plan' }, result: result.result });
      if (result.metadata) Object.assign(metadata, result.metadata);

      const plan = result.result.plan;
      return {
        content: `I've created your meal plan **"${plan.name}"** with ${plan.totalMeals || 0} meals populated!\n\n${result.result.message}\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
        toolCalls: toolCallResults,
        metadata,
      };
    }

    const result = await executeTool('get_meal_plan', { weekOffset: 0 }, userId);
    toolCallResults.push({ name: 'get_meal_plan', args: {}, result: result.result });

    return {
      content: result.result.plan
        ? `Your current meal plan: **${result.result.plan.name}** with ${result.result.plan.slots.length} meals scheduled.`
        : "You don't have a meal plan for this week yet. Would you like me to create one? Just say \"create a meal plan\"!\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*",
      toolCalls: toolCallResults,
      metadata,
    };
  }

  if (lower.includes('nutrition') || lower.includes('calorie') || lower.includes('macro')) {
    const result = await executeTool('get_nutrition_summary', { range: 'day' }, userId);
    toolCallResults.push({ name: 'get_nutrition_summary', args: {}, result: result.result });

    const totals = result.result.totals;
    return {
      content: `Today's nutrition: ${totals.calories} calories, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fat}g fat (${result.result.mealCount} meals logged).\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
      toolCalls: toolCallResults,
      metadata,
    };
  }

  return {
    content:
      "Hi! I'm ChefMate, your cooking assistant. I can help you find recipes, plan meals, manage your pantry inventory, and track nutrition.\n\nTry asking me:\n- \"What can I cook tonight?\"\n- \"Show me healthy chicken recipes\"\n- \"What's in my inventory?\"\n- \"Plan my meals for the week\"\n\n*AI is in demo mode. Configure an OpenAI API key for full conversational capabilities.*",
    toolCalls: toolCallResults,
    metadata,
  };
}

// ─── Legacy Functions (kept for backward compatibility) ─────────────────────

interface RecipeGenerationParams {
  prompt: string;
  servings?: number;
  dietaryRestrictions?: string[];
  availableIngredients?: string[];
  maxTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface GeneratedRecipe {
  title: string;
  description: string;
  brand?: string;
  originalItem?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    notes?: string;
    isOptional?: boolean;
  }>;
  instructions: Array<{
    step: number;
    text: string;
    time?: number;
    tips?: string;
  }>;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar?: number;
  };
  originalNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar?: number;
  };
  dietaryTags: string[];
  tips?: string[];
  substitutions?: Array<{
    ingredient: string;
    alternatives: string[];
  }>;
}

export const generateRecipe = async (params: RecipeGenerationParams): Promise<GeneratedRecipe> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured.');
  }

  const systemPrompt = `You are ChefMate, a professional chef and nutritionist specializing in creating healthier versions of popular fast food items. Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Create a healthier version of: "${params.prompt}"
Requirements: Servings: ${params.servings || 2}, Dietary: ${params.dietaryRestrictions?.join(', ') || 'none'}, Max time: ${params.maxTime || 45} min, Difficulty: ${params.difficulty || 'any'}

Return JSON with: title, description, brand, originalItem, prepTime, cookTime, servings, difficulty, ingredients[], instructions[], nutrition{}, originalNutrition{}, dietaryTags[], tips[], substitutions[].`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    const recipe = JSON.parse(content) as GeneratedRecipe;
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe structure');
    }
    return recipe;
  } catch (error) {
    console.error('Recipe generation error:', error);
    return generateFallbackRecipe(params.prompt);
  }
};

export const chatWithAssistant = async (
  message: string,
  context?: { type: string; data: any }
): Promise<string> => {
  if (!process.env.OPENAI_API_KEY) {
    return "I'm ChefMate! AI features are in demo mode. Configure your OpenAI API key for full capabilities.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are ChefMate's cooking assistant. Be friendly, concise, practical. ${
            context ? `Context: ${context.type} - ${JSON.stringify(context.data)}` : ''
          }`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "I couldn't process your request.";
  } catch (error) {
    console.error('Chat error:', error);
    return 'Sorry, something went wrong. Please try again.';
  }
};

export const generateInventoryBasedSuggestions = async (
  inventoryItems: string[],
  expiringItems?: string[]
): Promise<string[]> => {
  if (!process.env.OPENAI_API_KEY) {
    return [
      'Quick stir-fry with available vegetables',
      'Simple pasta with pantry ingredients',
      'Protein bowl with available items',
    ];
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Generate practical meal suggestions as a JSON array.',
        },
        {
          role: 'user',
          content: `Ingredients: ${inventoryItems.join(', ')}${
            expiringItems ? `\nExpiring: ${expiringItems.join(', ')}` : ''
          }\n\nReturn: {"meals": ["meal1", ...]}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return parsed.meals || parsed;
    }
  } catch (error) {
    console.error('Inventory suggestions error:', error);
  }

  return [
    'Quick stir-fry with available vegetables',
    'Simple pasta with pantry ingredients',
    'Protein bowl with available items',
  ];
};

// Stub for food detection (requires GPT-4o vision API)
export const detectFoodItems = async (imageBase64: string): Promise<string[]> => {
  // In production, this would use GPT-4o vision to identify food items in a photo
  // For now, return mock detection results
  return ['chicken', 'broccoli', 'rice', 'soy sauce'];
};

// Fallback recipe
const generateFallbackRecipe = (prompt: string): GeneratedRecipe => ({
  title: `Healthy ${prompt} Recipe`,
  description: 'A nutritious homemade version.',
  prepTime: 15,
  cookTime: 25,
  servings: 2,
  difficulty: 'medium',
  ingredients: [
    { name: 'main protein', amount: 1, unit: 'lb', notes: 'lean option' },
    { name: 'vegetables', amount: 2, unit: 'cups', notes: 'mixed, chopped' },
    { name: 'whole grain base', amount: 1, unit: 'cup', notes: 'rice, quinoa, or pasta' },
  ],
  instructions: [
    { step: 1, text: 'Prepare all ingredients.', time: 10 },
    { step: 2, text: 'Cook protein until done.', time: 15 },
    { step: 3, text: 'Add vegetables, cook until tender.', time: 10 },
    { step: 4, text: 'Serve over grain base.', time: 2 },
  ],
  nutrition: { calories: 450, protein: 30, carbs: 40, fat: 15, fiber: 8, sodium: 600 },
  dietaryTags: ['homemade', 'balanced'],
  tips: ['Adjust seasonings to taste'],
});
