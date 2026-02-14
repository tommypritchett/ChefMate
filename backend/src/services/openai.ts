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

Be conversational, helpful, and concise. Use the available tools to look up real data instead of guessing. When showing recipes, include key details (cook time, calories, difficulty). When you mention recipes from the database, reference them by name.

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
      return {
        content: `Here are some recipes I found:\n\n${list}\n\n*Note: AI features are in demo mode. Configure an OpenAI API key for full conversational capabilities.*`,
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
    const result = await executeTool('get_meal_plan', { weekOffset: 0 }, userId);
    toolCallResults.push({ name: 'get_meal_plan', args: {}, result: result.result });

    return {
      content: result.result.plan
        ? `Your current meal plan: **${result.result.plan.name}** with ${result.result.plan.slots.length} meals scheduled.`
        : "You don't have a meal plan for this week yet. I can help you create one!\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*",
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
