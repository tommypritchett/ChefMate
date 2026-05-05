/**
 * Migration script: Convert existing recipes into RecipeConcept + RecipeVariant structure.
 *
 * 1. Deduplicate recipes by base dish name
 * 2. Create one RecipeConcept per unique dish
 * 3. Create RecipeVariant for each recipe in the group
 * 4. Generate missing variants via OpenAI
 * 5. Verify migration completeness
 *
 * Run: npx ts-node src/scripts/migrate-recipes-to-concepts.ts
 */

import prisma from '../lib/prisma';
import { generateConceptVariants } from '../services/concepts/generation';

// ── Variant-type inference from recipe title and tags ──

const VARIANT_PREFIX_PATTERNS: Array<{ pattern: RegExp; variantType: string }> = [
  { pattern: /^high[- ]protein/i, variantType: 'high-protein' },
  { pattern: /^keto\b/i, variantType: 'keto' },
  { pattern: /^vegan\b/i, variantType: 'vegan' },
  { pattern: /^vegetarian\b/i, variantType: 'vegan' }, // map vegetarian recipes to vegan variant slot
  { pattern: /^dairy[- ]free/i, variantType: 'dairy-free' },
  { pattern: /^gluten[- ]free/i, variantType: 'dairy-free' }, // no dedicated GF variant type, closest is dairy-free
  { pattern: /^low[- ]carb/i, variantType: 'keto' },
  { pattern: /^low[- ]sodium/i, variantType: 'classic' },
  { pattern: /^healthy\b/i, variantType: 'classic' },
  { pattern: /^gf\b/i, variantType: 'dairy-free' },
  { pattern: /^protein[- ]/i, variantType: 'high-protein' },
  { pattern: /^bunless\b/i, variantType: 'keto' },
  { pattern: /^lettuce wrap/i, variantType: 'keto' },
];

const VARIANT_SUFFIX_PATTERNS: Array<{ pattern: RegExp; variantType: string }> = [
  { pattern: /high[- ]protein$/i, variantType: 'high-protein' },
  { pattern: /keto$/i, variantType: 'keto' },
  { pattern: /vegan$/i, variantType: 'vegan' },
  { pattern: /dairy[- ]free$/i, variantType: 'dairy-free' },
  { pattern: /low[- ]carb$/i, variantType: 'keto' },
  { pattern: /bean edition$/i, variantType: 'vegan' },
];

function inferVariantType(title: string, dietaryTags: string[]): string {
  // Check prefix patterns
  for (const { pattern, variantType } of VARIANT_PREFIX_PATTERNS) {
    if (pattern.test(title)) return variantType;
  }
  // Check suffix patterns
  for (const { pattern, variantType } of VARIANT_SUFFIX_PATTERNS) {
    if (pattern.test(title)) return variantType;
  }
  // Infer from tags
  if (dietaryTags.includes('keto')) return 'keto';
  if (dietaryTags.includes('vegan')) return 'vegan';
  if (dietaryTags.includes('high-protein') && dietaryTags.includes('low-carb')) return 'high-protein';
  // Default
  return 'classic';
}

// ── Base-name extraction for grouping ──

const STRIP_PREFIXES = [
  /^high[- ]protein\s*/i,
  /^protein[- ]packed\s*/i,
  /^protein\b\s*/i,
  /^keto\b\s*/i,
  /^vegan\b\s*/i,
  /^vegetarian\b\s*/i,
  /^dairy[- ]free\s*/i,
  /^gluten[- ]free\s*/i,
  /^gf\b\s*/i,
  /^low[- ]carb\s*/i,
  /^low[- ]sodium\s*/i,
  /^low[- ]calorie\s*/i,
  /^healthy\b\s*/i,
  /^bunless\b\s*/i,
  /^classic\b\s*/i,
  /^traditional\b\s*/i,
  /^lettuce wrap\s*/i,
];

const STRIP_SUFFIXES = [
  /\s*-?\s*bean edition$/i,
  /\s*-?\s*high protein$/i,
  /\s*-?\s*keto$/i,
  /\s*-?\s*vegan$/i,
  /\s*-?\s*dairy[- ]free$/i,
  /\s*-?\s*gluten[- ]free$/i,
  /\s*-?\s*low[- ]carb$/i,
  /\s*-?\s*low[- ]sodium$/i,
  /\s*-?\s*classic$/i,
];

// Manual overrides for tricky groupings
const MANUAL_GROUP_MAP: Record<string, string> = {
  'High-Protein Low-Calorie Big Mac': 'Big Mac',
  'Vegan Big Mac': 'Big Mac',
  'Classic Quarter Pounder': 'Quarter Pounder',
  'High Protein Keto Smash Burger': 'Smash Burger',
  'Smash Burgers': 'Smash Burger',
  'Keto Five Guys Burger': 'Five Guys Burger',
  'Bunless Baconator': 'Baconator',
  'Lettuce Wrap Double-Double': 'Double-Double',
  'Vegan Whopper': 'Whopper',
  'Buddha Bowl': 'Buddha Bowl',
  'Vegan Gluten-Free Buddha Bowl': 'Buddha Bowl',
  'Vegan Low-Sodium Buddha Bowl': 'Buddha Bowl',
  'Protein-Packed Crunchwrap Supreme': 'Crunchwrap Supreme',
  'Vegan Crunchy Taco Supreme': 'Crunchy Taco Supreme',
  'Vegetarian Crunchwrap': 'Crunchwrap',
  'Cheesy Gordita Crunch - Bean Edition': 'Gordita Crunch',
  'High Protein Quesarito': 'Quesarito',
  'Triple Steak Stack': 'Triple Steak Stack',
  'Dairy-Free McChicken': 'McChicken',
  'Egg McMuffin Classic': 'Egg McMuffin',
  'Bacon Egg and Cheese Biscuit': 'Bacon Egg and Cheese Biscuit',
  'Dairy-Free Popeyes Sandwich': 'Popeyes Chicken Sandwich',
  'GF Nashville Hot Chicken Tenders': 'Nashville Hot Chicken Tenders',
  'Keto Buffalo Wild Wings': 'Buffalo Wings',
  'Keto Low-Sodium Bacon Wrapped Chicken': 'Bacon Wrapped Chicken',
  'Crispy Fried Chicken': 'Fried Chicken',
  'Cauliflower Crust Pizza Hut Style': 'Pizza',
  'Traditional Pepperoni Pizza': 'Pizza',
  'Gluten-Free Chipotle Bowl': 'Chipotle Bowl',
  'Gluten-Free Dairy-Free Fish Tacos': 'Fish Tacos',
  'High Protein Chicken Caesar Salad Wrap': 'Chicken Caesar Wrap',
  'Chicken Caesar Wraps with Greek Yogurt Dressing': 'Chicken Caesar Wrap',
  'High Protein Low-Carb Greek Chicken': 'Greek Chicken',
  'High Protein Dairy-Free Chicken Bowl': 'Chicken Bowl',
  'Low-Sodium Asian Chicken Salad': 'Asian Chicken Salad',
  'Asian Sesame Chicken Salad': 'Asian Chicken Salad',
  'Low-Sodium Grilled Chicken Sandwich': 'Grilled Chicken Sandwich',
  'Vegan High-Protein Tofu Stir Fry': 'Tofu Stir Fry',
  'Vegetarian Keto Stuffed Peppers': 'Stuffed Peppers',
  'Vegetarian Low-Carb Egg Wrap': 'Egg Wrap',
  'Chia Pudding': 'Chia Pudding',
  'Chia Pudding Parfait': 'Chia Pudding',
  'Teriyaki Salmon Rice Bowl': 'Salmon Rice Bowl',
  'TikTok Salmon Rice Bowl': 'Salmon Rice Bowl',
  'Slow Cooker Beef Stew': 'Beef Stew',
  'Slow Cooker Butter Chicken': 'Butter Chicken',
  'Slow Cooker Chili': 'Chili',
  'White Chicken Chili': 'Chili',
  'Crockpot BBQ Ribs': 'BBQ Ribs',
  'Crockpot Lentil Soup': 'Lentil Soup',
  'Crockpot Pot Roast': 'Pot Roast',
  'Sheet Pan Salmon & Asparagus': 'Salmon & Asparagus',
  'Sheet Pan Fajitas': 'Fajitas',
  'Sausage & Peppers Sheet Pan': 'Sausage & Peppers',
  'Teriyaki Chicken Sheet Pan': 'Teriyaki Chicken',
  'Italian Sheet Pan Chicken': 'Italian Chicken',
  'Healthy Mac and Cheese': 'Mac and Cheese',
  'Healthy Turkey Bolognese': 'Turkey Bolognese',
  'Protein Pancakes': 'Pancakes',
  'Protein Brownies': 'Brownies',
  'Protein Ice Cream': 'Ice Cream',
};

function extractBaseName(title: string): string {
  // Check manual overrides first
  if (MANUAL_GROUP_MAP[title]) return MANUAL_GROUP_MAP[title];

  let name = title;
  // Strip prefixes
  for (const re of STRIP_PREFIXES) {
    name = name.replace(re, '');
  }
  // Strip suffixes
  for (const re of STRIP_SUFFIXES) {
    name = name.replace(re, '');
  }
  return name.trim() || title;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Main migration ──

interface RecipeRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  cuisineStyle: string | null;
  proteinType: string | null;
  ingredients: string;
  instructions: string;
  nutrition: string | null;
  dietaryTags: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servings: number;
  difficulty: string | null;
  isFeatured: boolean;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Recipe → Concept Migration');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Load all published recipes
  const recipes = await prisma.recipe.findMany({
    where: { isPublished: true },
    select: {
      id: true, title: true, slug: true, description: true, brand: true,
      category: true, cuisineStyle: true, proteinType: true,
      ingredients: true, instructions: true, nutrition: true,
      dietaryTags: true, prepTimeMinutes: true, cookTimeMinutes: true,
      totalTimeMinutes: true, servings: true, difficulty: true, isFeatured: true,
    },
  });
  console.log(`Found ${recipes.length} published recipes\n`);

  // 2. Group by base name
  const groups = new Map<string, RecipeRow[]>();
  for (const r of recipes) {
    const baseName = extractBaseName(r.title);
    const existing = groups.get(baseName) || [];
    existing.push(r);
    groups.set(baseName, existing);
  }

  console.log(`Grouped into ${groups.size} concepts:\n`);
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [baseName, members] of sortedGroups) {
    if (members.length > 1) {
      console.log(`  ★ "${baseName}" (${members.length} variants):`);
      for (const m of members) {
        const tags = m.dietaryTags ? JSON.parse(m.dietaryTags) : [];
        const vt = inferVariantType(m.title, tags);
        console.log(`      → "${m.title}" → variant: ${vt}`);
      }
    } else {
      const tags = members[0].dietaryTags ? JSON.parse(members[0].dietaryTags) : [];
      const vt = inferVariantType(members[0].title, tags);
      console.log(`  · "${baseName}" ← "${members[0].title}" → variant: ${vt}`);
    }
  }

  console.log('\n─── Starting migration in transaction ───\n');

  // 3. Migrate in a transaction
  const stats = { conceptsCreated: 0, variantsCreated: 0, duplicatesConsolidated: 0 };

  await prisma.$transaction(async (tx) => {
    for (const [baseName, members] of sortedGroups) {
      const slug = slugify(baseName);

      // Skip if concept already exists (from admin/test)
      const existing = await tx.recipeConcept.findUnique({ where: { slug } });
      if (existing) {
        console.log(`  [skip] Concept "${baseName}" already exists (${existing.id})`);
        continue;
      }

      // Pick the "best" recipe for concept metadata (prefer featured, then most tags)
      const primary = members.reduce((best, cur) => {
        if (cur.isFeatured && !best.isFeatured) return cur;
        const curTags = cur.dietaryTags ? JSON.parse(cur.dietaryTags).length : 0;
        const bestTags = best.dietaryTags ? JSON.parse(best.dietaryTags).length : 0;
        return curTags > bestTags ? cur : best;
      }, members[0]);

      const concept = await tx.recipeConcept.create({
        data: {
          name: baseName,
          slug,
          tagline: primary.description?.substring(0, 80) || null,
          description: primary.description,
          category: primary.category,
          cuisineStyle: primary.cuisineStyle,
          proteinType: primary.proteinType,
          trendSource: primary.brand ? `fast-food-remake` : 'manual',
          status: 'published',
          publishedAt: new Date(),
        },
      });
      stats.conceptsCreated++;
      console.log(`  [concept] Created "${baseName}" (${concept.id})`);

      if (members.length > 1) {
        stats.duplicatesConsolidated += members.length - 1;
      }

      // Track which variant types we've used for this concept (avoid duplicate types)
      const usedTypes = new Set<string>();

      for (const recipe of members) {
        const tags: string[] = recipe.dietaryTags ? JSON.parse(recipe.dietaryTags) : [];
        let variantType = inferVariantType(recipe.title, tags);

        // If this variant type is already used, try to find a more specific one
        if (usedTypes.has(variantType)) {
          // Try secondary inference from tags
          if (tags.includes('dairy-free') && !usedTypes.has('dairy-free')) variantType = 'dairy-free';
          else if (tags.includes('vegan') && !usedTypes.has('vegan')) variantType = 'vegan';
          else if (tags.includes('keto') && !usedTypes.has('keto')) variantType = 'keto';
          else if (tags.includes('high-protein') && !usedTypes.has('high-protein')) variantType = 'high-protein';
          else if (tags.includes('quick') && !usedTypes.has('quick')) variantType = 'quick';
          else if (tags.includes('budget-friendly') && !usedTypes.has('budget')) variantType = 'budget';
          else {
            // Append a suffix to make unique
            let suffix = 2;
            while (usedTypes.has(`${variantType}-${suffix}`)) suffix++;
            variantType = `${variantType}-${suffix}`;
          }
        }
        usedTypes.add(variantType);

        const totalTime = recipe.totalTimeMinutes
          || ((recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0))
          || null;

        await tx.recipeVariant.create({
          data: {
            conceptId: concept.id,
            variantType,
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            nutrition: recipe.nutrition,
            prepTimeMinutes: recipe.prepTimeMinutes,
            cookTimeMinutes: recipe.cookTimeMinutes,
            totalTimeMinutes: totalTime,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            dietaryTags: recipe.dietaryTags || '[]',
            isDefault: variantType === 'classic',
            status: 'published',
          },
        });
        stats.variantsCreated++;
        console.log(`    [variant] "${recipe.title}" → ${variantType}`);
      }
    }
  }, { timeout: 120000 });

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Concepts created:         ${stats.conceptsCreated}`);
  console.log(`  Variants created:         ${stats.variantsCreated}`);
  console.log(`  Duplicates consolidated:  ${stats.duplicatesConsolidated}`);
  console.log('═══════════════════════════════════════════════════\n');

  // 4. Verification
  await verify();

  await prisma.$disconnect();
}

async function verify() {
  console.log('\n─── Verification ───\n');

  const totalRecipes = await prisma.recipe.count({ where: { isPublished: true } });
  const totalConcepts = await prisma.recipeConcept.count({ where: { status: 'published' } });
  const totalVariants = await prisma.recipeVariant.count({ where: { status: 'published' } });

  console.log(`  Published recipes:  ${totalRecipes}`);
  console.log(`  Published concepts: ${totalConcepts}`);
  console.log(`  Published variants: ${totalVariants}`);

  // Check for concepts with no variants
  const emptyConceptsRaw = await prisma.recipeConcept.findMany({
    where: { status: 'published' },
    include: { _count: { select: { variants: true } } },
  });
  const emptyConcepts = emptyConceptsRaw.filter(c => c._count.variants === 0);
  if (emptyConcepts.length > 0) {
    console.log(`  ⚠ Concepts with NO variants: ${emptyConcepts.length}`);
    for (const c of emptyConcepts) {
      console.log(`    - "${c.name}" (${c.id})`);
    }
  } else {
    console.log(`  ✓ All concepts have at least 1 variant`);
  }

  // Check for duplicate slugs
  const slugCounts = await prisma.$queryRawUnsafe<Array<{ slug: string; cnt: number }>>(
    `SELECT slug, COUNT(*) as cnt FROM recipe_concepts GROUP BY slug HAVING cnt > 1`
  );
  if (slugCounts.length > 0) {
    console.log(`  ⚠ Duplicate concept slugs found:`);
    for (const s of slugCounts) {
      console.log(`    - "${s.slug}" appears ${s.cnt} times`);
    }
  } else {
    console.log(`  ✓ No duplicate concept slugs`);
  }

  // Check variant coverage
  const conceptsWithCounts = await prisma.recipeConcept.findMany({
    where: { status: 'published' },
    include: { _count: { select: { variants: { where: { status: 'published' } } } } },
    orderBy: { name: 'asc' },
  });

  const singleVariant = conceptsWithCounts.filter(c => c._count.variants === 1);
  const multiVariant = conceptsWithCounts.filter(c => c._count.variants > 1);
  console.log(`  Single-variant concepts: ${singleVariant.length}`);
  console.log(`  Multi-variant concepts:  ${multiVariant.length}`);
  console.log(`\n  ✓ Verification complete`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
