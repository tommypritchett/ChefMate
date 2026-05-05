import prisma from '../../lib/prisma';
import { openai, MODEL } from '../openai/client';
import { getVariantPromptModifier, getVariantDietaryTags } from './variant-types';
import { validateMacros, type NutritionData } from './macro-validator';
import { getSeasonalPromptHint } from './seasonal';

interface GeneratedVariant {
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: string; unit: string; notes?: string }>;
  instructions: Array<{ step_number: number; text: string; time_minutes?: number }>;
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: string;
}

const GENERATION_SYSTEM_PROMPT = `You are a professional recipe developer for a cooking app called Kitcho AI.
Generate a complete recipe variant based on the concept and variant type provided.
Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "title": "Recipe Title",
  "description": "One-sentence description",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup", "notes": "optional"}],
  "instructions": [{"step_number": 1, "text": "Step description", "time_minutes": 5}],
  "nutrition": {"calories": 450, "protein": 35, "carbs": 40, "fat": 15},
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 20,
  "servings": 4,
  "difficulty": "easy"
}
Ensure nutrition values are realistic per serving. Difficulty must be "easy", "medium", or "hard".`;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateSingleVariant(
  conceptName: string,
  conceptCategory: string | null,
  variantType: string,
): Promise<GeneratedVariant> {
  const modifier = getVariantPromptModifier(variantType);
  const seasonHint = getSeasonalPromptHint();

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: GENERATION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Recipe concept: "${conceptName}" (category: ${conceptCategory || 'general'})
Variant type: ${variantType}
Variant instructions: ${modifier}
${seasonHint}

Generate the complete recipe variant now.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty response from OpenAI for variant ${variantType}`);
  }

  return JSON.parse(content) as GeneratedVariant;
}

export async function generateConceptVariants(
  conceptId: string,
  variantTypes: string[],
): Promise<{ created: number; warnings: string[] }> {
  const concept = await prisma.recipeConcept.findUnique({
    where: { id: conceptId },
  });

  if (!concept) {
    throw new Error(`Concept ${conceptId} not found`);
  }

  const allWarnings: string[] = [];
  let created = 0;

  // Process in batches of 3 to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < variantTypes.length; i += batchSize) {
    const batch = variantTypes.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((vt) => generateSingleVariant(concept.name, concept.category, vt)),
    );

    for (let j = 0; j < results.length; j++) {
      const variantType = batch[j];
      const result = results[j];

      if (result.status === 'rejected') {
        allWarnings.push(`Failed to generate ${variantType}: ${result.reason}`);
        continue;
      }

      const generated = result.value;

      // Validate nutrition
      const validation = validateMacros(generated.nutrition as NutritionData, variantType);
      if (!validation.valid) {
        allWarnings.push(...validation.warnings.map((w) => `[${variantType}] ${w}`));
      }

      const dietaryTags = getVariantDietaryTags(variantType);
      const totalTime = (generated.prepTimeMinutes || 0) + (generated.cookTimeMinutes || 0);

      await prisma.recipeVariant.create({
        data: {
          conceptId,
          variantType,
          title: generated.title,
          description: generated.description || null,
          ingredients: JSON.stringify(generated.ingredients),
          instructions: JSON.stringify(generated.instructions),
          nutrition: JSON.stringify(generated.nutrition),
          prepTimeMinutes: generated.prepTimeMinutes || null,
          cookTimeMinutes: generated.cookTimeMinutes || null,
          totalTimeMinutes: totalTime || null,
          servings: generated.servings || 4,
          difficulty: generated.difficulty || 'medium',
          dietaryTags: JSON.stringify(dietaryTags),
          isDefault: variantType === 'classic',
          status: 'draft',
        },
      });

      created++;
      console.log(`[concepts] Generated ${variantType} variant for "${concept.name}"`);
    }
  }

  return { created, warnings: allWarnings };
}

export async function createConceptFromTrend(trend: {
  name: string;
  tagline?: string;
  category?: string;
  cuisineStyle?: string;
  trendSource: string;
}): Promise<string> {
  const slug = slugify(trend.name);

  // Check for duplicate
  const existing = await prisma.recipeConcept.findUnique({ where: { slug } });
  if (existing) {
    console.log(`[concepts] Skipping duplicate concept: ${trend.name} (${slug})`);
    return existing.id;
  }

  const concept = await prisma.recipeConcept.create({
    data: {
      name: trend.name,
      slug,
      tagline: trend.tagline || null,
      category: trend.category || null,
      cuisineStyle: trend.cuisineStyle || null,
      trendSource: trend.trendSource,
      status: 'draft',
    },
  });

  console.log(`[concepts] Created concept: "${concept.name}" (${concept.id})`);
  return concept.id;
}
