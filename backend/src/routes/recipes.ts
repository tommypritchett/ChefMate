import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/recipes - List recipes with filters
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      category,
      brand,
      difficulty,
      search,
      tags,
      proteinType,
      cuisineStyle,
      cookingMethod,
      minIngredientMatch,
      page = '1',
      limit = '20',
      featured
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      isPublished: true
    };

    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (difficulty) where.difficulty = difficulty;
    if (featured === 'true') where.isFeatured = true;
    if (proteinType) where.proteinType = proteinType;
    if (cuisineStyle) where.cuisineStyle = cuisineStyle;
    if (cookingMethod) where.cookingMethod = cookingMethod;

    // Tag filter - dietaryTags is stored as JSON string, use contains for basic filtering
    if (tags) {
      const tagList = (tags as string).split(',').map(t => t.trim().toLowerCase());
      where.AND = tagList.map(tag => ({
        dietaryTags: { contains: tag }
      }));
    }

    if (search) {
      // Split search into individual words so "chicken breast" matches
      // recipes where both "chicken" AND "breast" appear in title/description/brand.
      // SQLite's LIKE (used by Prisma `contains`) is case-insensitive for ASCII.
      const searchWords = (search as string).trim().split(/\s+/).filter(w => w.length > 0);
      if (searchWords.length === 1) {
        where.OR = [
          { title: { contains: searchWords[0] } },
          { description: { contains: searchWords[0] } },
          { brand: { contains: searchWords[0] } }
        ];
      } else if (searchWords.length > 1) {
        // Each word must appear in at least one of title/description/brand
        where.AND = [
          ...(where.AND || []),
          ...searchWords.map((word: string) => ({
            OR: [
              { title: { contains: word } },
              { description: { contains: word } },
              { brand: { contains: word } },
            ]
          }))
        ];
      }
    }

    // Ingredient match requires user auth + inventory lookup
    const minMatch = minIngredientMatch ? parseInt(minIngredientMatch as string) : 0;
    let inventoryNames: Set<string> | null = null;
    if (minMatch > 0 && req.user) {
      const items = await prisma.inventoryItem.findMany({
        where: { userId: req.user.userId },
        select: { name: true },
      });
      inventoryNames = new Set(items.map(i => i.name.toLowerCase()));
    }

    const selectFields = {
      id: true,
      title: true,
      slug: true,
      description: true,
      brand: true,
      category: true,
      imageUrl: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      difficulty: true,
      servings: true,
      averageRating: true,
      viewCount: true,
      saveCount: true,
      nutrition: true,
      dietaryTags: true,
      proteinType: true,
      cuisineStyle: true,
      cookingMethod: true,
      ingredients: minMatch > 0 ? true : false,
      createdAt: true
    };

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        skip: minMatch > 0 ? undefined : skip,
        take: minMatch > 0 ? undefined : limitNum,
        orderBy: { createdAt: 'desc' },
        select: selectFields as any,
      }),
      prisma.recipe.count({ where })
    ]);

    // Parse JSON strings and compute ingredient match %
    let recipesWithParsedData = recipes.map((recipe: any) => {
      const parsed: any = {
        ...recipe,
        nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
        dietaryTags: recipe.dietaryTags ? JSON.parse(recipe.dietaryTags) : [],
      };

      if (inventoryNames && recipe.ingredients) {
        const ings = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients;
        const totalIngs = ings.length;
        const matchCount = ings.filter((ing: any) => {
          const name = (ing.name || '').toLowerCase();
          return Array.from(inventoryNames!).some(inv => name.includes(inv) || inv.includes(name));
        }).length;
        parsed.ingredientMatch = totalIngs > 0 ? Math.round((matchCount / totalIngs) * 100) : 0;
        parsed.ingredientMatchCount = matchCount;
        parsed.ingredientTotal = totalIngs;
      }

      // Remove raw ingredients from response when not needed
      delete parsed.ingredients;
      return parsed;
    });

    // Filter by minimum ingredient match
    if (minMatch > 0) {
      recipesWithParsedData = recipesWithParsedData.filter((r: any) => (r.ingredientMatch || 0) >= minMatch);
      // Sort by match % descending
      recipesWithParsedData.sort((a: any, b: any) => (b.ingredientMatch || 0) - (a.ingredientMatch || 0));
      // Manual pagination after filtering
      const filteredTotal = recipesWithParsedData.length;
      recipesWithParsedData = recipesWithParsedData.slice(skip, skip + limitNum);
      return res.json({
        recipes: recipesWithParsedData,
        pagination: { page: pageNum, limit: limitNum, total: filteredTotal, pages: Math.ceil(filteredTotal / limitNum) }
      });
    }

    res.json({
      recipes: recipesWithParsedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// GET /api/recipes/:id - Get single recipe
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const recipe = await prisma.recipe.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ],
        isPublished: true
      }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Increment view count
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { viewCount: { increment: 1 } }
    });

    // Parse JSON strings
    const recipeWithParsedData = {
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients),
      instructions: JSON.parse(recipe.instructions),
      nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
      originalNutrition: recipe.originalNutrition ? JSON.parse(recipe.originalNutrition) : null,
      dietaryTags: recipe.dietaryTags ? JSON.parse(recipe.dietaryTags) : [],
      imageUrls: recipe.imageUrls ? JSON.parse(recipe.imageUrls) : [],
      metaKeywords: recipe.metaKeywords ? JSON.parse(recipe.metaKeywords) : [],
      ingredientCosts: null
    };

    res.json({ recipe: recipeWithParsedData });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// POST /api/recipes - Create a new recipe (for AI-generated or user-created)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      title,
      description,
      brand,
      originalItemName,
      ingredients,
      instructions,
      prepTimeMinutes,
      cookTimeMinutes,
      servings,
      difficulty,
      nutrition,
      originalNutrition,
      dietaryTags,
      isAiGenerated = false
    } = req.body;

    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Title, ingredients, and instructions are required' });
    }

    // Create slug from title
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = baseSlug + '-' + Date.now();

    const recipe = await prisma.recipe.create({
      data: {
        title,
        slug,
        description: description || '',
        brand: brand || null,
        originalItemName: originalItemName || null,
        ingredients: typeof ingredients === 'string' ? ingredients : JSON.stringify(ingredients),
        instructions: typeof instructions === 'string' ? instructions : JSON.stringify(instructions),
        prepTimeMinutes: prepTimeMinutes || 15,
        cookTimeMinutes: cookTimeMinutes || 30,
        totalTimeMinutes: (prepTimeMinutes || 15) + (cookTimeMinutes || 30),
        servings: servings || 4,
        difficulty: difficulty || 'medium',
        nutrition: nutrition ? (typeof nutrition === 'string' ? nutrition : JSON.stringify(nutrition)) : null,
        originalNutrition: originalNutrition ? (typeof originalNutrition === 'string' ? originalNutrition : JSON.stringify(originalNutrition)) : null,
        dietaryTags: dietaryTags ? (typeof dietaryTags === 'string' ? dietaryTags : JSON.stringify(dietaryTags)) : null,
        isAiGenerated,
        generatedByUserId: req.user!.userId,
        isPublished: true
      }
    });

    // Parse JSON for response
    const recipeWithParsedData = {
      ...recipe,
      ingredients: typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients,
      instructions: typeof instructions === 'string' ? JSON.parse(instructions) : instructions,
      nutrition: nutrition ? (typeof nutrition === 'string' ? JSON.parse(nutrition) : nutrition) : null,
      originalNutrition: originalNutrition ? (typeof originalNutrition === 'string' ? JSON.parse(originalNutrition) : originalNutrition) : null,
      dietaryTags: dietaryTags ? (typeof dietaryTags === 'string' ? JSON.parse(dietaryTags) : dietaryTags) : []
    };

    res.status(201).json({ recipe: recipeWithParsedData });
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// GET /api/recipes/:id/cost?lat=X&lng=Y — Estimate recipe ingredient cost
router.get('/:id/cost', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    const recipe = await prisma.recipe.findFirst({
      where: { OR: [{ id }, { slug: id }], isPublished: true },
      select: { id: true, title: true, ingredients: true, servings: true },
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    let ingredients: Array<{ name: string; amount?: number; unit?: string }>;
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch {
      return res.json({ recipeTitle: recipe.title, totalCost: 0, perServing: 0, ingredients: [], message: 'Could not parse ingredients' });
    }

    const { getPricesForItem, getKrogerPrices, findNearestKrogerLocationCached } = await import('../services/grocery-prices');

    // Try to get Kroger location for live prices
    let locationId: string | undefined;
    let storeName = 'Estimated';
    let chain: string | undefined;
    if (!isNaN(lat) && !isNaN(lng) && process.env.KROGER_CLIENT_ID) {
      const location = await findNearestKrogerLocationCached(lat, lng);
      if (location) {
        locationId = location.locationId;
        storeName = location.chain;
        chain = location.chain;
      }
    }

    // Fetch prices for each ingredient (max 5 concurrent)
    const costResults: Array<{ name: string; price: number; unit: string; isEstimated: boolean }> = [];
    const batchSize = 5;

    for (let i = 0; i < ingredients.length; i += batchSize) {
      const batch = ingredients.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (ing) => {
          // Try Kroger live price first
          if (locationId) {
            const krogerPrices = await getKrogerPrices(ing.name, locationId, chain);
            if (krogerPrices && krogerPrices.length > 0) {
              return { name: ing.name, price: krogerPrices[0].price, unit: krogerPrices[0].unit, isEstimated: false };
            }
          }
          // Fallback to mock prices
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

    res.json({
      recipeTitle: recipe.title,
      storeName,
      totalCost,
      perServing,
      servings: recipe.servings,
      ingredients: costResults,
    });
  } catch (error) {
    console.error('Recipe cost estimation error:', error);
    res.status(500).json({ error: 'Failed to estimate recipe cost' });
  }
});

// POST /api/recipes/:id/view - Log recipe view
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.recipe.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({ message: 'View logged' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log view' });
  }
});

export default router;