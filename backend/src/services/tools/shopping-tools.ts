import prisma from '../../lib/prisma';
import { buildInventoryMatcher } from './inventory-tools';
import {
  searchKrogerProducts,
  goalBoostScore,
  priceValueBonus,
  parseSizeToOz,
  getBannerInfo,
} from '../grocery-prices';

export async function generateShoppingList(args: Record<string, any>, userId: string) {
  const { mealPlanId, recipeId, listName, saveToDB } = args;

  // Collect needed ingredients
  const needed: Map<string, { name: string; totalAmount: number; unit: string }> = new Map();
  let sourceName = '';

  if (recipeId) {
    // Single-recipe mode
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId },
      select: { title: true, ingredients: true },
    });

    if (!recipe) {
      return { result: { items: [], message: 'Recipe not found.' } };
    }

    sourceName = recipe.title;
    let ingredients: any[];
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch {
      ingredients = [];
    }
    for (const ing of ingredients) {
      if (ing.isOptional) continue;
      const key = ing.name.toLowerCase();
      needed.set(key, {
        name: ing.name,
        totalAmount: ing.amount || 1,
        unit: ing.unit || '',
      });
    }
  } else {
    // Meal plan mode
    let plan: any;
    if (mealPlanId) {
      plan = await prisma.mealPlan.findFirst({
        where: { id: mealPlanId, userId },
        include: {
          slots: { include: { recipe: { select: { ingredients: true, servings: true } } } },
        },
      });
    } else {
      plan = await prisma.mealPlan.findFirst({
        where: { userId, isActive: true },
        orderBy: { startDate: 'desc' },
        include: {
          slots: { include: { recipe: { select: { ingredients: true, servings: true } } } },
        },
      });
    }

    if (!plan) {
      return {
        result: {
          items: [],
          message: "No active meal plan found. You can generate a shopping list from a specific recipe by providing a recipeId, or create a meal plan first.",
        },
      };
    }

    sourceName = plan.name;
    for (const slot of plan.slots) {
      if (!slot.recipe?.ingredients) continue;
      let ingredients: any[];
      try {
        ingredients = JSON.parse(slot.recipe.ingredients);
      } catch {
        continue;
      }
      // Apply serving multiplier if slot has custom servings
      const slotServings = (slot as any).servings || null;
      const recipeServings = (slot.recipe as any).servings || 1;
      const multiplier = slotServings ? slotServings / recipeServings : 1;

      for (const ing of ingredients) {
        if (ing.isOptional) continue;
        const key = ing.name.toLowerCase();
        const adjustedAmount = (ing.amount || 1) * multiplier;
        const existing = needed.get(key);
        if (existing) {
          existing.totalAmount += adjustedAmount;
        } else {
          needed.set(key, {
            name: ing.name,
            totalAmount: adjustedAmount,
            unit: ing.unit || '',
          });
        }
      }
    }
  }

  // Get current inventory and build fuzzy matcher
  const inventory = await prisma.inventoryItem.findMany({ where: { userId } });
  const findMatch = buildInventoryMatcher(inventory);

  // Diff: needed minus what user already has
  const shoppingItems: any[] = [];
  for (const [_key, item] of needed) {
    const have = findMatch(item.name);
    if (!have || (have.quantity && have.quantity < item.totalAmount)) {
      shoppingItems.push({
        name: item.name,
        neededAmount: item.totalAmount,
        haveAmount: have?.quantity || 0,
        unit: item.unit,
      });
    }
  }

  // Optionally save to DB
  let savedList: any = null;
  if (saveToDB && shoppingItems.length > 0) {
    savedList = await prisma.shoppingList.create({
      data: {
        userId,
        name: listName || `Shopping for ${sourceName}`,
        sourceType: recipeId ? 'recipe' : 'meal_plan',
        sourceRecipeId: recipeId || undefined,
        items: {
          create: shoppingItems.map(item => ({
            name: item.name,
            quantity: item.neededAmount,
            unit: item.unit,
          })),
        },
      },
      include: { items: true },
    });
  }

  return {
    result: {
      sourceName,
      items: shoppingItems,
      totalItems: shoppingItems.length,
      savedListId: savedList?.id,
      message:
        shoppingItems.length === 0
          ? 'You already have everything you need!'
          : `You need ${shoppingItems.length} items for "${sourceName}".${savedList ? ' List saved!' : ''}`,
    },
    metadata: { type: 'shopping_list', listId: savedList?.id },
  };
}

export async function manageShoppingList(args: Record<string, any>, userId: string) {
  const { action, listId, listName, itemName, quantity, unit, krogerProductId } = args;

  switch (action) {
    case 'view_lists': {
      const lists = await prisma.shoppingList.findMany({
        where: { userId, isActive: true },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        result: {
          lists: lists.map(l => ({
            id: l.id,
            name: l.name,
            itemCount: l.items.length,
            checkedCount: l.items.filter(i => i.isChecked).length,
            createdAt: l.createdAt,
          })),
          message: lists.length === 0
            ? "You don't have any shopping lists yet."
            : `You have ${lists.length} shopping list(s).`,
        },
      };
    }

    case 'create_list': {
      const listItems = args.items as Array<{ name: string; quantity?: number; unit?: string }> | undefined;
      const list = await prisma.shoppingList.create({
        data: {
          userId,
          name: listName || 'Shopping List',
          sourceType: 'manual',
          ...(listItems && listItems.length > 0 ? {
            items: {
              create: listItems.map(item => ({
                name: item.name,
                quantity: item.quantity || null,
                unit: item.unit || null,
              })),
            },
          } : {}),
        },
        include: { items: true },
      });
      const itemCount = list.items?.length || 0;
      return {
        result: {
          list: { id: list.id, name: list.name, itemCount },
          items: list.items?.map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit })) || [],
          message: itemCount > 0
            ? `Created shopping list "${list.name}" with ${itemCount} item(s): ${list.items.map((i: any) => i.name).join(', ')}.`
            : `Created shopping list "${list.name}".`,
        },
        metadata: { type: 'shopping_list', listId: list.id },
      };
    }

    case 'add_item': {
      if (!listId) {
        // Find or create default list
        let list = await prisma.shoppingList.findFirst({
          where: { userId, isActive: true },
          orderBy: { createdAt: 'desc' },
        });
        if (!list) {
          list = await prisma.shoppingList.create({
            data: { userId, name: 'Shopping List', sourceType: 'manual' },
          });
        }

        const item = await prisma.shoppingListItem.create({
          data: {
            shoppingListId: list.id,
            name: itemName || 'item',
            quantity: quantity || null,
            unit: unit || null,
            krogerProductId: krogerProductId || null,
          },
        });
        return {
          result: {
            item: { id: item.id, name: item.name, quantity: item.quantity, unit: item.unit, krogerProductId: item.krogerProductId },
            listName: list.name,
            message: `Added "${item.name}" to "${list.name}".`,
          },
          metadata: { type: 'shopping_list', listId: list.id },
        };
      }

      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: listId,
          name: itemName || 'item',
          quantity: quantity || null,
          unit: unit || null,
          krogerProductId: krogerProductId || null,
        },
      });
      return {
        result: {
          item: { id: item.id, name: item.name, quantity: item.quantity, unit: item.unit, krogerProductId: item.krogerProductId },
          message: `Added "${item.name}" to the list.`,
        },
        metadata: { type: 'shopping_list', listId },
      };
    }

    case 'check_item': {
      if (!itemName) {
        return { result: { error: 'Please specify which item to check off.' } };
      }

      // Find the item by name in user's lists
      const matchItem = await prisma.shoppingListItem.findFirst({
        where: {
          shoppingList: { userId, isActive: true },
          name: { contains: itemName.toLowerCase() },
          isChecked: false,
        },
      });

      if (!matchItem) {
        return { result: { message: `Couldn't find "${itemName}" in your shopping lists.` } };
      }

      await prisma.shoppingListItem.update({
        where: { id: matchItem.id },
        data: { isChecked: true, checkedAt: new Date() },
      });

      return {
        result: {
          message: `Checked off "${matchItem.name}".`,
        },
      };
    }

    default:
      return { result: { error: `Unknown action: ${action}` } };
  }
}

export async function compareRecipeIngredients(args: Record<string, any>, userId: string) {
  const { recipeId } = args;

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId },
    select: { id: true, title: true, ingredients: true },
  });

  if (!recipe) {
    return { result: { error: 'Recipe not found.' } };
  }

  let ingredients: any[];
  try {
    ingredients = JSON.parse(recipe.ingredients);
  } catch {
    ingredients = [];
  }

  // Get inventory and build matcher
  const inventory = await prisma.inventoryItem.findMany({
    where: { userId },
  });
  const findMatch = buildInventoryMatcher(inventory);

  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const haveItems: Array<{
    name: string;
    inventoryName: string;
    quantity?: number;
    unit?: string;
    addedDaysAgo?: number;
    expiringSoon?: boolean;
    expiresAt?: string;
    needsValidation?: boolean;
    validationReason?: string;
  }> = [];
  const missingItems: Array<{ name: string; amount?: number; unit?: string }> = [];

  for (const ing of ingredients) {
    if (ing.isOptional) continue;
    const match = findMatch(ing.name);
    if (match) {
      // Check if expired
      const isExpired = match.expiresAt && new Date(match.expiresAt) < now;
      if (isExpired) {
        missingItems.push({ name: ing.name, amount: ing.amount, unit: ing.unit });
      } else {
        const addedDate = match.createdAt ? new Date(match.createdAt) : null;
        const addedDaysAgo = addedDate ? Math.floor((now.getTime() - addedDate.getTime()) / (24 * 60 * 60 * 1000)) : undefined;
        const expiringSoon = match.expiresAt ? new Date(match.expiresAt) <= threeDays : false;
        const isOld = addedDate ? addedDate < twoDaysAgo : false;

        haveItems.push({
          name: ing.name,
          inventoryName: match.name,
          quantity: match.quantity,
          unit: match.unit,
          addedDaysAgo,
          expiringSoon,
          expiresAt: match.expiresAt?.toISOString?.() || match.expiresAt || undefined,
          needsValidation: isOld || expiringSoon,
          validationReason: expiringSoon
            ? `expiring soon (${match.expiresAt ? new Date(match.expiresAt).toLocaleDateString() : 'unknown'})`
            : isOld
            ? `added ${addedDaysAgo} day(s) ago — still available?`
            : undefined,
        });
      }
    } else {
      missingItems.push({ name: ing.name, amount: ing.amount, unit: ing.unit });
    }
  }

  const totalIngredients = haveItems.length + missingItems.length;
  const coverage = totalIngredients > 0 ? Math.round((haveItems.length / totalIngredients) * 100) : 0;
  const itemsNeedingValidation = haveItems.filter(i => i.needsValidation);

  return {
    result: {
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      totalIngredients,
      have: haveItems,
      missing: missingItems,
      coveragePercent: coverage,
      itemsNeedingValidation: itemsNeedingValidation.length > 0 ? itemsNeedingValidation : undefined,
      message: missingItems.length === 0
        ? `You have all ${totalIngredients} ingredients for "${recipe.title}"! You're ready to cook.`
        : `You have ${haveItems.length}/${totalIngredients} ingredients for "${recipe.title}". Missing ${missingItems.length} item(s): ${missingItems.map(i => i.name).join(', ')}.`,
      canOfferShoppingList: missingItems.length > 0,
    },
    metadata: { type: 'ingredient_comparison', recipeId: recipe.id },
  };
}

export async function addMissingToShoppingList(args: Record<string, any>, userId: string) {
  const { items, listId, listName } = args;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { result: { error: 'No items provided.' } };
  }

  let list;

  if (listId) {
    // User selected a specific existing list
    list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });
    if (!list) {
      return { result: { error: `Shopping list not found. Please try again.` } };
    }
  } else if (listName) {
    // User wants a new list — create it
    list = await prisma.shoppingList.create({
      data: {
        userId,
        name: listName,
        sourceType: 'manual',
      },
    });
  } else {
    // No listId and no listName — return available lists so AI can ask the user
    const existingLists = await prisma.shoppingList.findMany({
      where: { userId, isActive: true },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (existingLists.length === 0) {
      // No lists exist — create a default one
      list = await prisma.shoppingList.create({
        data: {
          userId,
          name: 'Recipe Ingredients',
          sourceType: 'manual',
        },
      });
    } else {
      // Return list options for the AI to present to the user
      return {
        result: {
          needsListSelection: true,
          availableLists: existingLists.map(l => ({
            id: l.id,
            name: l.name,
            itemCount: l.items.length,
          })),
          pendingItems: items,
          message: `Which shopping list should I add these ${items.length} item(s) to? You have ${existingLists.length} list(s), or I can create a new one.`,
        },
      };
    }
  }

  // Get existing items for aggregation check
  const existingItems = await prisma.shoppingListItem.findMany({
    where: { shoppingListId: list.id, isChecked: false },
  });

  const results: Array<{ id: string; name: string; quantity: any; unit: any; action: string }> = [];
  for (const item of items) {
    // Check for existing matching item (fuzzy match)
    const normNew = (item.name || '').toLowerCase().trim();
    const existing = existingItems.find(e => {
      const normE = (e.name || '').toLowerCase().trim();
      return normE === normNew || normE.includes(normNew) || normNew.includes(normE);
    });

    if (existing && (item.quantity || 0) > 0 && (existing.quantity || 0) > 0) {
      // Aggregate
      const newQty = (existing.quantity || 0) + (item.quantity || 0);
      const updated = await prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: { quantity: Math.round(newQty * 100) / 100, unit: item.unit || existing.unit },
      });
      results.push({ id: updated.id, name: updated.name, quantity: updated.quantity, unit: updated.unit, action: 'aggregated' });
    } else {
      const newItem = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: list.id,
          name: item.name,
          quantity: item.quantity || null,
          unit: item.unit || null,
        },
      });
      results.push({ id: newItem.id, name: newItem.name, quantity: newItem.quantity, unit: newItem.unit, action: 'created' });
    }
  }

  const aggregatedCount = results.filter(r => r.action === 'aggregated').length;
  const createdCount = results.filter(r => r.action === 'created').length;
  let message = `Added ${results.length} item(s) to "${list.name}": ${results.map(i => i.name).join(', ')}.`;
  if (aggregatedCount > 0) {
    message += ` (${aggregatedCount} existing item(s) had their quantities updated)`;
  }

  return {
    result: {
      listId: list.id,
      listName: list.name,
      addedItems: results,
      totalAdded: results.length,
      aggregatedCount,
      createdCount,
      message,
    },
    metadata: { type: 'shopping_list', listId: list.id },
  };
}

export async function generateSmartShoppingList(args: Record<string, any>, userId: string) {
  const { recipeIds, servings = {}, listName, saveToDB } = args;

  if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
    return { result: { error: 'No recipe IDs provided.' } };
  }

  // Fetch all recipes
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } },
    select: { id: true, title: true, ingredients: true, servings: true },
  });

  if (recipes.length === 0) {
    return { result: { error: 'No recipes found for the given IDs.' } };
  }

  // Aggregate ingredients across all recipes with serving multipliers
  const aggregated: Map<string, {
    name: string;
    totalQuantity: number;
    unit: string;
    sourceRecipes: string[];
  }> = new Map();

  for (const recipe of recipes) {
    let ingredients: any[];
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch {
      continue;
    }

    const desiredServings = servings[recipe.id] || recipe.servings || 1;
    const recipeServings = recipe.servings || 1;
    const multiplier = desiredServings / recipeServings;

    for (const ing of ingredients) {
      if (ing.isOptional) continue;
      const key = (ing.name || '').toLowerCase().trim();
      if (!key) continue;

      const adjustedQty = (ing.amount || 1) * multiplier;
      const existing = aggregated.get(key);

      if (existing) {
        existing.totalQuantity += adjustedQty;
        if (!existing.sourceRecipes.includes(recipe.title)) {
          existing.sourceRecipes.push(recipe.title);
        }
      } else {
        aggregated.set(key, {
          name: ing.name,
          totalQuantity: adjustedQty,
          unit: ing.unit || '',
          sourceRecipes: [recipe.title],
        });
      }
    }
  }

  // Get inventory and build matcher
  const inventory = await prisma.inventoryItem.findMany({ where: { userId } });
  const findMatch = buildInventoryMatcher(inventory);

  // Calculate what's missing
  const shoppingItems: Array<{
    name: string;
    neededQuantity: number;
    haveQuantity: number;
    unit: string;
    sourceRecipes: string[];
    reason: string;
  }> = [];

  const alreadyHave: Array<{
    name: string;
    neededQuantity: number;
    haveQuantity: number;
    unit: string;
  }> = [];

  for (const [_key, item] of aggregated) {
    const match = findMatch(item.name);

    if (!match) {
      shoppingItems.push({
        name: item.name,
        neededQuantity: Math.round(item.totalQuantity * 100) / 100,
        haveQuantity: 0,
        unit: item.unit,
        sourceRecipes: item.sourceRecipes,
        reason: item.sourceRecipes.length > 1
          ? `Needed for ${item.sourceRecipes.length} recipes: ${item.sourceRecipes.join(', ')}`
          : `Needed for ${item.sourceRecipes[0]}`,
      });
    } else {
      const haveQty = match.quantity || 0;
      const neededQty = Math.round(item.totalQuantity * 100) / 100;

      if (haveQty < neededQty && haveQty > 0) {
        const diff = Math.round((neededQty - haveQty) * 100) / 100;
        shoppingItems.push({
          name: item.name,
          neededQuantity: diff,
          haveQuantity: haveQty,
          unit: item.unit,
          sourceRecipes: item.sourceRecipes,
          reason: `Have ${haveQty} ${item.unit}, need ${neededQty} ${item.unit} total`,
        });
      } else if (haveQty >= neededQty) {
        alreadyHave.push({
          name: item.name,
          neededQuantity: neededQty,
          haveQuantity: haveQty,
          unit: item.unit,
        });
      } else {
        shoppingItems.push({
          name: item.name,
          neededQuantity: neededQty,
          haveQuantity: 0,
          unit: item.unit,
          sourceRecipes: item.sourceRecipes,
          reason: item.sourceRecipes.length > 1
            ? `Needed for ${item.sourceRecipes.length} recipes: ${item.sourceRecipes.join(', ')}`
            : `Needed for ${item.sourceRecipes[0]}`,
        });
      }
    }
  }

  // Optionally save to DB
  let savedList: any = null;
  if (saveToDB && shoppingItems.length > 0) {
    const recipeNames = recipes.map(r => r.title).join(' + ');
    savedList = await prisma.shoppingList.create({
      data: {
        userId,
        name: listName || `Shopping for ${recipeNames}`,
        sourceType: 'meal_plan',
        items: {
          create: shoppingItems.map(item => ({
            name: item.name,
            quantity: item.neededQuantity,
            unit: item.unit,
          })),
        },
      },
      include: { items: true },
    });
  }

  const recipeNames = recipes.map(r => r.title);
  const summary = shoppingItems.length === 0
    ? `You have everything you need for ${recipeNames.join(' and ')}!`
    : `For ${recipes.length} recipe(s) (${recipeNames.join(', ')}), you need ${shoppingItems.length} item(s). You already have ${alreadyHave.length} ingredient(s) covered.`;

  return {
    result: {
      totalRecipes: recipes.length,
      recipeNames,
      totalUniqueIngredients: aggregated.size,
      itemsNeeded: shoppingItems.length,
      itemsAlreadyHave: alreadyHave.length,
      shoppingItems,
      alreadyHave,
      savedListId: savedList?.id,
      summary,
    },
    metadata: { type: 'smart_shopping_list', recipeIds, listId: savedList?.id },
  };
}

export async function estimateRecipeCost(args: Record<string, any>, _userId: string) {
  const { recipeId, lat, lng } = args;

  if (!recipeId) return { result: { error: 'recipeId is required.' } };

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId },
    select: { id: true, title: true, ingredients: true, servings: true },
  });

  if (!recipe) return { result: { error: 'Recipe not found.' } };

  let ingredients: Array<{ name: string; amount?: number; unit?: string }>;
  try {
    ingredients = JSON.parse(recipe.ingredients);
  } catch {
    return { result: { recipeTitle: recipe.title, totalCost: 0, perServing: 0, ingredients: [], message: 'Could not parse ingredients' } };
  }

  const { getPricesForItem, getKrogerPrices, findNearestKrogerLocationCached } = await import('../grocery-prices');

  let locationId: string | undefined;
  let storeName = 'Estimated';
  let chain: string | undefined;

  if (lat && lng && process.env.KROGER_CLIENT_ID) {
    const location = await findNearestKrogerLocationCached(lat, lng);
    if (location) {
      locationId = location.locationId;
      storeName = location.chain;
      chain = location.chain;
    }
  }

  const costResults: Array<{ name: string; price: number; unit: string; isEstimated: boolean }> = [];
  const batchSize = 5;

  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (ing) => {
        if (locationId) {
          const krogerPrices = await getKrogerPrices(ing.name, locationId, chain);
          if (krogerPrices && krogerPrices.length > 0) {
            return { name: ing.name, price: krogerPrices[0].price, unit: krogerPrices[0].unit, isEstimated: false };
          }
        }
        const mockResult = getPricesForItem(ing.name);
        return { name: ing.name, price: mockResult.bestPrice.price, unit: mockResult.bestPrice.unit, isEstimated: true };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        costResults.push(result.value);
      }
    }
  }

  const totalCost = Math.round(costResults.reduce((sum, c) => sum + c.price, 0) * 100) / 100;
  const perServing = Math.round((totalCost / (recipe.servings || 1)) * 100) / 100;

  return {
    result: {
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      storeName,
      totalCost,
      perServing,
      servings: recipe.servings,
      ingredients: costResults,
      message: `Estimated cost for "${recipe.title}" at ${storeName}: $${totalCost} total ($${perServing}/serving).`,
    },
    metadata: { type: 'recipe_cost', recipeId: recipe.id },
  };
}

export async function getSaleItems(args: Record<string, any>, userId: string) {
  const { lat, lng, limit = 20 } = args;

  if (!lat || !lng) {
    return { result: { deals: [], message: 'Location (lat/lng) required for deals. Ask the user to share their location.' } };
  }

  if (!process.env.KROGER_CLIENT_ID) {
    return { result: { deals: [], message: 'Store API not configured. Deals feature requires Kroger API credentials.' } };
  }

  const { findNearestKrogerLocationCached, getKrogerSaleItems } = await import('../grocery-prices');

  const location = await findNearestKrogerLocationCached(lat, lng);
  if (!location) {
    return { result: { deals: [], message: 'No nearby store found.' } };
  }

  const deals = await getKrogerSaleItems(location.locationId, limit);

  // Cross-reference with recipe DB to suggest recipes using sale items
  const saleNames = deals.map(d => d.name.toLowerCase());
  const matchingRecipes = await prisma.recipe.findMany({
    where: {
      isPublished: true,
      OR: saleNames.slice(0, 5).map(name => ({
        ingredients: { contains: name.split(' ')[0] },
      })),
    },
    take: 5,
    select: { id: true, title: true, slug: true, difficulty: true, prepTimeMinutes: true, cookTimeMinutes: true },
  });

  return {
    result: {
      storeName: location.chain,
      storeAddress: location.address,
      deals: deals.map(d => ({
        name: d.name,
        brand: d.brand,
        price: d.price,
        savings: d.saleSavings,
      })),
      totalDeals: deals.length,
      suggestedRecipes: matchingRecipes.length > 0 ? matchingRecipes : undefined,
      message: `Found ${deals.length} item(s) on sale at ${location.chain}. ${matchingRecipes.length > 0 ? `I also found ${matchingRecipes.length} recipe(s) that use these sale items!` : ''}`,
    },
    metadata: { type: 'deals' },
  };
}

export async function krogerProductSearch(args: Record<string, any>, userId: string) {
  const { items } = args;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { result: { error: 'No items provided.' } };
  }

  // Load user's Kroger location from preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  let krogerLocation: { locationId: string; chain: string; address: string } | null = null;
  if (user?.preferences) {
    try {
      const prefs = JSON.parse(user.preferences);
      krogerLocation = prefs.krogerLocation || null;
    } catch {}
  }

  if (!krogerLocation) {
    return {
      result: {
        error: 'no_store_set',
        message: "No Kroger store is set yet. Visit the Shopping tab first to set your store location, then come back and I'll search for products with real prices.",
      },
    };
  }

  // Load user's health goals for scoring
  let goalTypes: string[] = [];
  try {
    const goals = await prisma.healthGoal.findMany({
      where: { userId, isActive: true },
      select: { goalType: true },
    });
    goalTypes = goals.map(g => g.goalType);
  } catch {}

  // Goal-modified search modifiers
  const GOAL_SEARCH_MODIFIERS: Record<string, string[]> = {
    'high-protein': ['protein', 'fairlife', 'high protein'],
    'protein': ['protein', 'fairlife', 'high protein'],
    'low-carb': ['low carb', 'keto', 'sugar free'],
    'keto': ['keto', 'low carb', 'sugar free'],
    'low-calorie': ['light', 'low fat', 'zero sugar'],
    'weight-loss': ['light', 'lean', 'low calorie'],
    'vegetarian': ['plant based', 'veggie'],
    'vegan': ['plant based', 'vegan', 'dairy free'],
    'gluten-free': ['gluten free'],
    'dairy-free': ['dairy free', 'oat', 'almond'],
  };

  // Search Kroger for each item in parallel
  const searchResults = await Promise.all(
    items.map(async (query: string) => {
      // Pull 15 results so scoring has a wide pool to pick from
      const allProducts = await searchKrogerProducts(query, krogerLocation!.locationId, 15);

      // Also run goal-modified secondary searches
      if (goalTypes.length > 0) {
        const seenNames = new Set(allProducts.map(p => p.name));
        const seenModifiers = new Set<string>();
        for (const goal of goalTypes) {
          const modifiers = GOAL_SEARCH_MODIFIERS[goal.toLowerCase()];
          if (!modifiers) continue;
          for (const mod of modifiers) {
            if (seenModifiers.has(mod)) continue;
            if (query.toLowerCase().includes(mod.toLowerCase())) continue;
            seenModifiers.add(mod);
            try {
              const goalResults = await searchKrogerProducts(`${mod} ${query}`, krogerLocation!.locationId, 5);
              for (const p of goalResults) {
                if (!seenNames.has(p.name)) {
                  allProducts.push(p);
                  seenNames.add(p.name);
                }
              }
            } catch {}
            break; // One secondary search per goal to keep it fast
          }
        }
      }

      // Score and rank products
      const scored = allProducts.map(p => {
        const goalScore = goalBoostScore(p.name, goalTypes);
        const valueScore = priceValueBonus(p.price, p.size);
        const goalAligned = goalScore > 0;

        let goalReason: string | undefined;
        if (goalAligned && goalTypes.length > 0) {
          for (const goal of goalTypes) {
            const kw = goal.toLowerCase();
            if (kw.includes('protein')) goalReason = 'High protein';
            else if (kw.includes('carb') || kw === 'keto') goalReason = 'Low carb';
            else if (kw.includes('calorie') || kw.includes('weight')) goalReason = 'Lower calorie';
            if (goalReason) break;
          }
        }

        const priceBonus = p.price > 0 ? Math.max(0, 10 - p.price) : 0;

        return {
          krogerProductId: p.krogerProductId,
          name: p.name,
          brand: p.brand,
          size: p.size,
          price: p.price,
          promoPrice: p.promoPrice,
          onSale: p.onSale || false,
          goalAligned,
          goalReason,
          _totalScore: goalScore + valueScore + priceBonus + (p.onSale ? 8 : 0),
          _pricePerOz: parseSizeToOz(p.size) > 0 ? p.price / parseSizeToOz(p.size) : 999,
        };
      });

      scored.sort((a, b) => b._totalScore - a._totalScore || a.price - b.price);
      const top3 = scored.slice(0, 3);

      const byValue = [...top3].sort((a, b) => a._pricePerOz - b._pricePerOz);

      return {
        query,
        products: top3.map(p => ({
          krogerProductId: p.krogerProductId,
          name: p.name,
          brand: p.brand,
          size: p.size,
          price: p.price,
          promoPrice: p.promoPrice,
          onSale: p.onSale,
          goalAligned: p.goalAligned,
          goalReason: p.goalReason,
          valueRank: byValue.indexOf(p) + 1,
        })),
      };
    })
  );

  const banner = getBannerInfo(krogerLocation.chain);

  return {
    result: {
      results: searchResults,
      storeName: `${banner.name} (${krogerLocation.address})`,
    },
    metadata: { type: 'kroger_product_search' },
  };
}
