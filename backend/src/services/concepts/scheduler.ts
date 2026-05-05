import cron from 'node-cron';
import { scanTrends } from './trend-scanner';
import { createConceptFromTrend, generateConceptVariants } from './generation';
import { VARIANT_TYPES } from './variant-types';

const DEFAULT_VARIANT_TYPES = ['classic', 'high-protein', 'keto', 'vegan', 'quick'];

async function weeklyConceptGeneration(): Promise<void> {
  console.log('[scheduler] Starting weekly concept generation...');
  const startTime = Date.now();

  try {
    // Step 1: Scan for trending concepts
    const trends = await scanTrends();
    console.log(`[scheduler] Found ${trends.length} new trends`);

    // Step 2: Create concepts and generate variants
    for (const trend of trends) {
      const conceptId = await createConceptFromTrend(trend);

      const { created, warnings } = await generateConceptVariants(
        conceptId,
        DEFAULT_VARIANT_TYPES,
      );

      console.log(`[scheduler] Generated ${created} variants for "${trend.name}"`);
      if (warnings.length > 0) {
        console.warn(`[scheduler] Warnings for "${trend.name}":`, warnings);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[scheduler] Weekly generation complete in ${elapsed}s`);
  } catch (err) {
    console.error('[scheduler] Weekly generation failed:', err);
  }
}

export function initScheduler(): void {
  if (process.env.ENABLE_CONCEPT_SCHEDULER !== 'true') {
    console.log('[scheduler] Concept scheduler disabled (set ENABLE_CONCEPT_SCHEDULER=true to enable)');
    return;
  }

  // Run every Sunday at midnight
  cron.schedule('0 0 * * 0', () => {
    console.log('[scheduler] Triggering weekly concept generation (cron)');
    weeklyConceptGeneration();
  });

  console.log('[scheduler] Concept scheduler initialized — runs every Sunday at midnight');
}

// Export for manual trigger via admin API
export { weeklyConceptGeneration };
