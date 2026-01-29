import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// ==================
// FOLDERS
// ==================

// GET /api/favorites/folders
router.get('/folders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const folders = await prisma.recipeFolder.findMany({
      where: { userId: req.user!.userId },
      include: {
        _count: {
          select: { recipes: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json({ folders: folders.map(f => ({
      ...f,
      recipeCount: f._count.recipes
    })) });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST /api/favorites/folders
router.post('/folders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, icon, color } = req.body;
    
    const folder = await prisma.recipeFolder.create({
      data: {
        userId: req.user!.userId,
        name,
        description,
        icon,
        color
      }
    });
    
    res.status(201).json({ folder });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// DELETE /api/favorites/folders/:id
router.delete('/folders/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const folder = await prisma.recipeFolder.findFirst({
      where: { id, userId: req.user!.userId }
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    await prisma.recipeFolder.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// ==================
// SAVED RECIPES
// ==================

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

// POST /api/favorites/:id/made-it
// Track that a user made this recipe
router.post('/:id/made-it', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Find the saved recipe and verify ownership
    const saved = await prisma.userSavedRecipe.findFirst({
      where: { id, userId: req.user!.userId }
    });
    
    if (!saved) {
      return res.status(404).json({ error: 'Saved recipe not found' });
    }
    
    // Increment timesMade and set lastMadeAt
    const updated = await prisma.userSavedRecipe.update({
      where: { id },
      data: {
        timesMade: { increment: 1 },
        lastMadeAt: new Date()
      }
    });
    
    // Also increment the recipe's makeCount
    await prisma.recipe.update({
      where: { id: saved.recipeId },
      data: { makeCount: { increment: 1 } }
    });
    
    res.json({ 
      success: true,
      timesMade: updated.timesMade,
      lastMadeAt: updated.lastMadeAt
    });
  } catch (error) {
    console.error('Made it error:', error);
    res.status(500).json({ error: 'Failed to track recipe' });
  }
});

// POST /api/favorites/by-recipe/:recipeId/made-it
// Track that a user made a recipe (lookup by recipe ID, auto-save if needed)
router.post('/by-recipe/:recipeId/made-it', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { recipeId } = req.params;
    
    // Find or create saved recipe
    let saved = await prisma.userSavedRecipe.findFirst({
      where: { recipeId, userId: req.user!.userId }
    });
    
    if (!saved) {
      // Auto-save the recipe first
      saved = await prisma.userSavedRecipe.create({
        data: {
          userId: req.user!.userId,
          recipeId,
          timesMade: 0
        }
      });
      
      await prisma.recipe.update({
        where: { id: recipeId },
        data: { saveCount: { increment: 1 } }
      });
    }
    
    // Increment timesMade
    const updated = await prisma.userSavedRecipe.update({
      where: { id: saved.id },
      data: {
        timesMade: { increment: 1 },
        lastMadeAt: new Date()
      }
    });
    
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { makeCount: { increment: 1 } }
    });
    
    res.json({
      success: true,
      timesMade: updated.timesMade,
      lastMadeAt: updated.lastMadeAt,
      savedRecipeId: updated.id
    });
  } catch (error) {
    console.error('Made it error:', error);
    res.status(500).json({ error: 'Failed to track recipe' });
  }
});

export default router;