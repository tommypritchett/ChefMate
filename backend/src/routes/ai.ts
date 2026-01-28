import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { generateRecipe, chatWithAssistant, generateInventoryBasedSuggestions } from '../services/openai';

const router = express.Router();
const prisma = new PrismaClient();

// Validation for recipe generation
const validateGenerateRecipe = [
  body('prompt')
    .isString()
    .isLength({ min: 5, max: 200 })
    .withMessage('Prompt must be between 5 and 200 characters'),
  body('servings')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Servings must be between 1 and 12'),
  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array'),
];

const validateChatMessage = [
  body('message')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
];

// POST /api/ai/generate-recipe
router.post('/generate-recipe', requireAuth, validateGenerateRecipe, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { prompt, servings = 2, dietaryRestrictions = [], maxTime, difficulty } = req.body;

    // Get user's current inventory for context
    const userInventory = await prisma.inventoryItem.findMany({
      where: { userId: req.user!.userId },
      select: { name: true }
    });

    const availableIngredients = userInventory.map(item => item.name);

    // Generate recipe using OpenAI
    const generatedRecipe = await generateRecipe({
      prompt,
      servings,
      dietaryRestrictions,
      availableIngredients,
      maxTime,
      difficulty
    });

    // Create slug from title
    const baseSlug = generatedRecipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = baseSlug + '-' + Date.now(); // Ensure uniqueness

    // Save to database
    const recipe = await prisma.recipe.create({
      data: {
        title: generatedRecipe.title,
        slug,
        description: generatedRecipe.description,
        brand: generatedRecipe.brand,
        originalItemName: generatedRecipe.originalItem,
        ingredients: JSON.stringify(generatedRecipe.ingredients),
        instructions: JSON.stringify(generatedRecipe.instructions),
        prepTimeMinutes: generatedRecipe.prepTime,
        cookTimeMinutes: generatedRecipe.cookTime,
        totalTimeMinutes: generatedRecipe.prepTime + generatedRecipe.cookTime,
        servings: generatedRecipe.servings,
        difficulty: generatedRecipe.difficulty,
        nutrition: JSON.stringify(generatedRecipe.nutrition),
        originalNutrition: generatedRecipe.originalNutrition ? JSON.stringify(generatedRecipe.originalNutrition) : null,
        dietaryTags: JSON.stringify(generatedRecipe.dietaryTags),
        isAiGenerated: true,
        generatedByUserId: req.user!.userId,
        generationPrompt: prompt
      }
    });

    // Log the AI interaction
    await prisma.chatMessage.create({
      data: {
        userId: req.user!.userId,
        role: 'user',
        message: `Generate recipe: ${prompt}`,
        contextType: 'recipe_generation',
        generatedRecipeId: recipe.id
      }
    });

    res.json({
      recipe: {
        ...recipe,
        ingredients: generatedRecipe.ingredients,
        instructions: generatedRecipe.instructions,
        nutrition: generatedRecipe.nutrition,
        originalNutrition: generatedRecipe.originalNutrition,
        dietaryTags: generatedRecipe.dietaryTags,
        tips: generatedRecipe.tips,
        substitutions: generatedRecipe.substitutions
      }
    });
  } catch (error) {
    console.error('Generate recipe error:', error);
    
    if (error instanceof Error && error.message.includes('API key not configured')) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured. Please add your OpenAI API key to enable AI features.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

// POST /api/ai/chat
router.post('/chat', requireAuth, validateChatMessage, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { message, context } = req.body;

    // Generate AI response
    const aiResponse = await chatWithAssistant(message, context);

    // Save chat messages
    await prisma.chatMessage.createMany({
      data: [
        {
          userId: req.user!.userId,
          role: 'user',
          message: message,
          contextType: context?.type || 'general',
          contextData: context ? JSON.stringify(context) : null
        },
        {
          userId: req.user!.userId,
          role: 'assistant',
          message: aiResponse,
          contextType: context?.type || 'general'
        }
      ]
    });

    res.json({
      message: aiResponse
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// GET /api/ai/chat/history
router.get('/chat/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { limit = '50' } = req.query;
    
    const messages = await prisma.chatMessage.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    // Parse context data
    const messagesWithParsedData = messages.map(message => ({
      ...message,
      contextData: message.contextData ? JSON.parse(message.contextData) : null
    }));

    res.json({ messages: messagesWithParsedData.reverse() });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// GET /api/ai/inventory-suggestions
router.get('/inventory-suggestions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user's inventory
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { userId: req.user!.userId },
      select: { 
        name: true, 
        expiresAt: true,
        isExpired: true 
      }
    });

    const availableItems = inventoryItems.map(item => item.name);
    
    // Find items expiring soon (within 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const expiringItems = inventoryItems
      .filter(item => item.expiresAt && item.expiresAt <= threeDaysFromNow && !item.isExpired)
      .map(item => item.name);

    if (availableItems.length === 0) {
      return res.json({ 
        suggestions: [
          'Add items to your inventory to get personalized recipe suggestions!',
          'Try our recipe generator for custom fast food recreations',
          'Browse our curated recipe collection'
        ]
      });
    }

    // Generate AI-powered suggestions
    const suggestions = await generateInventoryBasedSuggestions(availableItems, expiringItems);

    res.json({ 
      suggestions,
      expiringItemsCount: expiringItems.length,
      expiringItems: expiringItems.slice(0, 3) // Show first 3 expiring items
    });
  } catch (error) {
    console.error('Inventory suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;