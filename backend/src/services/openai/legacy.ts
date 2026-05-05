import { openai, MODEL } from './client';

interface RecipeGenerationParams {
  prompt: string;
  servings?: number;
  dietaryRestrictions?: string[];
  availableIngredients?: string[];
  maxTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface GeneratedRecipe {
  title: string;
  description: string;
  brand?: string;
  originalItem?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    notes?: string;
    isOptional?: boolean;
  }>;
  instructions: Array<{
    step: number;
    text: string;
    time?: number;
    tips?: string;
  }>;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar?: number;
  };
  originalNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar?: number;
  };
  dietaryTags: string[];
  tips?: string[];
  substitutions?: Array<{
    ingredient: string;
    alternatives: string[];
  }>;
}

const generateFallbackRecipe = (prompt: string): GeneratedRecipe => ({
  title: `Healthy ${prompt} Recipe`,
  description: 'A nutritious homemade version.',
  prepTime: 15,
  cookTime: 25,
  servings: 2,
  difficulty: 'medium',
  ingredients: [
    { name: 'main protein', amount: 1, unit: 'lb', notes: 'lean option' },
    { name: 'vegetables', amount: 2, unit: 'cups', notes: 'mixed, chopped' },
    { name: 'whole grain base', amount: 1, unit: 'cup', notes: 'rice, quinoa, or pasta' },
  ],
  instructions: [
    { step: 1, text: 'Prepare all ingredients.', time: 10 },
    { step: 2, text: 'Cook protein until done.', time: 15 },
    { step: 3, text: 'Add vegetables, cook until tender.', time: 10 },
    { step: 4, text: 'Serve over grain base.', time: 2 },
  ],
  nutrition: { calories: 450, protein: 30, carbs: 40, fat: 15, fiber: 8, sodium: 600 },
  dietaryTags: ['homemade', 'balanced'],
  tips: ['Adjust seasonings to taste'],
});

export const generateRecipe = async (params: RecipeGenerationParams): Promise<GeneratedRecipe> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured.');
  }

  const systemPrompt = `You are ChefMate, a professional chef and nutritionist specializing in creating healthier versions of popular fast food items. Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Create a healthier version of: "${params.prompt}"
Requirements: Servings: ${params.servings || 2}, Dietary: ${params.dietaryRestrictions?.join(', ') || 'none'}, Max time: ${params.maxTime || 45} min, Difficulty: ${params.difficulty || 'any'}

Return JSON with: title, description, brand, originalItem, prepTime, cookTime, servings, difficulty, ingredients[], instructions[], nutrition{}, originalNutrition{}, dietaryTags[], tips[], substitutions[].`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    const recipe = JSON.parse(content) as GeneratedRecipe;
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe structure');
    }
    return recipe;
  } catch (error) {
    console.error('Recipe generation error:', error);
    return generateFallbackRecipe(params.prompt);
  }
};

export const chatWithAssistant = async (
  message: string,
  context?: { type: string; data: any }
): Promise<string> => {
  if (!process.env.OPENAI_API_KEY) {
    return "I'm ChefMate! AI features are in demo mode. Configure your OpenAI API key for full capabilities.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are ChefMate's cooking assistant. Be friendly, concise, practical. ${
            context ? `Context: ${context.type} - ${JSON.stringify(context.data)}` : ''
          }`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "I couldn't process your request.";
  } catch (error) {
    console.error('Chat error:', error);
    return 'Sorry, something went wrong. Please try again.';
  }
};

export const generateInventoryBasedSuggestions = async (
  inventoryItems: string[],
  expiringItems?: string[]
): Promise<string[]> => {
  if (!process.env.OPENAI_API_KEY) {
    return [
      'Quick stir-fry with available vegetables',
      'Simple pasta with pantry ingredients',
      'Protein bowl with available items',
    ];
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Generate practical meal suggestions as a JSON array.',
        },
        {
          role: 'user',
          content: `Ingredients: ${inventoryItems.join(', ')}${
            expiringItems ? `\nExpiring: ${expiringItems.join(', ')}` : ''
          }\n\nReturn: {"meals": ["meal1", ...]}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return parsed.meals || parsed;
    }
  } catch (error) {
    console.error('Inventory suggestions error:', error);
  }

  return [
    'Quick stir-fry with available vegetables',
    'Simple pasta with pantry ingredients',
    'Protein bowl with available items',
  ];
};

// Stub for food detection (requires GPT-4o vision API)
export const detectFoodItems = async (imageBase64: string): Promise<string[]> => {
  // In production, this would use GPT-4o vision to identify food items in a photo
  // For now, return mock detection results
  return ['chicken', 'broccoli', 'rice', 'soy sauce'];
};
