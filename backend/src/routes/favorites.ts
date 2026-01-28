import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/favorites
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const savedRecipes = await prisma.userSavedRecipe.findMany({
      where: { userId: req.user!.userId },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
            prepTimeMinutes: true,
            cookTimeMinutes: true,
            difficulty: true,
            averageRating: true
          }
        },
        folder: true
      },
      orderBy: { savedAt: 'desc' }
    });
    
    res.json({ savedRecipes });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/favorites
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { recipeId, folderId, notes, rating } = req.body;
    
    // Handle mock recipes (IDs starting with "mock-")
    if (recipeId.startsWith('mock-')) {
      // For mock recipes, just return a success response
      const mockSavedRecipe = {
        id: `saved-${Date.now()}`,
        userId: req.user!.userId,
        recipeId,
        folderId: folderId || null,
        personalNotes: notes,
        rating: rating ? parseInt(rating) : null,
        savedAt: new Date(),
        recipe: {
          id: recipeId,
          title: "Mock Recipe",
          slug: "mock-recipe"
        }
      };
      
      res.status(201).json({ savedRecipe: mockSavedRecipe });
      return;
    }
    
    const savedRecipe = await prisma.userSavedRecipe.create({
      data: {
        userId: req.user!.userId,
        recipeId,
        folderId: folderId || null,
        personalNotes: notes,
        rating: rating ? parseInt(rating) : null
      },
      include: {
        recipe: true,
        folder: true
      }
    });
    
    // Increment save count on recipe
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { saveCount: { increment: 1 } }
    });
    
    res.status(201).json({ savedRecipe });
  } catch (error) {
    console.error('Save recipe error:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

export default router;