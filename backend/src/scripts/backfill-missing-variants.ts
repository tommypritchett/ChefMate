/**
 * Backfill missing variant types + cleanup duplicates + normalize dietary tags.
 *
 * Three phases:
 *   1. CLEANUP: delete orphaned "-2" duplicate variants
 *   2. NORMALIZE: rewrite dietaryTags on every variant to canonical mapping (kills the
 *      "Classic shows as High-Protein" UI bug where a classic variant had stray tags)
 *   3. GENERATE: create missing variant types (low-carb, vegetarian, gluten-free) for
 *      every concept via GPT-4o, validating + retrying on failure
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-missing-variants.ts             # dry-run
 *   npx ts-node src/scripts/backfill-missing-variants.ts --execute   # mutate DB
 *   npx ts-node src/scripts/backfill-missing-variants.ts --execute --types low-carb
 *   npx ts-node src/scripts/backfill-missing-variants.ts --execute --concept asian-chicken-salad
 *   npx ts-node src/scripts/backfill-missing-variants.ts --execute --skip-generation
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { openai } from '../services/openai/client';
import { VARIANT_TYPES, getVariantPromptModifier, getVariantDietaryTags } from '../services/concepts/variant-types';
import {
  validateVariant,
  buildStrictPromptForFailures,
  getRuleStatement,
  type Ingredient,
  type NutritionData,
  type VariantFailure,
} from '../services/concepts/variant-validator';

const REGEN_MODEL = process.env.OPENAI_REGEN_MODEL || 'gpt-4o';
const BATCH_SIZE = 3;
const TARGET_NEW_TYPES = ['low-carb', 'vegetarian', 'gluten-free'];

interface CliFlags {
  execute: boolean;
  types: string[];
  concept?: string;
  skipGeneration: boolean;
  skipNormalize: boolean;
  skipCleanup: boolean;
  limit?: number;
}

function parseFlags(): CliFlags {
  const argv = process.argv.slice(2);
  const flags: CliFlags = {
    execute: false,
    types: [...TARGET_NEW_TYPES],
    skipGeneration: false,
    skipNormalize: false,
    skipCleanup: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') flags.execute = true;
    else if (a === '--types') flags.types = argv[++i].split(',');
    else if (a === '--concept') flags.concept = argv[++i];
    else if (a === '--skip-generation') flags.skipGeneration = true;
    else if (a === '--skip-normalize') flags.skipNormalize = true;
    else if (a === '--skip-cleanup') flags.skipCleanup = true;
    else if (a === '--limit') flags.limit = parseInt(argv[++i], 10);
  }
  return flags;
}

interface GeneratedVariant {
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: Array<{ step_number: number; text: string; time_minutes?: number }>;
  nutrition: NutritionData;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty?: string;
}

const GENERATION_SYSTEM_PROMPT = `You are a professional recipe developer and certified nutritionist for the Kitcho AI cooking app.

Generate a complete recipe variant for the given concept and variant type. The variant MUST satisfy the dietary/macro rules stated in the user message.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "title": "Recipe Title",
  "description": "One-sentence description",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup", "notes": "optional"}],
  "instructions": [{"step_number": 1, "text": "Step text", "time_minutes": 5}],
  "nutrition": {"calories": 450, "protein": 35, "carbs": 40, "fat": 15, "fiber": 5, "sodium": 600},
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 20,
  "servings": 4,
  "difficulty": "easy"
}

Nutrition values are PER SERVING. Always include fiber and sodium. Use realistic portion sizes. Difficulty must be "easy", "medium", or "hard".`;

async function generateVariant(
  conceptName: string,
  conceptCategory: string | null,
  variantType: string,
  strictAddendum?: string,
): Promise<GeneratedVariant | null> {
  const modifier = getVariantPromptModifier(variantType);
  const rule = getRuleStatement(variantType);

  const userPrompt = `Concept: "${conceptName}" (category: ${conceptCategory || 'general'})
Variant type: ${variantType}

Variant instructions:
${modifier}

REQUIRED RULES:
${rule}
${strictAddendum ? `\n${strictAddendum}\n` : ''}
Generate the complete variant now.`;

  const resp = await openai.chat.completions.create({
    model: REGEN_MODEL,
    messages: [
      { role: 'system', content: GENERATION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as GeneratedVariant;
    if (!parsed.ingredients || !parsed.nutrition || !parsed.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface GenerationLog {
  conceptId: string;
  conceptName: string;
  variantType: string;
  attempts: number;
  success: boolean;
  finalNutrition?: NutritionData;
  finalFailures: VariantFailure[];
  timestamp: string;
}

async function generateOne(
  concept: { id: string; name: string; category: string | null },
  variantType: string,
): Promise<GenerationLog> {
  let attempts = 0;
  let generated: GeneratedVariant | null = null;
  let validation = { valid: false, failures: [] as VariantFailure[] };

  // Attempt 1
  attempts++;
  generated = await generateVariant(concept.name, concept.category, variantType);
  if (generated) {
    validation = validateVariant(variantType, generated.nutrition, generated.ingredients);
  } else {
    validation = { valid: false, failures: [{ rule: 'gen:no-output', detail: 'GPT returned no/invalid JSON', category: 'sanity' }] };
  }

  // Attempt 2 with strict addendum
  if (!validation.valid && generated) {
    attempts++;
    const strict = buildStrictPromptForFailures(variantType, validation.failures);
    generated = await generateVariant(concept.name, concept.category, variantType, strict);
    if (generated) {
      validation = validateVariant(variantType, generated.nutrition, generated.ingredients);
    }
  }

  if (generated) {
    const dietaryTags = getVariantDietaryTags(variantType);
    const prep = generated.prepTimeMinutes || 0;
    const cook = generated.cookTimeMinutes || 0;
    await prisma.recipeVariant.create({
      data: {
        conceptId: concept.id,
        variantType,
        title: generated.title,
        description: generated.description || null,
        ingredients: JSON.stringify(generated.ingredients),
        instructions: JSON.stringify(generated.instructions || []),
        nutrition: JSON.stringify(generated.nutrition),
        prepTimeMinutes: prep || null,
        cookTimeMinutes: cook || null,
        totalTimeMinutes: prep + cook || null,
        servings: generated.servings || 4,
        difficulty: generated.difficulty || 'medium',
        dietaryTags: JSON.stringify(dietaryTags),
        isDefault: false,
        status: 'published',
      },
    });
  }

  return {
    conceptId: concept.id,
    conceptName: concept.name,
    variantType,
    attempts,
    success: validation.valid,
    finalNutrition: generated?.nutrition,
    finalFailures: validation.failures,
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  const flags = parseFlags();
  console.log(`\n=== Backfill Missing Variants ===`);
  console.log(`Mode: ${flags.execute ? 'EXECUTE (mutates DB)' : 'DRY-RUN (no writes)'}`);
  console.log(`New types to generate: ${flags.types.join(', ')}`);
  if (flags.concept) console.log(`Concept filter: ${flags.concept}`);
  if (flags.limit) console.log(`Limit: ${flags.limit}`);
  console.log('');

  // ---------- Phase 1: Cleanup duplicate -2 variants ----------
  if (!flags.skipCleanup) {
    const dupes = await prisma.recipeVariant.findMany({
      where: { variantType: { contains: '-' } },
      select: { id: true, variantType: true, conceptId: true, concept: { select: { name: true } } },
    });
    const orphans = dupes.filter((d) => /-\d+$/.test(d.variantType));

    console.log(`Phase 1: Cleanup duplicates`);
    console.log(`  Found ${orphans.length} duplicate "-N" variants:`);
    for (const o of orphans) {
      console.log(`    • ${o.concept.name} → ${o.variantType} (${o.id})`);
    }
    if (flags.execute && orphans.length > 0) {
      const result = await prisma.recipeVariant.deleteMany({
        where: { id: { in: orphans.map((o) => o.id) } },
      });
      console.log(`  ✅ Deleted ${result.count} duplicate variants.`);
    }
    console.log('');
  }

  // ---------- Phase 2: Normalize dietary tags ----------
  if (!flags.skipNormalize) {
    const all = await prisma.recipeVariant.findMany({
      select: { id: true, variantType: true, dietaryTags: true, concept: { select: { name: true } } },
    });
    let mismatched = 0;
    const updates: Array<{ id: string; canonical: string }> = [];
    for (const v of all) {
      const canonical = getVariantDietaryTags(v.variantType);
      const canonicalJson = JSON.stringify(canonical);
      if (v.dietaryTags !== canonicalJson) {
        mismatched++;
        updates.push({ id: v.id, canonical: canonicalJson });
      }
    }
    console.log(`Phase 2: Normalize dietary tags`);
    console.log(`  ${mismatched} of ${all.length} variants have non-canonical tags.`);
    if (flags.execute && mismatched > 0) {
      // Batch via transaction
      await prisma.$transaction(
        updates.map((u) =>
          prisma.recipeVariant.update({
            where: { id: u.id },
            data: { dietaryTags: u.canonical },
          }),
        ),
      );
      console.log(`  ✅ Normalized ${mismatched} variants.`);
    }
    console.log('');
  }

  // ---------- Phase 3: Generate missing variants ----------
  if (flags.skipGeneration) {
    console.log(`Phase 3: SKIPPED (--skip-generation)\n`);
    await prisma.$disconnect();
    return;
  }

  // Validate types are known
  for (const t of flags.types) {
    if (!VARIANT_TYPES[t]) {
      console.error(`❌ Unknown variant type: ${t}`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  // Find concepts missing each target type
  const conceptWhere = flags.concept ? { slug: flags.concept } : {};
  const concepts = await prisma.recipeConcept.findMany({
    where: conceptWhere,
    select: {
      id: true,
      name: true,
      category: true,
      variants: { select: { variantType: true }, where: { status: 'published' } },
    },
    ...(flags.limit ? { take: flags.limit } : {}),
  });

  const work: Array<{ concept: { id: string; name: string; category: string | null }; variantType: string }> = [];
  for (const c of concepts) {
    const existing = new Set(c.variants.map((v) => v.variantType));
    for (const t of flags.types) {
      if (!existing.has(t)) {
        work.push({ concept: { id: c.id, name: c.name, category: c.category }, variantType: t });
      }
    }
  }

  console.log(`Phase 3: Generate missing variants`);
  console.log(`  Concepts scanned: ${concepts.length}`);
  console.log(`  Variants to generate: ${work.length}`);
  if (work.length === 0) {
    console.log(`  ✅ Nothing missing.\n`);
    await prisma.$disconnect();
    return;
  }

  // Show breakdown
  const byType: Record<string, number> = {};
  for (const w of work) byType[w.variantType] = (byType[w.variantType] || 0) + 1;
  for (const [t, n] of Object.entries(byType)) {
    console.log(`    • ${t}: ${n} concepts missing`);
  }
  console.log('');

  if (!flags.execute) {
    console.log(`💡 Re-run with --execute to generate ${work.length} variants via ${REGEN_MODEL}.\n`);
    await prisma.$disconnect();
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set. Aborting.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`🔧 Generating ${work.length} variants using ${REGEN_MODEL}…\n`);
  const logs: GenerationLog[] = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < work.length; i += BATCH_SIZE) {
    const batch = work.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((w) => generateOne(w.concept, w.variantType)));
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        logs.push(r.value);
        if (r.value.success) success++;
        else failed++;
        const status = r.value.success ? '✅' : '⚠️';
        console.log(
          `${status} [${i + j + 1}/${work.length}] ${r.value.conceptName} (${r.value.variantType}) — ${r.value.attempts} attempt(s)`,
        );
      } else {
        failed++;
        console.log(`❌ [${i + j + 1}/${work.length}] ${batch[j].concept.name} (${batch[j].variantType}) — ${r.reason}`);
      }
    }
  }

  const logPath = path.join(process.cwd(), `backfill-log-${Date.now()}.jsonl`);
  fs.writeFileSync(logPath, logs.map((l) => JSON.stringify(l)).join('\n'));

  console.log(`\n=== Summary ===`);
  console.log(`Total to generate: ${work.length}`);
  console.log(`Generated + valid: ${success}`);
  console.log(`Generated + still failing: ${failed}`);
  console.log(`Log: ${logPath}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
