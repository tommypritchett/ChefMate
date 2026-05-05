import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from 'openai/resources/chat/completions';
import { toolDefinitions, executeTool } from '../ai-tools';
import { openai, MODEL, MAX_TOOL_ROUNDS } from './client';
import type { ChatOrchestrationResult } from './types';
import { buildSystemPrompt } from './system-prompt';
import { loadUserContext, loadThreadHistory } from './context';
import { fallbackResponse } from './fallback';
import { getInventory } from '../tools/inventory-tools';

const WHAT_CAN_I_MAKE_PATTERNS = [
  'what can i make',
  'what can i cook',
  'recipes using what i have',
  'what should i cook',
  'what should i make',
  'what can i eat',
  'what to cook',
  'make with my food',
  'cook with my food',
  'cook with what i have',
  'make with what i have',
];

function isWhatCanIMakeIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return WHAT_CAN_I_MAKE_PATTERNS.some(p => lower.includes(p));
}

async function handleWhatCanIMake(
  userId: string,
  userMessage: string,
  onToken?: (token: string) => void,
): Promise<ChatOrchestrationResult> {
  // Fetch inventory and user context in parallel
  const [inventoryResult, context] = await Promise.all([
    getInventory({}, userId),
    loadUserContext(userId),
  ]);
  const items = inventoryResult.result.ingredientList || [];

  console.log('[what-can-i-make] Inventory for user:', items.join(', '));
  console.log('[what-can-i-make] User context:', { healthGoals: context.healthGoals, householdSize: context.householdSize, preferences: context.preferences?.substring(0, 100) });

  if (items.length < 3) {
    const msg = "Your kitchen inventory is pretty light — try adding items on the Inventory tab so I can suggest meals based on what you have!";
    onToken?.(msg);
    return { content: msg, toolCalls: [], metadata: {} };
  }

  // Build preference context string
  const prefParts: string[] = [];
  if (context.healthGoals) prefParts.push(`Health goals: ${context.healthGoals}`);
  if (context.householdSize && context.householdSize > 1) prefParts.push(`Household size: ${context.householdSize} people`);
  if (context.remainingMacros) {
    const rm = context.remainingMacros;
    prefParts.push(`Remaining macros today: ${rm.calories} cal, ${rm.protein}g protein, ${rm.carbs}g carbs, ${rm.fat}g fat`);
  }
  if (context.preferences) {
    try {
      const prefs = JSON.parse(context.preferences);
      if (prefs.dietaryRestrictions) prefParts.push(`Dietary restrictions: ${prefs.dietaryRestrictions}`);
      if (prefs.cookingSkill) prefParts.push(`Cooking skill: ${prefs.cookingSkill}`);
      if (prefs.dislikedIngredients) prefParts.push(`Dislikes: ${prefs.dislikedIngredients}`);
    } catch {}
  }
  const prefsStr = prefParts.length > 0 ? `\n\nUser preferences:\n${prefParts.join('\n')}` : '';

  const gptMessages = [
    {
      role: 'system' as const,
      content: `You are a helpful cooking assistant. The user wants to know what they can cook right now with what they have. Only suggest recipes where they already have ALL required ingredients. The only assumed pantry staples are water, salt, black pepper, and cooking oil — nothing else. Do not suggest recipes that need ingredients not in their list. If fewer than 3 recipes are possible, say so honestly. Use bullet points, not markdown headers. Do not show ingredient match counts. Keep it concise and conversational.${prefsStr ? ' Factor in the user preferences when suggesting meals — prioritize recipes that align with their goals.' : ''}`,
    },
    {
      role: 'user' as const,
      content: `Here is everything in my kitchen: ${items.join(', ')}.${prefsStr}\n\n${userMessage}`,
    },
  ];

  // Use streaming if onToken callback provided, otherwise non-streaming
  if (onToken) {
    const stream = await openai.chat.completions.create({
      model: MODEL, messages: gptMessages, temperature: 0.7, max_tokens: 1500, stream: true,
    });
    let fullContent = '';
    for await (const chunk of stream) {
      const t = chunk.choices[0]?.delta?.content;
      if (t) { fullContent += t; onToken(t); }
    }
    return { content: fullContent, toolCalls: [], metadata: {} };
  }

  const response = await openai.chat.completions.create({
    model: MODEL, messages: gptMessages, temperature: 0.7, max_tokens: 1500,
  });
  const content = response.choices[0]?.message?.content || "I'm not sure what to suggest. Try adding more items to your inventory!";
  return { content, toolCalls: [], metadata: {} };
}

export async function chatOrchestrate(
  userMessage: string,
  userId: string,
  threadId: string,
  contextType?: string,
  clientDate?: string
): Promise<ChatOrchestrationResult> {
  const startTime = Date.now();
  console.log(`⏱ [chat] Start: "${userMessage.substring(0, 60)}..."`);

  // Load context + history
  const [context, history] = await Promise.all([
    loadUserContext(userId),
    loadThreadHistory(threadId),
  ]);
  console.log(`⏱ [chat] Context+history loaded: ${Date.now() - startTime}ms`);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(context, contextType) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const toolCallResults: ChatOrchestrationResult['toolCalls'] = [];
  const allMetadata: Record<string, any> = {};

  // Fallback mode when no API key
  if (!process.env.OPENAI_API_KEY) {
    return fallbackResponse(userMessage, userId, clientDate);
  }

  // Intercept "what can I make" — direct GPT call, no tools
  if (isWhatCanIMakeIntent(userMessage)) {
    console.log(`⏱ [chat] Detected "what can I make" intent — using direct handler`);
    return handleWhatCanIMake(userId, userMessage);
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
        const toolResult = await executeTool(fnName, fnArgs, userId, clientDate);
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

export async function chatOrchestrateStream(
  userMessage: string,
  userId: string,
  threadId: string,
  contextType: string,
  clientDate: string | undefined,
  onToken: (token: string) => void,
  onToolCall: (name: string, args: any) => void,
  onToolResult: (name: string, result: any) => void
): Promise<ChatOrchestrationResult> {
  const startTime = Date.now();
  console.log(`⏱ [stream] Start: "${userMessage.substring(0, 60)}..."`);

  const [context, history] = await Promise.all([
    loadUserContext(userId),
    loadThreadHistory(threadId),
  ]);
  console.log(`⏱ [stream] Context+history loaded: ${Date.now() - startTime}ms`);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(context, contextType) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const toolCallResults: ChatOrchestrationResult['toolCalls'] = [];
  const allMetadata: Record<string, any> = {};

  if (!process.env.OPENAI_API_KEY) {
    const fallback = await fallbackResponse(userMessage, userId, clientDate);
    onToken(fallback.content);
    return fallback;
  }

  // Intercept "what can I make" — direct GPT call, no tools
  if (isWhatCanIMakeIntent(userMessage)) {
    console.log(`⏱ [stream] Detected "what can I make" intent — using direct handler`);
    return handleWhatCanIMake(userId, userMessage, onToken);
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

        const toolStart = Date.now();
        console.log(`🔧 [stream] Executing tool: ${tc.name} at ${toolStart - startTime}ms`, fnArgs);
        onToolCall(tc.name, fnArgs);

        const toolResult = await executeTool(tc.name, fnArgs, userId, clientDate);
        console.log(`✅ [stream] Tool ${tc.name} done in ${Date.now() - toolStart}ms (total: ${Date.now() - startTime}ms)`);

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
    console.log(`⏱ [stream] Complete: ${Date.now() - startTime}ms total`);
    return {
      content: fullContent || "I'm not sure how to help with that.",
      toolCalls: toolCallResults,
      metadata: allMetadata,
    };
  }

  console.log(`⏱ [stream] Max rounds hit: ${Date.now() - startTime}ms total`);
  return {
    content: fullContent || "I've gathered the information.",
    toolCalls: toolCallResults,
    metadata: allMetadata,
  };
}
