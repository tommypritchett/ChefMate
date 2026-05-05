import prisma from '../../lib/prisma';
import { openai, MODEL } from '../openai/client';
import { getSeasonalPromptHint, getCurrentSeason } from './seasonal';

export interface TrendResult {
  name: string;
  tagline: string;
  category: string;
  cuisineStyle: string;
  trendSource: string;
}

const TREND_SCAN_PROMPT = `You are a food trend analyst for a cooking app called Kitcho AI.
Identify 5 trending recipe concepts that would appeal to health-conscious home cooks.
Mix of: viral social media recipes, healthified fast food remakes, and seasonal dishes.

Return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "trends": [
    {
      "name": "Recipe Concept Name",
      "tagline": "Short catchy tagline (under 60 chars)",
      "category": "burgers|mexican|pasta|salad|pizza|bowls|chicken|dessert|breakfast|sides",
      "cuisineStyle": "american|mexican|italian|asian|mediterranean|indian"
    }
  ]
}

Requirements:
- Names should be specific and appetizing (e.g., "Healthy Big Mac Bowl" not "Burger Bowl")
- Include at least 1 fast-food remake, 1 seasonal dish, and 1 viral trend
- Avoid generic names — be creative and specific`;

export async function scanTrends(): Promise<TrendResult[]> {
  const seasonHint = getSeasonalPromptHint();
  const season = getCurrentSeason();

  console.log(`[trend-scanner] Starting trend scan for ${season}...`);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: TREND_SCAN_PROMPT },
      {
        role: 'user',
        content: `${seasonHint}\n\nFind 5 trending recipe concepts for this week. Focus on what's popular on TikTok, Instagram, and food blogs right now.`,
      },
    ],
    temperature: 0.9,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.error('[trend-scanner] Empty response from OpenAI');
    return [];
  }

  let parsed: { trends: Array<{ name: string; tagline: string; category: string; cuisineStyle: string }> };
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error('[trend-scanner] Failed to parse response:', content);
    return [];
  }

  if (!parsed.trends || !Array.isArray(parsed.trends)) {
    console.error('[trend-scanner] Invalid response structure:', parsed);
    return [];
  }

  // Deduplicate against existing concepts
  const existingSlugs = new Set(
    (await prisma.recipeConcept.findMany({ select: { slug: true } }))
      .map((c) => c.slug),
  );

  const results: TrendResult[] = [];
  for (const trend of parsed.trends) {
    const slug = trend.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (existingSlugs.has(slug)) {
      console.log(`[trend-scanner] Skipping duplicate: ${trend.name}`);
      continue;
    }

    results.push({
      name: trend.name,
      tagline: trend.tagline,
      category: trend.category,
      cuisineStyle: trend.cuisineStyle,
      trendSource: `openai-scan-${season}`,
    });
  }

  console.log(`[trend-scanner] Found ${results.length} new trends (filtered ${parsed.trends.length - results.length} duplicates)`);
  return results;
}
