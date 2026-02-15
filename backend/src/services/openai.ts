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
const MAX_TOOL_ROUNDS = 5;

// ─── System Prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(context: UserContext): string {
  let prompt = `You are ChefMate, a friendly AI cooking and nutrition assistant. You help users with:
- Finding and suggesting recipes
- Meal planning for the week
- Managing their food inventory
- Tracking nutrition and calories
- Generating shopping lists
- Cooking tips and technique guidance

IMPORTANT BEHAVIOR RULES:
1. ALWAYS USE TOOLS TO EXECUTE ACTIONS — do NOT just describe what you could do. If the user asks you to create a meal plan, CALL the create_meal_plan tool immediately. If they want to log a meal, CALL log_meal. Never say "I can create a plan for you" without actually calling the tool.
2. After executing a tool, summarize what you DID, not what you could do. Say "I've created your meal plan with these meals:" not "I could create a plan with...".
3. When creating meal plans, always call create_meal_plan with relevant preferences. The tool will auto-populate the plan with recipes from the database.
4. When the user asks to add a specific meal to a plan, call add_meal_to_plan to assign it.
5. Use real data from tools — never make up recipe names, nutrition info, or inventory contents.
6. When showing recipes, include key details (cook time, calories, difficulty). Reference recipes by their actual database names.

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
- If items are missing, proactively ask: "Want me to add the missing items to your shopping list?"
- When the user confirms, call add_missing_to_shopping_list with the missing items
- If they have everything, celebrate: "Great news — you have everything you need! Ready to cook?"
This creates a seamless flow: suggest recipe → check inventory → offer shopping list → user confirms → items added.

INVENTORY FRESHNESS VALIDATION:
When compare_recipe_ingredients returns items with needsValidation=true, ask the user about those specific items BEFORE confirming they're available:
- For items marked "expiring soon": "Your onions expire on Feb 15 — still good to use?"
- For items marked "added X days ago": "You added the chicken breast 4 days ago — do you still have it?"
- Group all validation questions into ONE message (don't ask one at a time)
- If user says "no" or "used it", treat that item as missing and include it in the shopping list
- If user says "yes" or doesn't respond to a specific item, keep it as available

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

If the user asks something outside of food/cooking/nutrition, politely redirect the conversation.`;

  if (context.preferences) {
    prompt += `\n\nUser dietary preferences: ${context.preferences}`;
  }
  if (context.inventorySummary) {
    prompt += `\n\nUser's current inventory summary: ${context.inventorySummary}`;
  }

  return prompt;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserContext {
  preferences?: string;
  inventorySummary?: string;
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

      context.inventorySummary =
        `${items.length} items` +
        (expiring.length > 0
          ? `. Expiring soon: ${expiring.map((i) => i.name).join(', ')}`
          : '');
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
      max_tokens: 1000,
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
      max_tokens: 1000,
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

  if (lower.includes('add') && (lower.includes('shopping') || lower.includes('list') || lower.includes('missing'))) {
    // User wants to add missing items to shopping list — find their most recent compare result
    // In fallback mode, we try to find the most recent recipe and compare
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
