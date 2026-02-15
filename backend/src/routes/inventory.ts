import express from 'express';
import OpenAI from 'openai';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/inventory
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ items });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST /api/inventory
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, category, storageLocation, quantity, unit, purchasedAt, expiresAt } = req.body;
    
    const item = await prisma.inventoryItem.create({
      data: {
        userId: req.user!.userId,
        name,
        category,
        storageLocation,
        quantity: quantity ? parseFloat(quantity) : null,
        unit,
        purchasedAt: purchasedAt ? new Date(purchasedAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    
    res.status(201).json({ item });
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Verify the item belongs to the user before deleting
    const item = await prisma.inventoryItem.findFirst({
      where: { 
        id, 
        userId: req.user!.userId 
      }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    await prisma.inventoryItem.delete({
      where: { id }
    });
    
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// POST /api/inventory/analyze-photo — GPT-4o Vision food detection
router.post('/analyze-photo', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Fallback mock detection when no API key
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        items: [
          { name: 'Chicken breast', quantity: 1, unit: 'lb', category: 'protein', storageLocation: 'fridge', confidence: 0.85 },
          { name: 'Broccoli', quantity: 1, unit: 'bunch', category: 'produce', storageLocation: 'fridge', confidence: 0.92 },
          { name: 'Rice', quantity: 1, unit: 'bag', category: 'grains', storageLocation: 'pantry', confidence: 0.88 },
          { name: 'Soy sauce', quantity: 1, unit: 'bottle', category: 'condiments', storageLocation: 'pantry', confidence: 0.79 },
        ],
        source: 'mock',
        message: 'AI Vision is in demo mode. Configure OPENAI_API_KEY for real photo analysis.',
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a food identification assistant. Analyze the photo and identify all visible food items. For each item, estimate:
- name: the food item name
- quantity: estimated count or amount
- unit: appropriate unit (lbs, oz, count, bunch, bag, bottle, etc.)
- category: one of [produce, protein, dairy, grains, frozen, canned, condiments, snacks, beverages, other]
- storageLocation: one of [fridge, freezer, pantry]
- confidence: 0-1 confidence score

Return ONLY valid JSON: {"items": [...]}`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identify all food items in this photo:' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';
    // Extract JSON from response (may be wrapped in ```json...```)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({ items: [], message: 'Could not identify food items in the photo.' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.json({
      items: parsed.items || [],
      source: 'gpt4o-vision',
      message: `Identified ${(parsed.items || []).length} food item(s) in the photo.`,
    });
  } catch (error) {
    console.error('Photo analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze photo' });
  }
});

export default router;