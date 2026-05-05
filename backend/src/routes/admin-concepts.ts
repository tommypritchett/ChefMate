import express from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { generateConceptVariants, createConceptFromTrend } from '../services/concepts/generation';
import { scanTrends } from '../services/concepts/trend-scanner';
import { weeklyConceptGeneration } from '../services/concepts/scheduler';
import { VARIANT_TYPES } from '../services/concepts/variant-types';

const router = express.Router();

// Localhost-only middleware
function localhostOnly(req: Request, res: Response, next: Function) {
  const ip = req.ip || req.socket.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocal) {
    return res.status(403).json({ error: 'Admin API is localhost-only' });
  }
  next();
}

router.use(localhostOnly);

// GET /api/admin/concepts — list all concepts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const concepts = await prisma.recipeConcept.findMany({
      where,
      include: { _count: { select: { variants: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ concepts });
  } catch (err) {
    console.error('[admin-concepts] List error:', err);
    res.status(500).json({ error: 'Failed to list concepts' });
  }
});

// GET /api/admin/concepts/stats — dashboard stats (MUST be before /:id routes)
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [draft, approved, published, rejected, totalVariants] = await Promise.all([
      prisma.recipeConcept.count({ where: { status: 'draft' } }),
      prisma.recipeConcept.count({ where: { status: 'approved' } }),
      prisma.recipeConcept.count({ where: { status: 'published' } }),
      prisma.recipeConcept.count({ where: { status: 'rejected' } }),
      prisma.recipeVariant.count(),
    ]);

    const totalConcepts = draft + approved + published + rejected;
    const avgVariants = totalConcepts > 0 ? (totalVariants / totalConcepts).toFixed(1) : '0';

    res.json({
      concepts: { draft, approved, published, rejected, total: totalConcepts },
      variants: { total: totalVariants, avgPerConcept: parseFloat(avgVariants) },
    });
  } catch (err) {
    console.error('[admin-concepts] Stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// POST /api/admin/concepts/scan-trends — trigger trend scan (MUST be before /:id routes)
router.post('/scan-trends', async (_req: Request, res: Response) => {
  try {
    const trends = await scanTrends();
    const conceptIds: string[] = [];

    for (const trend of trends) {
      const id = await createConceptFromTrend(trend);
      conceptIds.push(id);
    }

    res.json({ trends, conceptIds });
  } catch (err) {
    console.error('[admin-concepts] Scan trends error:', err);
    res.status(500).json({ error: 'Failed to scan trends' });
  }
});

// POST /api/admin/concepts/run-weekly — trigger full weekly generation (MUST be before /:id routes)
router.post('/run-weekly', async (_req: Request, res: Response) => {
  try {
    weeklyConceptGeneration();
    res.json({ message: 'Weekly generation started in background' });
  } catch (err) {
    console.error('[admin-concepts] Weekly run error:', err);
    res.status(500).json({ error: 'Failed to trigger weekly generation' });
  }
});

// PUT /api/admin/concepts/variants/:id/approve (MUST be before /:id routes)
router.put('/variants/:id/approve', async (req: Request, res: Response) => {
  try {
    const variant = await prisma.recipeVariant.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    });

    await prisma.adminAction.create({
      data: {
        conceptId: variant.conceptId,
        variantId: variant.id,
        action: 'approve',
        notes: req.body.notes || null,
      },
    });

    res.json({ variant });
  } catch (err) {
    console.error('[admin-concepts] Variant approve error:', err);
    res.status(500).json({ error: 'Failed to approve variant' });
  }
});

// PUT /api/admin/concepts/variants/:id/reject (MUST be before /:id routes)
router.put('/variants/:id/reject', async (req: Request, res: Response) => {
  try {
    const variant = await prisma.recipeVariant.update({
      where: { id: req.params.id },
      data: { status: 'rejected' },
    });

    await prisma.adminAction.create({
      data: {
        conceptId: variant.conceptId,
        variantId: variant.id,
        action: 'reject',
        notes: req.body.notes || null,
      },
    });

    res.json({ variant });
  } catch (err) {
    console.error('[admin-concepts] Variant reject error:', err);
    res.status(500).json({ error: 'Failed to reject variant' });
  }
});

// POST /api/admin/concepts — create concept manually
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, tagline, description, category, cuisineStyle, proteinType, heroImageUrl, season } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existing = await prisma.recipeConcept.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Concept with this name already exists', existingId: existing.id });
    }

    const concept = await prisma.recipeConcept.create({
      data: {
        name,
        slug,
        tagline: tagline || null,
        description: description || null,
        category: category || null,
        cuisineStyle: cuisineStyle || null,
        proteinType: proteinType || null,
        heroImageUrl: heroImageUrl || null,
        season: season || null,
        trendSource: 'manual',
        status: 'draft',
      },
    });

    res.status(201).json({ concept });
  } catch (err) {
    console.error('[admin-concepts] Create error:', err);
    res.status(500).json({ error: 'Failed to create concept' });
  }
});

// POST /api/admin/concepts/:id/generate — generate variants
router.post('/:id/generate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variantTypes } = req.body;

    const types = variantTypes && Array.isArray(variantTypes)
      ? variantTypes
      : ['classic', 'high-protein', 'keto', 'vegan', 'quick'];

    // Validate variant types
    const invalidTypes = types.filter((t: string) => !VARIANT_TYPES[t]);
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        error: `Invalid variant types: ${invalidTypes.join(', ')}`,
        validTypes: Object.keys(VARIANT_TYPES),
      });
    }

    const result = await generateConceptVariants(id, types);
    res.json(result);
  } catch (err: any) {
    console.error('[admin-concepts] Generate error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate variants' });
  }
});

// PUT /api/admin/concepts/:id/approve
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const concept = await prisma.recipeConcept.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    });

    await prisma.adminAction.create({
      data: { conceptId: concept.id, action: 'approve', notes: req.body.notes || null },
    });

    res.json({ concept });
  } catch (err) {
    console.error('[admin-concepts] Approve error:', err);
    res.status(500).json({ error: 'Failed to approve concept' });
  }
});

// PUT /api/admin/concepts/:id/reject
router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const concept = await prisma.recipeConcept.update({
      where: { id: req.params.id },
      data: { status: 'rejected' },
    });

    await prisma.adminAction.create({
      data: {
        conceptId: concept.id,
        action: 'reject',
        notes: req.body.notes || null,
      },
    });

    res.json({ concept });
  } catch (err) {
    console.error('[admin-concepts] Reject error:', err);
    res.status(500).json({ error: 'Failed to reject concept' });
  }
});

// PUT /api/admin/concepts/:id/publish
router.put('/:id/publish', async (req: Request, res: Response) => {
  try {
    // Also publish all approved variants
    const concept = await prisma.recipeConcept.update({
      where: { id: req.params.id },
      data: { status: 'published', publishedAt: new Date() },
    });

    await prisma.recipeVariant.updateMany({
      where: { conceptId: concept.id, status: { in: ['draft', 'approved'] } },
      data: { status: 'published' },
    });

    await prisma.adminAction.create({
      data: { conceptId: concept.id, action: 'publish', notes: req.body.notes || null },
    });

    res.json({ concept });
  } catch (err) {
    console.error('[admin-concepts] Publish error:', err);
    res.status(500).json({ error: 'Failed to publish concept' });
  }
});

// GET /api/admin/concepts/:id/variants — list variants for a concept
router.get('/:id/variants', async (req: Request, res: Response) => {
  try {
    const variants = await prisma.recipeVariant.findMany({
      where: { conceptId: req.params.id },
      orderBy: { variantType: 'asc' },
    });

    res.json({ variants });
  } catch (err) {
    console.error('[admin-concepts] Variants error:', err);
    res.status(500).json({ error: 'Failed to list variants' });
  }
});

export default router;
