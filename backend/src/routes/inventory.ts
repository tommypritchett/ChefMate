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

// PATCH /api/inventory/:id
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, category, storageLocation, quantity, unit, expiresAt } = req.body;

    const item = await prisma.inventoryItem.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(storageLocation !== undefined && { storageLocation }),
        ...(quantity !== undefined && { quantity: quantity ? parseFloat(quantity) : null }),
        ...(unit !== undefined && { unit }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      }
    });

    res.json({ item: updated });
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
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

    // Validate base64 payload size (reject >20MB raw base64)
    const base64SizeBytes = Math.ceil(imageBase64.length * 0.75);
    console.log(`📸 Photo analysis: payload ~${(base64SizeBytes / (1024 * 1024)).toFixed(1)}MB`);
    if (base64SizeBytes > 20 * 1024 * 1024) {
      return res.status(413).json({
        error: 'Image is too large. Please use a smaller photo (under 10MB).',
        code: 'IMAGE_TOO_LARGE',
      });
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

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60s for vision requests
    });

    // Detect image format from base64 header or default to jpeg
    let mediaType = 'image/jpeg';
    if (imageBase64.startsWith('/9j/')) mediaType = 'image/jpeg';
    else if (imageBase64.startsWith('iVBOR')) mediaType = 'image/png';
    else if (imageBase64.startsWith('R0lGOD')) mediaType = 'image/gif';
    else if (imageBase64.startsWith('UklGR')) mediaType = 'image/webp';

    // Strip data URI prefix if present (some clients include it)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Validate base64 is well-formed
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(cleanBase64.substring(0, 100))) {
      console.warn('📸 Base64 validation failed — may be malformed');
    }

    const systemPrompt = `You are a food identification assistant. Analyze the photo and identify all visible food items.

IMPORTANT: Focus ONLY on food items. Ignore packaging, containers, utensils, and non-food objects.

If the image contains NO food items (e.g., it's a room, a document, a pet, etc.), return: {"items": [], "noFood": true}

For each food item found, provide:
- name: specific food name (e.g., "chicken breast" not just "chicken")
- quantity: estimated count or amount (number)
- unit: appropriate unit (lbs, oz, count, bunch, bag, bottle, etc.)
- category: one of [produce, protein, dairy, grains, frozen, canned, condiments, snacks, beverages, other]
- storageLocation: one of [fridge, freezer, pantry]
- confidence: 0-1 confidence score (lower for partially visible or ambiguous items)

Return ONLY valid JSON: {"items": [...]}`;

    const imageUrl = `data:${mediaType};base64,${cleanBase64}`;

    // Model fallback chain: try gpt-4o first, then gpt-4o-mini on failure
    const MODELS = ['gpt-4o', 'gpt-4o-mini'];
    let lastError: any = null;

    for (const model of MODELS) {
      try {
        console.log(`📸 Trying ${model} Vision (format: ${mediaType})`);
        const startTime = Date.now();

        const response = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Identify all food items in this photo:' },
                { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.2,
        });

        const elapsed = Date.now() - startTime;
        console.log(`📸 ${model} responded in ${elapsed}ms`);

        const content = response.choices[0]?.message?.content || '';
        // Extract JSON from response (may be wrapped in ```json...```)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn(`📸 No JSON from ${model}:`, content.substring(0, 200));
          // Try next model
          lastError = new Error('No JSON in response');
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.noFood) {
          return res.json({
            items: [],
            source: `${model}-vision`,
            message: 'No food items were detected in this photo. Please take a photo of food items.',
          });
        }

        const items = (parsed.items || []).filter((item: any) => item.name && item.confidence >= 0.3);
        console.log(`📸 Detected ${items.length} food items via ${model}`);

        return res.json({
          items,
          source: `${model}-vision`,
          message: items.length > 0
            ? `Identified ${items.length} food item(s) in the photo.`
            : 'No food items could be clearly identified. Try a clearer photo.',
        });
      } catch (err: any) {
        const errCode = err?.code || err?.type || 'unknown';
        console.warn(`📸 ${model} failed [${errCode}]:`, err?.message?.substring(0, 200));
        lastError = err;
        // Continue to next model in fallback chain
      }
    }

    // All models failed — use lastError for response
    const error = lastError;
    const errorType = error?.code || error?.type || 'unknown';
    const errorMsg = error?.message || String(error);
    console.error(`📸 All models failed [${errorType}]:`, errorMsg);

    if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Photo analysis timed out. Try a smaller or clearer photo.',
        code: 'TIMEOUT',
        retryable: true,
      });
    }
    if (error?.status === 400 || error?.message?.includes('invalid_image')) {
      return res.status(400).json({
        error: 'The image could not be processed. Try a different photo format (JPEG or PNG).',
        code: 'INVALID_IMAGE',
        retryable: false,
      });
    }
    if (error?.status === 429) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
        retryable: true,
      });
    }

    res.status(500).json({
      error: 'Failed to analyze photo. Please try again.',
      code: 'INTERNAL_ERROR',
      retryable: true,
    });
  } catch (error: any) {
    // Outer catch for unexpected errors (base64 validation, etc.)
    console.error('📸 Unexpected photo analysis error:', error?.message || error);
    res.status(500).json({
      error: 'Failed to analyze photo. Please try again.',
      code: 'INTERNAL_ERROR',
      retryable: true,
    });
  }
});

export default router;