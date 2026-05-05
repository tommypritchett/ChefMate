/**
 * Generate missing variants for all migrated concepts.
 *
 * For each published concept, checks which variant types already exist,
 * then generates the missing ones via OpenAI. Auto-publishes all generated variants.
 *
 * Run: npx ts-node src/scripts/generate-missing-variants.ts
 */

import prisma from '../lib/prisma';
import { generateConceptVariants } from '../services/concepts/generation';
import { VARIANT_TYPES } from '../services/concepts/variant-types';

// Core variant types to generate for every concept
const TARGET_VARIANTS = ['classic', 'high-protein', 'keto', 'vegan', 'dairy-free', 'quick'];

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Generate Missing Variants');
  console.log('═══════════════════════════════════════════════════\n');

  const concepts = await prisma.recipeConcept.findMany({
    where: { status: 'published' },
    include: {
      variants: { select: { variantType: true, status: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${concepts.length} published concepts\n`);

  let totalGenerated = 0;
  let totalErrors = 0;
  const allWarnings: string[] = [];

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];
    const existingTypes = new Set(concept.variants.map((v) => v.variantType));
    const missingTypes = TARGET_VARIANTS.filter((t) => !existingTypes.has(t));

    if (missingTypes.length === 0) {
      console.log(`[${i + 1}/${concepts.length}] "${concept.name}" — all variants present, skipping`);
      continue;
    }

    console.log(`[${i + 1}/${concepts.length}] "${concept.name}" — generating ${missingTypes.length} missing: ${missingTypes.join(', ')}`);

    try {
      const result = await generateConceptVariants(concept.id, missingTypes);
      totalGenerated += result.created;
      if (result.warnings.length > 0) {
        allWarnings.push(...result.warnings.map((w) => `[${concept.name}] ${w}`));
      }
    } catch (err: any) {
      console.error(`  ERROR generating for "${concept.name}":`, err.message);
      totalErrors++;
    }

    // Small delay between concepts to avoid rate limiting
    if (i < concepts.length - 1 && missingTypes.length > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Auto-publish all draft variants
  console.log('\n─── Auto-publishing generated variants ───\n');
  const publishResult = await prisma.recipeVariant.updateMany({
    where: { status: 'draft' },
    data: { status: 'published' },
  });
  console.log(`Published ${publishResult.count} variants`);

  // Ensure every concept with only non-classic variants has a default
  const conceptsNeedingDefault = await prisma.recipeConcept.findMany({
    where: { status: 'published' },
    include: {
      variants: {
        where: { status: 'published' },
        select: { id: true, variantType: true, isDefault: true },
      },
    },
  });

  let defaultsSet = 0;
  for (const c of conceptsNeedingDefault) {
    const hasDefault = c.variants.some((v) => v.isDefault);
    if (!hasDefault && c.variants.length > 0) {
      // Prefer classic, then first variant
      const classicVariant = c.variants.find((v) => v.variantType === 'classic');
      const targetId = classicVariant?.id || c.variants[0].id;
      await prisma.recipeVariant.update({
        where: { id: targetId },
        data: { isDefault: true },
      });
      defaultsSet++;
    }
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  Generation Summary`);
  console.log(`═══════════════════════════════════════════════════`);
  console.log(`  Variants generated:  ${totalGenerated}`);
  console.log(`  Errors:              ${totalErrors}`);
  console.log(`  Defaults set:        ${defaultsSet}`);
  console.log(`  Warnings:            ${allWarnings.length}`);
  if (allWarnings.length > 0) {
    console.log(`\n  Warnings:`);
    for (const w of allWarnings) {
      console.log(`    - ${w}`);
    }
  }
  console.log(`═══════════════════════════════════════════════════\n`);

  // Final verification
  const totalVariants = await prisma.recipeVariant.count({ where: { status: 'published' } });
  const totalConcepts = await prisma.recipeConcept.count({ where: { status: 'published' } });
  console.log(`Final state: ${totalConcepts} concepts, ${totalVariants} published variants`);
  console.log(`Average variants per concept: ${(totalVariants / totalConcepts).toFixed(1)}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
