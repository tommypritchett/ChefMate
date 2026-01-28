import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RecipeGenerationParams {
  prompt: string;
  servings?: number;
  dietaryRestrictions?: string[];
  availableIngredients?: string[];
  maxTime?: number; // cooking time in minutes
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

export const generateRecipe = async (params: RecipeGenerationParams): Promise<GeneratedRecipe> => {
  console.log('🔍 generateRecipe called with:', params.prompt);
  console.log('🔑 API Key present:', !!process.env.OPENAI_API_KEY);
  console.log('🔑 API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ No API key found');
    throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.');
  }

  const systemPrompt = `You are ChefMate, a professional chef and nutritionist specializing in creating healthier versions of popular fast food items. Your goal is to recreate beloved fast food flavors using wholesome ingredients and better cooking methods.

Key principles:
1. Maintain the essential flavors and textures that make the original appealing
2. Significantly improve nutritional value (higher protein, more fiber, less sodium, better fats)
3. Use whole food ingredients when possible
4. Make recipes achievable for home cooks
5. Provide accurate nutrition estimates
6. Include helpful cooking tips and ingredient substitutions

Always respond with valid JSON matching the exact schema provided. Be creative but realistic.`;

  const userPrompt = `Create a healthier version of: "${params.prompt}"

Requirements:
- Servings: ${params.servings || 2}
- Dietary restrictions: ${params.dietaryRestrictions?.join(', ') || 'none'}
- Available ingredients: ${params.availableIngredients?.join(', ') || 'any'}
- Max cooking time: ${params.maxTime || 45} minutes
- Difficulty level: ${params.difficulty || 'any'}

Return a JSON object with this exact structure:
{
  "title": "Recipe name",
  "description": "2-3 sentence description highlighting health benefits",
  "brand": "Original restaurant/brand (if applicable)",
  "originalItem": "Original menu item name (if applicable)", 
  "prepTime": 15,
  "cookTime": 20,
  "servings": 2,
  "difficulty": "easy",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": 1,
      "unit": "cup",
      "notes": "preparation notes",
      "isOptional": false
    }
  ],
  "instructions": [
    {
      "step": 1,
      "text": "Detailed step instructions",
      "time": 5,
      "tips": "Helpful tips for this step"
    }
  ],
  "nutrition": {
    "calories": 450,
    "protein": 35,
    "carbs": 30,
    "fat": 20,
    "fiber": 8,
    "sodium": 600,
    "sugar": 5
  },
  "originalNutrition": {
    "calories": 650,
    "protein": 25,
    "carbs": 45,
    "fat": 40,
    "fiber": 2,
    "sodium": 1200,
    "sugar": 12
  },
  "dietaryTags": ["high-protein", "whole-grain", "low-sodium"],
  "tips": ["General cooking tips"],
  "substitutions": [
    {
      "ingredient": "ingredient name",
      "alternatives": ["substitute 1", "substitute 2"]
    }
  ]
}`;

  try {
    console.log('🤖 Making OpenAI API call...');
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log('✅ OpenAI API responded');
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('📝 Parsing recipe JSON...');
    const recipe = JSON.parse(content) as GeneratedRecipe;
    
    // Validate required fields
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe structure returned from AI');
    }

    console.log('🎉 Recipe generated successfully!');
    return recipe;
  } catch (error) {
    console.error('❌ OpenAI recipe generation error:', error);
    
    if (error instanceof Error && error.message.includes('API key not configured')) {
      throw error;
    }
    
    console.log('🔄 Using fallback recipe due to error');
    // Return fallback recipe if AI fails
    return generateFallbackRecipe(params.prompt);
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
      'Protein bowl with available items'
    ];
  }

  const prompt = `Based on these available ingredients: ${inventoryItems.join(', ')}
${expiringItems ? `\nItems expiring soon: ${expiringItems.join(', ')}` : ''}

Suggest 5 practical, healthy meal ideas that use these ingredients. Prioritize using items that are expiring soon. Format as a simple array of meal names.

Return as JSON: ["meal 1", "meal 2", "meal 3", "meal 4", "meal 5"]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful cooking assistant. Generate practical meal suggestions based on available ingredients."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const suggestions = JSON.parse(content);
      return suggestions.meals || suggestions;
    }
  } catch (error) {
    console.error('Inventory suggestions error:', error);
  }

  // Fallback suggestions
  return [
    'Quick stir-fry with available vegetables',
    'Simple pasta with pantry ingredients',
    'Protein bowl with available items',
    'Soup using expiring vegetables',
    'Omelet with available ingredients'
  ];
};

export const chatWithAssistant = async (
  message: string,
  context?: {
    type: string;
    data: any;
  }
): Promise<string> => {
  if (!process.env.OPENAI_API_KEY) {
    return "I'm here to help with cooking questions! To enable AI features, please configure your OpenAI API key.";
  }

  const systemPrompt = `You are ChefMate's cooking assistant. You help users with:
- Recipe questions and modifications
- Cooking techniques and tips
- Ingredient substitutions
- Meal planning advice
- Nutritional guidance
- Kitchen troubleshooting

Be friendly, concise, and practical. Always consider food safety. If you don't know something, say so.

${context ? `Context: ${context.type} - ${JSON.stringify(context.data)}` : ''}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "I'm sorry, I couldn't process your request right now.";
  } catch (error) {
    console.error('Chat assistant error:', error);
    return "I'm having trouble processing your request right now. Please try again later.";
  }
};

// Fallback recipe for when AI is not available
const generateFallbackRecipe = (prompt: string): GeneratedRecipe => {
  return {
    title: `Healthy ${prompt} Recipe`,
    description: "A nutritious homemade version created with wholesome ingredients and cooking methods.",
    prepTime: 15,
    cookTime: 25,
    servings: 2,
    difficulty: "medium" as const,
    ingredients: [
      {
        name: "main protein",
        amount: 1,
        unit: "lb",
        notes: "choose lean option"
      },
      {
        name: "vegetables",
        amount: 2,
        unit: "cups",
        notes: "mixed, chopped"
      },
      {
        name: "whole grain base",
        amount: 1,
        unit: "cup",
        notes: "rice, quinoa, or pasta"
      }
    ],
    instructions: [
      {
        step: 1,
        text: "Prepare all ingredients by washing, chopping, and measuring.",
        time: 10
      },
      {
        step: 2,
        text: "Cook protein according to package directions until fully cooked.",
        time: 15
      },
      {
        step: 3,
        text: "Add vegetables and seasonings, cook until tender.",
        time: 10
      },
      {
        step: 4,
        text: "Serve over prepared grain base and enjoy!",
        time: 2
      }
    ],
    nutrition: {
      calories: 450,
      protein: 30,
      carbs: 40,
      fat: 15,
      fiber: 8,
      sodium: 600
    },
    dietaryTags: ["homemade", "balanced"],
    tips: [
      "Adjust seasonings to taste",
      "Add fresh herbs for extra flavor"
    ]
  };
};