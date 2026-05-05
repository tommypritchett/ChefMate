import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_recipes',
      description:
        'Search the recipe database. Use when the user asks about recipes, wants meal ideas, or asks "what can I cook". Returns matching recipes with key details.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term (recipe name, ingredient, cuisine style)',
          },
          category: {
            type: 'string',
            description: 'Recipe category filter — ALWAYS use this when the user asks for a specific type (e.g. "dessert", "soup", "snack")',
            enum: ['burgers', 'chicken', 'pizza', 'mexican', 'breakfast', 'salad', 'sides', 'dessert', 'snack', 'soup', 'seafood', 'stir-fry', 'sandwich', 'grill', 'meal-prep', 'air-fryer', 'quick', 'vegetarian', 'pasta', 'bowls', 'sheet-pan', 'crockpot', 'trending'],
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
          },
          maxTime: {
            type: 'number',
            description: 'Maximum total cook time in minutes',
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default 5)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_inventory',
      description:
        "Get the user's current food inventory, grouped by storage location. Use when the user asks what they have, what's in their fridge, or before suggesting meals based on available ingredients.",
      parameters: {
        type: 'object',
        properties: {
          includeExpiring: {
            type: 'boolean',
            description: 'If true, also highlight items expiring within 3 days',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_meals',
      description:
        'Suggest meals the user can make based on their current inventory, preferences, and items about to expire. Use when the user asks "what can I cook tonight?" or similar.',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of suggestions (default 3)',
          },
          mealType: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          },
          prioritizeExpiring: {
            type: 'boolean',
            description: 'Prioritize using items that are expiring soon (default true)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_meal_plan',
      description:
        "Get the user's current or upcoming meal plan. Use when the user asks about their meal plan, what they're eating this week, or schedule.",
      parameters: {
        type: 'object',
        properties: {
          weekOffset: {
            type: 'number',
            description: '0 = current week, 1 = next week, -1 = last week',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_meal_plan',
      description:
        'Create a new weekly meal plan for the user. Use when the user asks to plan meals for the week or wants a meal schedule.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the meal plan (e.g. "Week of Feb 17")',
          },
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format (defaults to next Monday)',
          },
          preferences: {
            type: 'string',
            description: 'User preferences for the plan (e.g. "high protein, no dairy")',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_meal_to_plan',
      description:
        'Add a specific recipe to a meal plan slot. Use when the user wants to add a specific meal to a specific day/time in their plan, or swap a meal. IMPORTANT: Always ask the user how many servings they want before calling this tool.',
      parameters: {
        type: 'object',
        properties: {
          mealPlanId: {
            type: 'string',
            description: 'The meal plan ID to add the meal to',
          },
          recipeId: {
            type: 'string',
            description: 'The recipe ID to assign',
          },
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format',
          },
          mealType: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            description: 'Which meal slot',
          },
          servings: {
            type: 'number',
            description: 'Number of servings (e.g., 1 for just tonight, 2 for leftovers, 4 for meal prep). Always ask the user before setting.',
          },
          customName: {
            type: 'string',
            description: 'Optional custom name if no recipe ID (e.g. "Leftover pasta")',
          },
        },
        required: ['mealPlanId', 'date', 'mealType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_shopping_list',
      description:
        "Generate a shopping list by comparing ingredients against the user's current inventory. Can work from a meal plan OR a single recipe. Use when the user asks for a shopping list, what they need to buy, or what ingredients they're missing for a recipe.",
      parameters: {
        type: 'object',
        properties: {
          mealPlanId: {
            type: 'string',
            description: 'Specific meal plan ID to generate list from.',
          },
          recipeId: {
            type: 'string',
            description: 'Single recipe ID to generate missing ingredients for.',
          },
          listName: {
            type: 'string',
            description: 'Name for the shopping list (e.g. "Weekly Groceries", "Taco Night")',
          },
          saveToDB: {
            type: 'boolean',
            description: 'If true, saves the list to the database for later reference (default false)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_shopping_list',
      description:
        'Add items to, check items off, or view existing shopping lists. Use when the user wants to add something to their shopping list, mark items as bought, or see their current lists.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['view_lists', 'add_item', 'check_item', 'create_list'],
            description: 'The action to perform',
          },
          listId: {
            type: 'string',
            description: 'Shopping list ID (for add_item or check_item)',
          },
          listName: {
            type: 'string',
            description: 'Name for a new list (for create_list)',
          },
          itemName: {
            type: 'string',
            description: 'Item name to add or check off',
          },
          quantity: {
            type: 'number',
            description: 'Quantity for add_item',
          },
          unit: {
            type: 'string',
            description: 'Unit for add_item (e.g. lbs, oz, count)',
          },
          krogerProductId: {
            type: 'string',
            description: 'Kroger product UPC for cart integration (from kroger_product_search results)',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
              },
              required: ['name'],
            },
            description: 'Array of items to include when creating a new list (for create_list action)',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_today_meals',
      description:
        "Fetch ALL meals logged today from the database. Call this BEFORE making dinner/meal suggestions to ensure you have the complete picture. This returns every meal logged today including ones from previous conversations. Always use this to verify your day breakdown is accurate and complete.",
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_meal',
      description:
        "Record a meal the user ate. Use when the user says they ate something, had a meal, or wants to track what they've eaten. IMPORTANT: You MUST always estimate and provide ALL four macro values (calories, protein, carbs, fat). Never leave any as null. Use the Atwater formula: calories = (protein × 4) + (carbs × 4) + (fat × 9).",
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'What the user ate',
          },
          mealType: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          },
          calories: { type: 'number', description: 'Total calories (REQUIRED — always estimate)' },
          protein: { type: 'number', description: 'Protein in grams (REQUIRED — always estimate)' },
          carbs: { type: 'number', description: 'Carbs in grams (REQUIRED — always estimate, never leave null)' },
          fat: { type: 'number', description: 'Fat in grams (REQUIRED — always estimate, never leave null)' },
        },
        required: ['description', 'mealType', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_meal',
      description:
        "Update or correct a previously logged meal. Use when the user says the macros are wrong, they want to fix a meal entry, or provides corrected nutritional info for a meal logged earlier in the conversation. This REPLACES the existing entry — it does NOT create a duplicate. You MUST provide the mealId from the original log_meal result or from TODAY'S LOGGED MEALS.",
      parameters: {
        type: 'object',
        properties: {
          mealId: {
            type: 'string',
            description: 'The ID of the meal to update (from log_meal result or TODAY\'S LOGGED MEALS)',
          },
          description: {
            type: 'string',
            description: 'Updated meal name/description',
          },
          mealType: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          },
          calories: { type: 'number', description: 'Updated calories' },
          protein: { type: 'number', description: 'Updated protein in grams' },
          carbs: { type: 'number', description: 'Updated carbs in grams' },
          fat: { type: 'number', description: 'Updated fat in grams' },
        },
        required: ['mealId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_meal',
      description:
        "Delete a previously logged meal. Use when the user says to remove a meal, says they didn't actually eat something, or wants to fix duplicate entries. You MUST provide the mealId from get_today_meals or from the log_meal result. Can delete multiple meals by calling this tool multiple times.",
      parameters: {
        type: 'object',
        properties: {
          mealId: {
            type: 'string',
            description: 'The ID of the meal to delete (from get_today_meals or log_meal result)',
          },
        },
        required: ['mealId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recipe_detail',
      description:
        'Get full details of a specific recipe including all ingredients, step-by-step instructions, nutrition breakdown, and tips. Use when the user asks for details about a recipe, wants to cook a specific recipe, or asks about ingredients/instructions.',
      parameters: {
        type: 'object',
        properties: {
          recipeId: {
            type: 'string',
            description: 'The recipe ID to get details for',
          },
          slug: {
            type: 'string',
            description: 'Alternatively, the recipe slug',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_recipe_ingredients',
      description:
        'Compare a recipe\'s ingredients against the user\'s current inventory. Returns which ingredients they have, which are missing, and offers to add missing items to a shopping list. ALWAYS call this after suggesting or discussing a specific recipe.',
      parameters: {
        type: 'object',
        properties: {
          recipeId: {
            type: 'string',
            description: 'The recipe ID to compare against inventory',
          },
        },
        required: ['recipeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_missing_to_shopping_list',
      description:
        'Add missing recipe ingredients to a specific shopping list. IMPORTANT: Before calling this, ALWAYS call manage_shopping_list with action "view_lists" first to get available lists, then present the options to the user and let them choose. Only call this AFTER the user selects a list (by listId) or asks to create a new one (provide listName without listId).',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
              },
              required: ['name'],
            },
            description: 'Array of items to add to the shopping list',
          },
          listId: {
            type: 'string',
            description: 'ID of an existing shopping list to add items to. Required if adding to an existing list.',
          },
          listName: {
            type: 'string',
            description: 'Name for a new shopping list (only used when creating a new list, i.e. when listId is not provided)',
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_smart_shopping_list',
      description:
        'Generate a smart shopping list from multiple recipes with cross-recipe quantity aggregation and inventory comparison. Use when the user adds multiple recipes to a meal plan and wants a shopping list, or asks "what do I need for these recipes?". Aggregates ingredients across all recipes, adjusts for servings, and subtracts what the user already has in inventory.',
      parameters: {
        type: 'object',
        properties: {
          recipeIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of recipe IDs to aggregate ingredients from',
          },
          servings: {
            type: 'object',
            additionalProperties: { type: 'number' },
            description: 'Map of recipeId → desired servings (e.g. {"id1": 2, "id2": 4}). Defaults to recipe.servings if not specified.',
          },
          listName: {
            type: 'string',
            description: 'Optional name for the shopping list to save',
          },
          saveToDB: {
            type: 'boolean',
            description: 'If true, saves the generated list to the database (default false)',
          },
        },
        required: ['recipeIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'parse_natural_inventory_input',
      description:
        'Parse a natural language description of food items into structured inventory entries. Use when the user describes items conversationally (e.g., "I just bought chicken, 2 bags of rice, some broccoli and a gallon of milk"). Returns parsed items with any ambiguities that need clarification.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The natural language text describing food items to add',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_add_inventory',
      description:
        'Add multiple items to the user\'s inventory at once. Use after parse_natural_inventory_input has parsed the items (and any ambiguities have been resolved via conversation). Each item can have name, quantity, unit, category, and storage location.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name' },
                quantity: { type: 'number', description: 'Quantity (default 1)' },
                unit: { type: 'string', description: 'Unit (e.g., lbs, oz, bags, count)' },
                category: {
                  type: 'string',
                  description: 'Food category',
                  enum: ['produce', 'meat/protein', 'dairy', 'grains', 'frozen', 'canned', 'condiments', 'snacks', 'beverages', 'other'],
                },
                storageLocation: {
                  type: 'string',
                  description: 'Where to store',
                  enum: ['fridge', 'freezer', 'pantry'],
                },
                expiresInDays: {
                  type: 'number',
                  description: 'Days until expiry (auto-calculates date)',
                },
              },
              required: ['name'],
            },
            description: 'Array of items to add to inventory',
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_recipe_cost',
      description:
        'Estimate the cost of a recipe\'s ingredients at the nearest store. Use when the user asks how much a recipe costs, wants a budget estimate, or is comparing recipe costs.',
      parameters: {
        type: 'object',
        properties: {
          recipeId: {
            type: 'string',
            description: 'The recipe ID to estimate cost for',
          },
          lat: {
            type: 'number',
            description: 'User latitude for nearest store pricing',
          },
          lng: {
            type: 'number',
            description: 'User longitude for nearest store pricing',
          },
        },
        required: ['recipeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sale_items',
      description:
        'Get items currently on sale at the nearest store. Use for budget meal planning, when the user asks about deals, what\'s on sale, or wants to save money on groceries.',
      parameters: {
        type: 'object',
        properties: {
          lat: {
            type: 'number',
            description: 'User latitude',
          },
          lng: {
            type: 'number',
            description: 'User longitude',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of deals to return (default 20)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_nutrition_summary',
      description:
        "Get the user's nutrition summary for today or a date range. Use when the user asks about their daily macros, calorie count, or nutrition progress.",
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format (defaults to today)',
          },
          range: {
            type: 'string',
            enum: ['day', 'week'],
            description: 'Summary range (default "day")',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kroger_product_search',
      description:
        "Search for grocery products at the user's preferred Kroger-family store. Returns real products with prices, sizes, and images. Use this BEFORE adding items to the shopping list so the user can pick the exact product they want. Can search for multiple items at once.",
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of items to search for (e.g. ["chicken breast", "ground beef", "chocolate milk"])',
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_custom_recipe',
      description:
        'Generate and save a custom recipe when no matching recipes exist in the database. Uses AI to create a recipe based on the user\'s request, dietary goals, and preferences. Use when search_recipes returns few/no results and the user wants something specific (e.g., "high-protein chocolate mousse", "Chick-fil-A style sandwich").',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Desired recipe title (e.g., "High-Protein Chocolate Mousse")',
          },
          requirements: {
            type: 'string',
            description: 'What the user wants — flavor profile, style, dietary needs, inspiration (e.g., "high protein dessert, chocolate, like a mousse but with Greek yogurt")',
          },
          category: {
            type: 'string',
            description: 'Recipe category',
            enum: ['burgers', 'chicken', 'pizza', 'mexican', 'breakfast', 'salad', 'sides', 'dessert', 'snack', 'soup', 'seafood', 'stir-fry', 'sandwich', 'grill', 'meal-prep', 'air-fryer', 'quick', 'vegetarian', 'pasta', 'bowls', 'sheet-pan', 'crockpot', 'trending'],
          },
          proteinTarget: {
            type: 'number',
            description: 'Target protein per serving in grams (from user\'s health goals)',
          },
          calorieTarget: {
            type: 'number',
            description: 'Target calories per serving',
          },
          servings: {
            type: 'number',
            description: 'Total number of servings the recipe should make (e.g., 10 for 5 meals × 2 people). CRITICAL for meal prep — always pass the exact total from the serving math.',
          },
        },
        required: ['title', 'requirements'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_meal_prep',
      description:
        'Schedule a meal prep recipe onto the user\'s meal plan for multiple days. Handles all date calculation, plan lookup/creation, and slot creation server-side. Use this instead of calling add_meal_to_plan multiple times for meal prep scheduling.',
      parameters: {
        type: 'object',
        properties: {
          recipeId: {
            type: 'string',
            description: 'The recipe ID to schedule (from search_recipes or create_custom_recipe result)',
          },
          mealType: {
            type: 'string',
            description: 'Which meal slot to fill',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          },
          numberOfMeals: {
            type: 'number',
            description: 'How many meals to schedule for THIS person (e.g., 5 for weekday lunches)',
          },
          weekdaysOnly: {
            type: 'boolean',
            description: 'If true (default), only schedule on weekdays (Mon-Fri). If false, include weekends.',
          },
          skipConflicts: {
            type: 'boolean',
            description: 'If true, skip days that already have a meal in this slot and schedule the remaining days. If false (default), report conflicts and do not schedule any.',
          },
          replaceConflicts: {
            type: 'boolean',
            description: 'If true, replace/overwrite existing meals on conflicting days with this recipe. Use when the user confirms they want to replace existing meals.',
          },
        },
        required: ['recipeId', 'mealType', 'numberOfMeals'],
      },
    },
  },
];
