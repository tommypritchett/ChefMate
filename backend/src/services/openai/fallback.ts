import prisma from '../../lib/prisma';
import { executeTool } from '../ai-tools';
import type { ChatOrchestrationResult } from './types';

export async function fallbackResponse(
  message: string,
  userId: string,
  clientDate?: string
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
      userId,
      clientDate
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

      // Auto-check inventory for the first recipe
      const firstRecipe = recipes[0];
      let inventoryNote = '';
      if (firstRecipe?.id) {
        const compareResult = await executeTool('compare_recipe_ingredients', { recipeId: firstRecipe.id }, userId, clientDate);
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
    const parseResult = await executeTool('parse_natural_inventory_input', { text: message }, userId, clientDate);
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
    const krogerResult = await executeTool('kroger_product_search', { items: [message.replace(/add|put|to|my|shopping|list/gi, '').trim()] }, userId, clientDate);
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
    const listsResult = await executeTool('manage_shopping_list', { action: 'view_lists' }, userId, clientDate);
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
          }, userId, clientDate);
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
          }, userId, clientDate);
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
    const parseResult = await executeTool('parse_natural_inventory_input', { text: message }, userId, clientDate);
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
    const result = await executeTool('get_inventory', { includeExpiring: true }, userId, clientDate);
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
      const result = await executeTool('create_meal_plan', { name: 'My Meal Plan', preferences: message }, userId, clientDate);
      toolCallResults.push({ name: 'create_meal_plan', args: { name: 'My Meal Plan' }, result: result.result });
      if (result.metadata) Object.assign(metadata, result.metadata);

      const plan = result.result.plan;
      return {
        content: `I've created your meal plan **"${plan.name}"** with ${plan.totalMeals || 0} meals populated!\n\n${result.result.message}\n\n*AI is in demo mode. Configure an OpenAI API key for full capabilities.*`,
        toolCalls: toolCallResults,
        metadata,
      };
    }

    const result = await executeTool('get_meal_plan', { weekOffset: 0 }, userId, clientDate);
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
    const result = await executeTool('get_nutrition_summary', { range: 'day' }, userId, clientDate);
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
