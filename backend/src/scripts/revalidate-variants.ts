/**
 * Revalidate every published RecipeVariant and auto-correct failures via GPT-4o.
 *
 * Usage:
 *   npx ts-node src/scripts/revalidate-variants.ts             # audit-only (no writes)
 *   npx ts-node src/scripts/revalidate-variants.ts --execute   # regenerate failures + write
 *   npx ts-node src/scripts/revalidate-variants.ts --execute --concept <slug>
 *   npx ts-node src/scripts/revalidate-variants.ts --execute --limit 5
 *   npx ts-node src/scripts/revalidate-variants.ts --execute --type keto
 *
 * Two-phase by default: audit prints a report, then exits. --execute mutates DB.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { openai } from '../services/openai/client';
import {
  validateVariant,
  buildStrictPromptForFailures,
  getRuleStatement,
  normalizeVariantType,
  type Ingredient,
  type NutritionData,
  type VariantFailure,
} from '../services/concepts/variant-validator';

// ---------- Config ----------

const REGEN_MODEL = process.env.OPENAI_REGEN_MODEL || 'gpt-4o';
const BATCH_SIZE = 3; // concurrent regen calls
const REGEN_TEMPERATURE = 0.4; // lower = more compliance with strict rules

interface CliFlags {
  execute: boolean;
  concept?: string;
  type?: string;
  limit?: number;
}

function parseFlags(): CliFlags {
  const argv = process.argv.slice(2);
  const flags: CliFlags = { execute: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') flags.execute = true;
    else if (a === '--concept') flags.concept = argv[++i];
    else if (a === '--type') flags.type = argv[++i];
    else if (a === '--limit') flags.limit = parseInt(argv[++i], 10);
  }
  return flags;
}

// ---------- DB types ----------

interface VariantRow {
  id: string;
  conceptId: string;
  variantType: string;
  title: string;
  ingredients: string;
  instructions: string;
  nutrition: string | null;
  servings: number;
  concept: { id: string; name: string; slug: string; category: string | null };
}

interface ParsedVariant {
  row: VariantRow;
  ingredients: Ingredient[];
  instructions: Array<{ step_number: number; text: string; time_minutes?: number }>;
  nutrition: NutritionData;
}

interface AuditEntry {
  variantId: string;
  conceptName: string;
  conceptSlug: string;
  variantType: string;
  failures: VariantFailure[];
}

interface CorrectionLog {
  variantId: string;
  conceptName: string;
  variantType: string;
  attempts: number;
  before: { nutrition: NutritionData; failures: VariantFailure[] };
  after: { nutrition: NutritionData; failures: VariantFailure[]; success: boolean };
  ingredientsChanged: boolean;
  timestamp: string;
}

// ---------- Helpers ----------

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function parseVariant(row: VariantRow): ParsedVariant | null {
  const ingredients = safeParse<Ingredient[]>(row.ingredients, []);
  const instructions = safeParse<Array<{ step_number: number; text: string; time_minutes?: number }>>(
    row.instructions,
    [],
  );
  const nutrition = safeParse<NutritionData | null>(row.nutrition, null);
  if (!nutrition) return null;
  return { row, ingredients, instructions, nutrition };
}

// ---------- GPT-4o regeneration ----------

const REGEN_SYSTEM_PROMPT = `You are a professional recipe developer and certified nutritionist for the Kitcho AI cooking app.

You will be given:
- An existing recipe variant (concept, type, title, current steps)
- A specific dietary/macro rule the variant MUST satisfy

Your job: regenerate the INGREDIENTS list and NUTRITION numbers ONLY. Keep the cooking technique and step structure intact (you may lightly adjust step text to reference new ingredients). Use realistic per-serving portion sizes. Return ONLY valid JSON, no markdown:

{
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup", "notes": "optional"}],
  "instructions": [{"step_number": 1, "text": "Step text", "time_minutes": 5}],
  "nutrition": {"calories": 450, "protein": 35, "carbs": 40, "fat": 15, "fiber": 5, "sodium": 600}
}

Nutrition values are PER SERVING. Always include fiber and sodium. Preserve the same number of servings as the original.`;

async function regenerateVariant(
  variant: ParsedVariant,
  strictAddendum?: string,
): Promise<{ ingredients: Ingredient[]; instructions: ParsedVariant['instructions']; nutrition: NutritionData } | null> {
  const { row, ingredients, instructions, nutrition } = variant;
  const ruleStatement = getRuleStatement(row.variantType);
  const t = normalizeVariantType(row.variantType);

  const userPrompt = `Concept: "${row.concept.name}" (category: ${row.concept.category || 'general'})
Variant type: ${t}
Title: ${row.title}
Servings: ${row.servings}

CURRENT (failing) ingredients:
${JSON.stringify(ingredients, null, 2)}

CURRENT (failing) nutrition: ${JSON.stringify(nutrition)}

CURRENT step structure (preserve technique):
${instructions.map((s) => `${s.step_number}. ${s.text}`).join('\n')}

REQUIRED RULES for "${t}" variant:
${ruleStatement}

${strictAddendum ? `\n${strictAddendum}\n` : ''}
Regenerate now.`;

  const resp = await openai.chat.completions.create({
    model: REGEN_MODEL,
    messages: [
      { role: 'system', content: REGEN_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: REGEN_TEMPERATURE,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (!parsed.ingredients || !parsed.nutrition) return null;
    return {
      ingredients: parsed.ingredients,
      instructions: parsed.instructions || instructions,
      nutrition: parsed.nutrition,
    };
  } catch {
    return null;
  }
}

// ---------- Main ----------

async function main() {
  const flags = parseFlags();
  console.log(`\n=== Recipe Variant Revalidation ===`);
  console.log(`Mode: ${flags.execute ? 'EXECUTE (mutates DB)' : 'AUDIT-ONLY (no writes)'}`);
  if (flags.concept) console.log(`Filter: concept slug = ${flags.concept}`);
  if (flags.type) console.log(`Filter: variant type = ${flags.type}`);
  if (flags.limit) console.log(`Limit: ${flags.limit} variants`);
  console.log('');

  // Build query
  const where: Record<string, unknown> = { status: 'published' };
  if (flags.type) where.variantType = flags.type;
  if (flags.concept) where.concept = { slug: flags.concept };

  const variants = (await prisma.recipeVariant.findMany({
    where,
    include: {
      concept: { select: { id: true, name: true, slug: true, category: true } },
    },
    orderBy: [{ concept: { name: 'asc' } }, { variantType: 'asc' }],
    ...(flags.limit ? { take: flags.limit } : {}),
  })) as unknown as VariantRow[];

  console.log(`Loaded ${variants.length} published variants.\n`);

  // Phase 1: Audit
  const audit: AuditEntry[] = [];
  let unparseable = 0;

  for (const v of variants) {
    const parsed = parseVariant(v);
    if (!parsed) {
      unparseable++;
      audit.push({
        variantId: v.id,
        conceptName: v.concept.name,
        conceptSlug: v.concept.slug,
        variantType: v.variantType,
        failures: [{ rule: 'sanity:unparseable', detail: 'Missing or malformed nutrition JSON', category: 'sanity' }],
      });
      continue;
    }
    const result = validateVariant(v.variantType, parsed.nutrition, parsed.ingredients);
    if (!result.valid) {
      audit.push({
        variantId: v.id,
        conceptName: v.concept.name,
        conceptSlug: v.concept.slug,
        variantType: v.variantType,
        failures: result.failures,
      });
    }
  }

  // Audit report
  printAuditReport(variants.length, audit, unparseable);

  if (audit.length === 0) {
    console.log('✅ All variants pass validation. Nothing to do.');
    await prisma.$disconnect();
    return;
  }

  if (!flags.execute) {
    console.log(`\n💡 Re-run with --execute to auto-correct ${audit.length} failing variants via GPT-4o.\n`);
    await prisma.$disconnect();
    return;
  }

  // Phase 2: Regenerate failures
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set — cannot regenerate. Aborting.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\n🔧 Beginning auto-correction pass for ${audit.length} variants using ${REGEN_MODEL}…\n`);
  const corrections: CorrectionLog[] = [];
  let fixed = 0;
  let stillFailing = 0;

  for (let i = 0; i < audit.length; i += BATCH_SIZE) {
    const batch = audit.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((entry) => correctOne(entry, variants.find((v) => v.id === entry.variantId)!)),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled' && r.value) {
        corrections.push(r.value);
        if (r.value.after.success) fixed++;
        else stillFailing++;
        const status = r.value.after.success ? '✅' : '⚠️';
        console.log(`${status} [${i + j + 1}/${audit.length}] ${r.value.conceptName} (${r.value.variantType}) — ${r.value.attempts} attempt(s)`);
      } else if (r.status === 'rejected') {
        stillFailing++;
        console.log(`❌ [${i + j + 1}/${audit.length}] ${batch[j].conceptName} (${batch[j].variantType}) — error: ${r.reason}`);
      }
    }
  }

  // Write log file
  const logPath = path.join(process.cwd(), `correction-log-${Date.now()}.jsonl`);
  fs.writeFileSync(logPath, corrections.map((c) => JSON.stringify(c)).join('\n'));

  console.log(`\n=== Summary ===`);
  console.log(`Total failing variants: ${audit.length}`);
  console.log(`Fixed (now passing):    ${fixed}`);
  console.log(`Still failing:          ${stillFailing}`);
  console.log(`Log written to:         ${logPath}`);

  await prisma.$disconnect();
}

async function correctOne(entry: AuditEntry, row: VariantRow): Promise<CorrectionLog | null> {
  const parsed = parseVariant(row);
  if (!parsed) return null;

  const before = { nutrition: parsed.nutrition, failures: entry.failures };

  // Attempt 1: standard regeneration
  let regen = await regenerateVariant(parsed);
  let attempts = 1;

  let validation = regen
    ? validateVariant(row.variantType, regen.nutrition, regen.ingredients)
    : { valid: false, failures: [{ rule: 'regen:no-output', detail: 'GPT returned no/invalid output', category: 'sanity' as const }] };

  // Attempt 2: strict retry with explicit thresholds
  if (!validation.valid && regen) {
    const strictAddendum = buildStrictPromptForFailures(row.variantType, validation.failures);
    regen = await regenerateVariant(parsed, strictAddendum);
    attempts = 2;
    validation = regen
      ? validateVariant(row.variantType, regen.nutrition, regen.ingredients)
      : { valid: false, failures: [{ rule: 'regen:no-output', detail: 'GPT returned no/invalid output on retry', category: 'sanity' as const }] };
  }

  if (regen) {
    // Persist regardless of pass/fail — the new attempt is at least as good as what was there.
    await prisma.recipeVariant.update({
      where: { id: row.id },
      data: {
        ingredients: JSON.stringify(regen.ingredients),
        instructions: JSON.stringify(regen.instructions),
        nutrition: JSON.stringify(regen.nutrition),
        status: 'published',
      },
    });

    // Audit trail
    await prisma.adminAction.create({
      data: {
        conceptId: row.conceptId,
        variantId: row.id,
        action: validation.valid ? 'auto-corrected' : 'auto-corrected-still-failing',
        notes: `Revalidator: ${entry.failures.map((f) => f.rule).join(', ')} → ${attempts} attempt(s)`,
      },
    });
  }

  return {
    variantId: row.id,
    conceptName: row.concept.name,
    variantType: row.variantType,
    attempts,
    before,
    after: regen
      ? { nutrition: regen.nutrition, failures: validation.failures, success: validation.valid }
      : { nutrition: parsed.nutrition, failures: validation.failures, success: false },
    ingredientsChanged: regen != null,
    timestamp: new Date().toISOString(),
  };
}

function printAuditReport(total: number, audit: AuditEntry[], unparseable: number) {
  console.log(`=== Audit Report ===`);
  console.log(`Total scanned:     ${total}`);
  console.log(`Passing:           ${total - audit.length}`);
  console.log(`Failing:           ${audit.length}`);
  console.log(`Unparseable:       ${unparseable}\n`);

  // Group by variant type
  const byType: Record<string, AuditEntry[]> = {};
  for (const a of audit) {
    const t = normalizeVariantType(a.variantType);
    (byType[t] ||= []).push(a);
  }

  console.log(`Failures by variant type:`);
  for (const [t, list] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${t.padEnd(16)} ${list.length}`);
  }
  console.log('');

  // Group by rule
  const byRule: Record<string, number> = {};
  for (const a of audit) {
    for (const f of a.failures) {
      byRule[f.rule] = (byRule[f.rule] || 0) + 1;
    }
  }
  console.log(`Failures by rule:`);
  for (const [r, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${r.padEnd(40)} ${n}`);
  }
  console.log('');

  // Show first 20 specific failures as examples
  console.log(`First 20 failing variants:`);
  for (const a of audit.slice(0, 20)) {
    console.log(`  • ${a.conceptName.padEnd(35)} [${a.variantType}]`);
    for (const f of a.failures.slice(0, 2)) {
      console.log(`      └─ ${f.detail}`);
    }
  }
  if (audit.length > 20) console.log(`  …and ${audit.length - 20} more.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
