import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/concepts — list published concepts
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { category, season, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { status: 'published' };
    if (category) where.category = category;
    if (season) where.season = season;

    const [concepts, total] = await Promise.all([
      prisma.recipeConcept.findMany({
        where,
        include: {
          variants: {
            where: { status: 'published', isDefault: true },
            select: {
              id: true,
              variantType: true,
              title: true,
              nutrition: true,
              totalTimeMinutes: true,
              difficulty: true,
            },
            take: 1,
          },
          _count: { select: { variants: { where: { status: 'published' } } } },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.recipeConcept.count({ where }),
    ]);

    // Flatten default variant info into concept response
    const formatted = concepts.map((c) => {
      const defaultVariant = c.variants[0] || null;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        tagline: c.tagline,
        category: c.category,
        cuisineStyle: c.cuisineStyle,
        heroImageUrl: c.heroImageUrl,
        season: c.season,
        publishedAt: c.publishedAt,
        variantCount: c._count.variants,
        defaultVariant: defaultVariant
          ? {
              nutrition: defaultVariant.nutrition ? JSON.parse(defaultVariant.nutrition) : null,
              totalTimeMinutes: defaultVariant.totalTimeMinutes,
              difficulty: defaultVariant.difficulty,
            }
          : null,
      };
    });

    res.json({
      concepts: formatted,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[concepts] List error:', err);
    res.status(500).json({ error: 'Failed to list concepts' });
  }
});

// GET /api/concepts/new-this-week — published in last 7 days
router.get('/new-this-week', requireAuth, async (_req: AuthenticatedRequest, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const concepts = await prisma.recipeConcept.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: oneWeekAgo },
      },
      include: {
        variants: {
          where: { status: 'published', isDefault: true },
          select: {
            nutrition: true,
            totalTimeMinutes: true,
            difficulty: true,
          },
          take: 1,
        },
        _count: { select: { variants: { where: { status: 'published' } } } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });

    const formatted = concepts.map((c) => {
      const dv = c.variants[0] || null;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        tagline: c.tagline,
        category: c.category,
        heroImageUrl: c.heroImageUrl,
        variantCount: c._count.variants,
        defaultVariant: dv
          ? {
              nutrition: dv.nutrition ? JSON.parse(dv.nutrition) : null,
              totalTimeMinutes: dv.totalTimeMinutes,
              difficulty: dv.difficulty,
            }
          : null,
      };
    });

    res.json({ concepts: formatted });
  } catch (err) {
    console.error('[concepts] New this week error:', err);
    res.status(500).json({ error: 'Failed to get new concepts' });
  }
});

// GET /api/concepts/:slug — single concept with all published variants
router.get('/:slug', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const concept = await prisma.recipeConcept.findUnique({
      where: { slug: req.params.slug },
      include: {
        variants: {
          where: { status: 'published' },
          orderBy: [{ isDefault: 'desc' }, { variantType: 'asc' }],
        },
      },
    });

    if (!concept || concept.status !== 'published') {
      return res.status(404).json({ error: 'Concept not found' });
    }

    // Parse JSON fields for each variant
    const variants = concept.variants.map((v) => ({
      id: v.id,
      variantType: v.variantType,
      title: v.title,
      description: v.description,
      ingredients: JSON.parse(v.ingredients),
      instructions: JSON.parse(v.instructions),
      nutrition: v.nutrition ? JSON.parse(v.nutrition) : null,
      prepTimeMinutes: v.prepTimeMinutes,
      cookTimeMinutes: v.cookTimeMinutes,
      totalTimeMinutes: v.totalTimeMinutes,
      servings: v.servings,
      difficulty: v.difficulty,
      dietaryTags: v.dietaryTags ? JSON.parse(v.dietaryTags) : [],
      isDefault: v.isDefault,
    }));

    res.json({
      concept: {
        id: concept.id,
        name: concept.name,
        slug: concept.slug,
        tagline: concept.tagline,
        description: concept.description,
        category: concept.category,
        cuisineStyle: concept.cuisineStyle,
        proteinType: concept.proteinType,
        heroImageUrl: concept.heroImageUrl,
        season: concept.season,
        publishedAt: concept.publishedAt,
      },
      variants,
    });
  } catch (err) {
    console.error('[concepts] Detail error:', err);
    res.status(500).json({ error: 'Failed to get concept' });
  }
});

export default router;
