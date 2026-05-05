import prisma from '../../lib/prisma';

export async function searchRecipes(args: Record<string, any>, _userId: string) {
  const { query, category, difficulty, maxTime, limit = 5 } = args;

  const where: any = { isPublished: true };

  if (category) where.category = category;
  if (difficulty) where.difficulty = difficulty;
  if (maxTime) {
    where.cookTimeMinutes = { lte: maxTime };
  }
  if (query) {
    const q = query.toLowerCase();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { brand: { contains: q } },
      { ingredients: { contains: q } },
      { dietaryTags: { contains: q } },
    ];

    const words = q.split(/\s+/).filter((w: string) => w.length > 2);
    if (words.length > 1) {
      for (const word of words) {
        where.OR.push(
          { title: { contains: word } },
          { ingredients: { contains: word } },
          { dietaryTags: { contains: word } },
        );
      }
    }
  }

  const recipes = await prisma.recipe.findMany({
    where,
    take: Math.min(limit, 10) * 3,
    orderBy: { averageRating: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      brand: true,
      category: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      difficulty: true,
      servings: true,
      averageRating: true,
      nutrition: true,
      dietaryTags: true,
      ingredients: true,
    },
  });

  const seen = new Set<string>();
  const unique = recipes.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  let ranked = unique;
  if (query) {
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter((w: string) => w.length > 2);
    ranked = unique.map(r => {
      let score = 0;
      const titleLower = r.title.toLowerCase();
      const descLower = (r.description || '').toLowerCase();
      const ingredientsLower = (r.ingredients || '').toLowerCase();

      if (titleLower.includes(q)) score += 10;
      if (descLower.includes(q)) score += 5;
      if (ingredientsLower.includes(q)) score += 7;

      for (const word of words) {
        if (titleLower.includes(word)) score += 3;
        if (ingredientsLower.includes(word)) score += 2;
        if (descLower.includes(word)) score += 1;
      }

      return { ...r, _score: score };
    }).sort((a, b) => b._score - a._score);
  }

  const finalRecipes = ranked.slice(0, Math.min(limit, 10));

  const parsed = finalRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    brand: r.brand,
    category: r.category,
    prepTimeMinutes: r.prepTimeMinutes,
    cookTimeMinutes: r.cookTimeMinutes,
    difficulty: r.difficulty,
    servings: r.servings,
    averageRating: r.averageRating,
    nutrition: r.nutrition ? JSON.parse(r.nutrition) : null,
    dietaryTags: r.dietaryTags ? JSON.parse(r.dietaryTags) : [],
  }));

  return {
    result: {
      recipes: parsed,
      count: parsed.length,
      message: parsed.length === 0 ? 'No recipes found matching your criteria.' : undefined,
    },
    metadata: { type: 'recipes', recipeIds: parsed.map((r) => r.id) },
  };
}

export async function getRecipeDetail(args: Record<string, any>, _userId: string) {
  const { recipeId, slug } = args;

  const where: any = {};
  if (recipeId) where.id = recipeId;
  else if (slug) where.slug = slug;
  else return { result: { error: 'Provide either recipeId or slug.' } };

  const recipe = await prisma.recipe.findFirst({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      brand: true,
      category: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      difficulty: true,
      servings: true,
      averageRating: true,
      nutrition: true,
      dietaryTags: true,
      ingredients: true,
      instructions: true,
    },
  });

  if (!recipe) {
    return { result: { error: 'Recipe not found.' } };
  }

  return {
    result: {
      recipe: {
        ...recipe,
        nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
        dietaryTags: recipe.dietaryTags ? JSON.parse(recipe.dietaryTags) : [],
        ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [],
        instructions: recipe.instructions ? JSON.parse(recipe.instructions) : [],
      },
    },
    metadata: { type: 'recipe_detail', recipeId: recipe.id },
  };
}

export async function createCustomRecipe(args: Record<string, any>, userId: string) {
  const { title, requirements, category, proteinTarget, calorieTarget, servings: targetServings } = args;

  if (!process.env.OPENAI_API_KEY) {
    return {
      result: { error: 'Custom recipe generation requires an OpenAI API key. Please set OPENAI_API_KEY.' },
    };
  }

  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const goals = await prisma.healthGoal.findMany({
    where: { userId, isActive: true },
    select: { goalType: true, targetValue: true },
  });
  const goalContext = goals.length > 0
    ? `User's active health goals: ${goals.map(g => `${g.goalType}: ${g.targetValue}`).join(', ')}`
    : '';

  const prompt = `Generate a recipe for: "${title}"
Requirements: ${requirements}
Category: ${category || 'general'}
${proteinTarget ? `Target protein per serving: ${proteinTarget}g` : ''}
${calorieTarget ? `Target calories per serving: ${calorieTarget}` : ''}
${goalContext}

Return a JSON object with EXACTLY these fields:
{
  "title": "Recipe Title",
  "description": "1-2 sentence description",
  "category": "${category || 'general'}",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup", "notes": "optional"}],
  "instructions": [{"step_number": 1, "text": "Step description", "time_minutes": 5}],
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 20,
  "servings": ${targetServings || 2},
  "difficulty": "easy",
  "nutrition": {"calories": 400, "protein": 35, "carbs": 30, "fat": 15},
  "dietaryTags": ["high-protein"],
  "proteinType": "chicken",
  "cuisineStyle": "american",
  "cookingMethod": "stovetop"
}

IMPORTANT:
- Calories MUST equal (protein × 4) + (carbs × 4) + (fat × 9) (Atwater formula)
- Use realistic portions and nutrition values
- Honor the user's dietary goals
- Make it practical and delicious`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { result: { error: 'Failed to generate recipe — no response from AI.' } };
    }

    const recipe = JSON.parse(content);

    const protein = Math.round(recipe.nutrition?.protein || 0);
    const carbs = Math.round(recipe.nutrition?.carbs || 0);
    const fat = Math.round(recipe.nutrition?.fat || 0);
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    recipe.nutrition = { calories: calculatedCalories, protein, carbs, fat };

    const baseSlug = (recipe.title || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-custom-${Date.now().toString(36)}`;

    const saved = await prisma.recipe.create({
      data: {
        title: recipe.title || title,
        slug,
        description: recipe.description || '',
        category: recipe.category || category || null,
        ingredients: JSON.stringify(recipe.ingredients || []),
        instructions: JSON.stringify(recipe.instructions || []),
        prepTimeMinutes: recipe.prepTimeMinutes || null,
        cookTimeMinutes: recipe.cookTimeMinutes || null,
        totalTimeMinutes: (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) || null,
        servings: targetServings || recipe.servings || 2,
        difficulty: recipe.difficulty || 'medium',
        nutrition: JSON.stringify(recipe.nutrition),
        dietaryTags: JSON.stringify(recipe.dietaryTags || []),
        proteinType: recipe.proteinType || null,
        cuisineStyle: recipe.cuisineStyle || null,
        cookingMethod: recipe.cookingMethod || null,
        isAiGenerated: true,
        generatedByUserId: userId,
        generationPrompt: requirements,
        isPublished: true,
      },
    });

    return {
      result: {
        recipe: {
          id: saved.id,
          title: saved.title,
          slug: saved.slug,
          description: saved.description,
          category: saved.category,
          prepTimeMinutes: saved.prepTimeMinutes,
          cookTimeMinutes: saved.cookTimeMinutes,
          servings: saved.servings,
          difficulty: saved.difficulty,
          nutrition: recipe.nutrition,
          dietaryTags: recipe.dietaryTags || [],
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          isAiGenerated: true,
        },
        message: `Created custom recipe "${saved.title}" tailored to your preferences! It's been saved to your recipe database.`,
      },
      metadata: { type: 'custom_recipe', recipeId: saved.id },
    };
  } catch (err: any) {
    console.error('Error generating custom recipe:', err);
    return {
      result: { error: `Failed to generate recipe: ${err.message}` },
    };
  }
}
