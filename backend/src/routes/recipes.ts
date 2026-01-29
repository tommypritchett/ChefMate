import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/recipes - List recipes with filters
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      category,
      brand,
      difficulty,
      search,
      tags,
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
    
    // Tag filter - dietaryTags is stored as JSON string, use contains for basic filtering
    if (tags) {
      const tagList = (tags as string).split(',').map(t => t.trim().toLowerCase());
      // For SQLite, we do a simple contains check on the JSON string
      // This will match recipes that have the tag anywhere in their dietaryTags array
      where.AND = tagList.map(tag => ({
        dietaryTags: { contains: tag }
      }));
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
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
          createdAt: true
        }
      }),
      prisma.recipe.count({ where })
    ]);

    // Parse JSON strings for dietary tags and nutrition
    const recipesWithParsedData = recipes.map(recipe => ({
      ...recipe,
      nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
      dietaryTags: recipe.dietaryTags ? JSON.parse(recipe.dietaryTags) : []
    }));

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
      metaKeywords: recipe.metaKeywords ? JSON.parse(recipe.metaKeywords) : []
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