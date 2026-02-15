import { PrismaClient } from '@prisma/client';
import { additionalRecipes } from './additional-recipes';

const prisma = new PrismaClient();

const sampleRecipes = [
  // ============================================
  // HIGH-PROTEIN ONLY (for exclusion testing)
  // ============================================
  {
    title: 'High Protein Quesarito',
    slug: 'high-protein-quesarito',
    description: 'A healthier take on Taco Bell\'s Quesarito with lean ground turkey and whole wheat tortillas. Packed with 42g of protein per serving.',
    brand: 'Taco Bell',
    category: 'mexican',
    originalItemName: 'Quesarito',
    ingredients: JSON.stringify([
      { name: 'ground turkey', amount: 1, unit: 'lb', notes: '93/7 lean' },
      { name: 'whole wheat large tortillas', amount: 4, unit: 'count', notes: '' },
      { name: 'reduced-fat cheddar cheese', amount: 1, unit: 'cup', notes: 'shredded' },
      { name: 'black beans', amount: 1, unit: 'can', notes: 'drained and rinsed' },
      { name: 'brown rice', amount: 1, unit: 'cup', notes: 'cooked' },
      { name: 'taco seasoning', amount: 1, unit: 'packet', notes: 'low sodium' },
      { name: 'salsa', amount: 0.5, unit: 'cup', notes: 'optional' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Cook ground turkey in a large skillet over medium heat until browned and cooked through.', time: 8 },
      { step: 2, text: 'Season turkey with taco seasoning and add black beans. Cook for 2 minutes.', time: 2 },
      { step: 3, text: 'Lay tortilla flat, add cheese in center, then add turkey mixture and rice.', time: 3 },
      { step: 4, text: 'Fold tortilla into burrito shape and cook in pan until crispy outside.', time: 5 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    totalTimeMinutes: 35,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 520,
      protein: 42,
      carbs: 45,
      fat: 18,
      fiber: 12,
      sodium: 680
    }),
    originalNutrition: JSON.stringify({
      calories: 650,
      protein: 25,
      carbs: 60,
      fat: 35,
      fiber: 3,
      sodium: 1200
    }),
    dietaryTags: JSON.stringify(['high-protein']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Protein-Packed Crunchwrap Supreme',
    slug: 'protein-packed-crunchwrap',
    description: 'Taco Bell\'s Crunchwrap Supreme reimagined with extra lean beef and doubled protein content for serious gains.',
    brand: 'Taco Bell',
    category: 'mexican',
    originalItemName: 'Crunchwrap Supreme',
    ingredients: JSON.stringify([
      { name: 'extra lean ground beef', amount: 1.5, unit: 'lb', notes: '96/4 lean' },
      { name: 'large flour tortillas', amount: 6, unit: 'count', notes: 'burrito size' },
      { name: 'tostada shells', amount: 6, unit: 'count', notes: '' },
      { name: 'nacho cheese sauce', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'sour cream', amount: 0.5, unit: 'cup', notes: 'light' },
      { name: 'shredded lettuce', amount: 2, unit: 'cups', notes: '' },
      { name: 'diced tomatoes', amount: 1, unit: 'cup', notes: '' },
      { name: 'shredded cheddar', amount: 1, unit: 'cup', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Brown the ground beef and season with taco seasoning, drain excess fat.', time: 10 },
      { step: 2, text: 'Lay flour tortilla flat, add nacho cheese in center, then seasoned beef.', time: 3 },
      { step: 3, text: 'Place tostada shell on top, add sour cream, lettuce, tomato, and cheese.', time: 3 },
      { step: 4, text: 'Fold edges of tortilla toward center, creating hexagonal shape.', time: 2 },
      { step: 5, text: 'Cook seam-side down in skillet until golden, flip and cook other side.', time: 6 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    totalTimeMinutes: 35,
    servings: 6,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 445,
      protein: 38,
      carbs: 32,
      fat: 19,
      fiber: 3,
      sodium: 720
    }),
    originalNutrition: JSON.stringify({
      calories: 530,
      protein: 16,
      carbs: 51,
      fat: 29,
      fiber: 3,
      sodium: 1200
    }),
    dietaryTags: JSON.stringify(['high-protein']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Triple Steak Stack',
    slug: 'triple-steak-stack',
    description: 'Inspired by Taco Bell\'s steak offerings, this protein bomb features marinated sirloin strips with 50g protein per serving.',
    brand: 'Taco Bell',
    category: 'mexican',
    originalItemName: 'Steak Grilled Cheese Burrito',
    ingredients: JSON.stringify([
      { name: 'sirloin steak', amount: 2, unit: 'lbs', notes: 'sliced thin' },
      { name: 'large flour tortillas', amount: 6, unit: 'count', notes: '' },
      { name: 'chipotle peppers in adobo', amount: 2, unit: 'tbsp', notes: 'minced' },
      { name: 'lime juice', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'garlic', amount: 4, unit: 'cloves', notes: 'minced' },
      { name: 'cumin', amount: 1, unit: 'tsp', notes: '' },
      { name: 'pepper jack cheese', amount: 1.5, unit: 'cups', notes: 'shredded' },
      { name: 'cilantro', amount: 0.25, unit: 'cup', notes: 'chopped' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Marinate steak in chipotle, lime, garlic, and cumin for at least 30 minutes.', time: 30 },
      { step: 2, text: 'Sear steak in hot cast iron skillet for 2-3 minutes per side.', time: 6 },
      { step: 3, text: 'Let rest 5 minutes, then slice against the grain.', time: 5 },
      { step: 4, text: 'Warm tortillas, layer with cheese and steak, fold and grill until crispy.', time: 8 }
    ]),
    prepTimeMinutes: 40,
    cookTimeMinutes: 20,
    totalTimeMinutes: 60,
    servings: 6,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 485,
      protein: 50,
      carbs: 28,
      fat: 20,
      fiber: 2,
      sodium: 580
    }),
    originalNutrition: JSON.stringify({
      calories: 710,
      protein: 30,
      carbs: 52,
      fat: 42,
      fiber: 3,
      sodium: 1550
    }),
    dietaryTags: JSON.stringify(['high-protein']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=500',
    isPublished: true,
    isFeatured: false
  },

  // ============================================
  // LOW-CARB ONLY (for exclusion testing)
  // ============================================
  {
    title: 'Lettuce Wrap Double-Double',
    slug: 'lettuce-wrap-double-double',
    description: 'In-N-Out\'s famous Double-Double served protein style - wrapped in crisp lettuce instead of a bun for only 8g carbs.',
    brand: 'In-N-Out',
    category: 'burgers',
    originalItemName: 'Double-Double Protein Style',
    ingredients: JSON.stringify([
      { name: 'ground beef', amount: 1, unit: 'lb', notes: '80/20' },
      { name: 'iceberg lettuce', amount: 1, unit: 'head', notes: 'large leaves for wrapping' },
      { name: 'American cheese', amount: 4, unit: 'slices', notes: '' },
      { name: 'tomato', amount: 1, unit: 'large', notes: 'sliced' },
      { name: 'onion', amount: 1, unit: 'medium', notes: 'sliced into rings' },
      { name: 'pickles', amount: 8, unit: 'slices', notes: '' },
      { name: 'thousand island dressing', amount: 4, unit: 'tbsp', notes: 'spread' },
      { name: 'yellow mustard', amount: 2, unit: 'tsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Form beef into 8 thin patties (2oz each). Season with salt and pepper.', time: 5 },
      { step: 2, text: 'Cook patties on griddle or skillet, smashing flat for crispy edges.', time: 8 },
      { step: 3, text: 'Add cheese to patties in last minute of cooking to melt.', time: 1 },
      { step: 4, text: 'Layer 2 large lettuce leaves, add spread, patties, tomato, onion, pickles.', time: 3 },
      { step: 5, text: 'Wrap lettuce around fillings and secure with toothpick if needed.', time: 2 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 12,
    totalTimeMinutes: 22,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 420,
      protein: 28,
      carbs: 8,
      fat: 32,
      fiber: 2,
      sodium: 890
    }),
    originalNutrition: JSON.stringify({
      calories: 670,
      protein: 37,
      carbs: 39,
      fat: 41,
      fiber: 3,
      sodium: 1440
    }),
    dietaryTags: JSON.stringify(['low-carb']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Bunless Baconator',
    slug: 'bunless-baconator',
    description: 'Wendy\'s Baconator without the bun - all the bacon and beef glory with just 4g net carbs.',
    brand: 'Wendy\'s',
    category: 'burgers',
    originalItemName: 'Baconator',
    ingredients: JSON.stringify([
      { name: 'ground beef', amount: 1.5, unit: 'lb', notes: 'fresh, not frozen' },
      { name: 'thick-cut bacon', amount: 12, unit: 'slices', notes: '' },
      { name: 'American cheese', amount: 6, unit: 'slices', notes: '' },
      { name: 'mayonnaise', amount: 4, unit: 'tbsp', notes: '' },
      { name: 'ketchup', amount: 2, unit: 'tbsp', notes: 'optional, adds carbs' },
      { name: 'butter lettuce', amount: 6, unit: 'leaves', notes: 'for serving' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Cook bacon in oven at 400°F until crispy, about 15-18 minutes.', time: 18 },
      { step: 2, text: 'Form beef into 6 square-shaped patties to match Wendy\'s style.', time: 5 },
      { step: 3, text: 'Season patties and cook on hot griddle 3-4 minutes per side.', time: 8 },
      { step: 4, text: 'Add cheese to melt, stack patties with bacon between them.', time: 2 },
      { step: 5, text: 'Serve on lettuce leaf with mayo on the side.', time: 2 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    totalTimeMinutes: 35,
    servings: 6,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 580,
      protein: 35,
      carbs: 4,
      fat: 48,
      fiber: 0,
      sodium: 1100
    }),
    originalNutrition: JSON.stringify({
      calories: 960,
      protein: 57,
      carbs: 38,
      fat: 65,
      fiber: 2,
      sodium: 1860
    }),
    dietaryTags: JSON.stringify(['low-carb']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Cauliflower Crust Pizza Hut Style',
    slug: 'cauliflower-crust-pizza',
    description: 'Pizza Hut pepperoni pizza on a homemade cauliflower crust - only 12g net carbs per serving.',
    brand: 'Pizza Hut',
    category: 'pizza',
    originalItemName: 'Pepperoni Pizza',
    ingredients: JSON.stringify([
      { name: 'cauliflower', amount: 1, unit: 'large head', notes: 'riced' },
      { name: 'mozzarella cheese', amount: 2, unit: 'cups', notes: 'divided' },
      { name: 'parmesan cheese', amount: 0.5, unit: 'cup', notes: 'grated' },
      { name: 'egg', amount: 1, unit: 'large', notes: '' },
      { name: 'Italian seasoning', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'pizza sauce', amount: 0.5, unit: 'cup', notes: 'no sugar added' },
      { name: 'pepperoni', amount: 4, unit: 'oz', notes: '' },
      { name: 'garlic powder', amount: 1, unit: 'tsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Rice cauliflower and microwave 8 minutes. Squeeze out ALL moisture with towel.', time: 12 },
      { step: 2, text: 'Mix cauliflower with 1 cup mozzarella, parmesan, egg, and seasonings.', time: 5 },
      { step: 3, text: 'Press into thin crust on parchment-lined baking sheet. Bake 20 min at 425°F.', time: 20 },
      { step: 4, text: 'Add sauce, remaining cheese, and pepperoni. Bake 10 more minutes.', time: 10 }
    ]),
    prepTimeMinutes: 20,
    cookTimeMinutes: 30,
    totalTimeMinutes: 50,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 320,
      protein: 22,
      carbs: 12,
      fat: 22,
      fiber: 4,
      sodium: 780
    }),
    originalNutrition: JSON.stringify({
      calories: 300,
      protein: 12,
      carbs: 32,
      fat: 14,
      fiber: 2,
      sodium: 720
    }),
    dietaryTags: JSON.stringify(['low-carb']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae78?w=500',
    isPublished: true,
    isFeatured: false
  },

  // ============================================
  // VEGETARIAN ONLY (for exclusion testing)
  // ============================================
  {
    title: 'Vegetarian Crunchwrap',
    slug: 'vegetarian-crunchwrap',
    description: 'A meatless Crunchwrap Supreme loaded with seasoned black beans, rice, and all the classic toppings.',
    brand: 'Taco Bell',
    category: 'mexican',
    originalItemName: 'Crunchwrap Supreme',
    ingredients: JSON.stringify([
      { name: 'black beans', amount: 2, unit: 'cans', notes: 'drained' },
      { name: 'large flour tortillas', amount: 6, unit: 'count', notes: '' },
      { name: 'tostada shells', amount: 6, unit: 'count', notes: '' },
      { name: 'Mexican rice', amount: 2, unit: 'cups', notes: 'cooked' },
      { name: 'nacho cheese sauce', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'sour cream', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'shredded lettuce', amount: 2, unit: 'cups', notes: '' },
      { name: 'diced tomatoes', amount: 1, unit: 'cup', notes: '' },
      { name: 'taco seasoning', amount: 2, unit: 'tbsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Heat black beans with taco seasoning until warmed through.', time: 5 },
      { step: 2, text: 'Lay tortilla flat, spread nacho cheese, add beans and rice in center.', time: 3 },
      { step: 3, text: 'Top with tostada shell, sour cream, lettuce, and tomatoes.', time: 3 },
      { step: 4, text: 'Fold tortilla edges toward center and cook seam-down until golden.', time: 6 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    servings: 6,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 385,
      protein: 14,
      carbs: 58,
      fat: 12,
      fiber: 10,
      sodium: 680
    }),
    originalNutrition: JSON.stringify({
      calories: 530,
      protein: 16,
      carbs: 51,
      fat: 29,
      fiber: 3,
      sodium: 1200
    }),
    dietaryTags: JSON.stringify(['vegetarian']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1562059390-a761a084768e?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Egg McMuffin Classic',
    slug: 'egg-mcmuffin-classic',
    description: 'McDonald\'s iconic breakfast sandwich made at home with a perfectly cooked egg and melty cheese.',
    brand: 'McDonald\'s',
    category: 'breakfast',
    originalItemName: 'Egg McMuffin',
    ingredients: JSON.stringify([
      { name: 'English muffins', amount: 4, unit: 'count', notes: '' },
      { name: 'eggs', amount: 4, unit: 'large', notes: '' },
      { name: 'American cheese', amount: 4, unit: 'slices', notes: '' },
      { name: 'butter', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'salt', amount: 0.25, unit: 'tsp', notes: '' },
      { name: 'black pepper', amount: 0.125, unit: 'tsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Use a round cookie cutter or mason jar lid to make egg ring molds.', time: 2 },
      { step: 2, text: 'Butter and toast English muffin halves until golden.', time: 3 },
      { step: 3, text: 'Grease ring mold, place in pan, crack egg inside. Cook covered 3-4 min.', time: 4 },
      { step: 4, text: 'Flip egg, add cheese on top to melt. Assemble on muffin.', time: 2 }
    ]),
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    totalTimeMinutes: 15,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 290,
      protein: 17,
      carbs: 26,
      fat: 13,
      fiber: 2,
      sodium: 750
    }),
    originalNutrition: JSON.stringify({
      calories: 310,
      protein: 17,
      carbs: 30,
      fat: 13,
      fiber: 2,
      sodium: 770
    }),
    dietaryTags: JSON.stringify(['vegetarian']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Cheesy Gordita Crunch - Bean Edition',
    slug: 'cheesy-gordita-crunch-bean',
    description: 'Taco Bell\'s Cheesy Gordita Crunch with seasoned refried beans instead of meat - vegetarian comfort food at its best.',
    brand: 'Taco Bell',
    category: 'mexican',
    originalItemName: 'Cheesy Gordita Crunch',
    ingredients: JSON.stringify([
      { name: 'flatbread or naan', amount: 6, unit: 'pieces', notes: 'small' },
      { name: 'crunchy taco shells', amount: 6, unit: 'count', notes: '' },
      { name: 'refried beans', amount: 2, unit: 'cups', notes: '' },
      { name: 'pepper jack cheese', amount: 1.5, unit: 'cups', notes: 'shredded' },
      { name: 'chipotle sauce', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'shredded lettuce', amount: 2, unit: 'cups', notes: '' },
      { name: 'sour cream', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'taco seasoning', amount: 2, unit: 'tbsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Mix taco seasoning into refried beans and heat through.', time: 5 },
      { step: 2, text: 'Spread chipotle sauce on flatbread, add shredded cheese.', time: 2 },
      { step: 3, text: 'Wrap flatbread around taco shell and press to adhere.', time: 2 },
      { step: 4, text: 'Fill taco with beans, lettuce, sour cream, and more cheese.', time: 3 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 10,
    totalTimeMinutes: 20,
    servings: 6,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 365,
      protein: 14,
      carbs: 42,
      fat: 16,
      fiber: 8,
      sodium: 720
    }),
    originalNutrition: JSON.stringify({
      calories: 500,
      protein: 20,
      carbs: 41,
      fat: 28,
      fiber: 4,
      sodium: 1060
    }),
    dietaryTags: JSON.stringify(['vegetarian']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500',
    isPublished: true,
    isFeatured: false
  },

  // ============================================
  // VEGAN ONLY (for exclusion testing)
  // ============================================
  {
    title: 'Vegan Big Mac',
    slug: 'vegan-big-mac',
    description: 'McDonald\'s Big Mac made completely plant-based with seasoned black bean patties and vegan special sauce.',
    brand: 'McDonald\'s',
    category: 'burgers',
    originalItemName: 'Big Mac',
    ingredients: JSON.stringify([
      { name: 'black beans', amount: 2, unit: 'cans', notes: 'drained' },
      { name: 'vegan hamburger buns', amount: 4, unit: 'count', notes: 'sesame seed' },
      { name: 'vegan mayo', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'dill pickle relish', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'yellow mustard', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'white vinegar', amount: 1, unit: 'tsp', notes: '' },
      { name: 'paprika', amount: 0.5, unit: 'tsp', notes: '' },
      { name: 'garlic powder', amount: 0.5, unit: 'tsp', notes: '' },
      { name: 'onion powder', amount: 0.5, unit: 'tsp', notes: '' },
      { name: 'shredded lettuce', amount: 2, unit: 'cups', notes: '' },
      { name: 'diced onion', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'vegan cheese slices', amount: 4, unit: 'count', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Mash black beans, season with salt, pepper, garlic powder. Form 8 thin patties.', time: 10 },
      { step: 2, text: 'Make special sauce: mix vegan mayo, relish, mustard, vinegar, and spices.', time: 3 },
      { step: 3, text: 'Cook bean patties in oiled skillet 4 minutes per side until crispy.', time: 8 },
      { step: 4, text: 'Toast buns, spread sauce on all layers, stack with patties, lettuce, onion, cheese.', time: 5 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    totalTimeMinutes: 30,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 385,
      protein: 15,
      carbs: 52,
      fat: 14,
      fiber: 12,
      sodium: 620
    }),
    originalNutrition: JSON.stringify({
      calories: 563,
      protein: 25,
      carbs: 45,
      fat: 33,
      fiber: 3,
      sodium: 1040
    }),
    dietaryTags: JSON.stringify(['vegan']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Vegan Crunchy Taco Supreme',
    slug: 'vegan-crunchy-taco',
    description: 'Taco Bell\'s Crunchy Taco made vegan with seasoned walnut "meat" and cashew crema.',
    brand: 'Taco Bell',
    category: 'mexican',
    originalItemName: 'Crunchy Taco Supreme',
    ingredients: JSON.stringify([
      { name: 'walnuts', amount: 2, unit: 'cups', notes: 'finely chopped' },
      { name: 'crunchy taco shells', amount: 8, unit: 'count', notes: '' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'cumin', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'chili powder', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'smoked paprika', amount: 1, unit: 'tsp', notes: '' },
      { name: 'raw cashews', amount: 1, unit: 'cup', notes: 'soaked 2 hours' },
      { name: 'lime juice', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'shredded lettuce', amount: 2, unit: 'cups', notes: '' },
      { name: 'diced tomatoes', amount: 1, unit: 'cup', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Pulse walnuts in food processor until crumbly like ground meat.', time: 3 },
      { step: 2, text: 'Cook walnut mixture with soy sauce and spices until fragrant and slightly crispy.', time: 8 },
      { step: 3, text: 'Blend soaked cashews with lime juice and water for crema.', time: 3 },
      { step: 4, text: 'Fill taco shells with walnut meat, lettuce, tomatoes, and cashew crema.', time: 5 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 12,
    totalTimeMinutes: 27,
    servings: 8,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 245,
      protein: 7,
      carbs: 18,
      fat: 17,
      fiber: 4,
      sodium: 320
    }),
    originalNutrition: JSON.stringify({
      calories: 200,
      protein: 8,
      carbs: 15,
      fat: 12,
      fiber: 2,
      sodium: 360
    }),
    dietaryTags: JSON.stringify(['vegan']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Vegan Whopper',
    slug: 'vegan-whopper',
    description: 'Burger King\'s Whopper reimagined with a homemade beet and black bean patty - flame-grilled flavor, 100% plant-based.',
    brand: 'Burger King',
    category: 'burgers',
    originalItemName: 'Whopper',
    ingredients: JSON.stringify([
      { name: 'black beans', amount: 1, unit: 'can', notes: 'drained' },
      { name: 'cooked beets', amount: 1, unit: 'cup', notes: 'grated' },
      { name: 'rolled oats', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'vegan sesame buns', amount: 4, unit: 'count', notes: '' },
      { name: 'tomato', amount: 1, unit: 'large', notes: 'sliced' },
      { name: 'red onion', amount: 0.5, unit: 'cup', notes: 'sliced into rings' },
      { name: 'lettuce', amount: 4, unit: 'leaves', notes: 'iceberg' },
      { name: 'pickles', amount: 12, unit: 'slices', notes: '' },
      { name: 'vegan mayo', amount: 4, unit: 'tbsp', notes: '' },
      { name: 'ketchup', amount: 4, unit: 'tbsp', notes: '' },
      { name: 'liquid smoke', amount: 1, unit: 'tsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Blend beans, beets, oats, and liquid smoke. Season with salt and pepper.', time: 5 },
      { step: 2, text: 'Form into 4 patties and refrigerate 30 minutes to firm up.', time: 30 },
      { step: 3, text: 'Grill or pan-fry patties 5 minutes per side until charred.', time: 10 },
      { step: 4, text: 'Toast buns, assemble with mayo, ketchup, lettuce, tomato, onion, pickles, patty.', time: 5 }
    ]),
    prepTimeMinutes: 40,
    cookTimeMinutes: 15,
    totalTimeMinutes: 55,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 365,
      protein: 12,
      carbs: 54,
      fat: 12,
      fiber: 9,
      sodium: 680
    }),
    originalNutrition: JSON.stringify({
      calories: 657,
      protein: 28,
      carbs: 49,
      fat: 40,
      fiber: 2,
      sodium: 980
    }),
    dietaryTags: JSON.stringify(['vegan']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500',
    isPublished: true,
    isFeatured: false
  },

  // ============================================
  // GLUTEN-FREE ONLY (for exclusion testing)
  // ============================================
  {
    title: 'Gluten-Free Chipotle Bowl',
    slug: 'gluten-free-chipotle-bowl',
    description: 'Chipotle\'s famous burrito bowl made safely gluten-free with corn tortilla chips on the side.',
    brand: 'Chipotle',
    category: 'mexican',
    originalItemName: 'Burrito Bowl',
    ingredients: JSON.stringify([
      { name: 'cilantro lime rice', amount: 2, unit: 'cups', notes: 'white rice' },
      { name: 'black beans', amount: 1, unit: 'can', notes: 'drained' },
      { name: 'chicken thighs', amount: 1, unit: 'lb', notes: 'or steak' },
      { name: 'corn salsa', amount: 1, unit: 'cup', notes: '' },
      { name: 'guacamole', amount: 1, unit: 'cup', notes: '' },
      { name: 'sour cream', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'shredded cheese', amount: 1, unit: 'cup', notes: '' },
      { name: 'romaine lettuce', amount: 2, unit: 'cups', notes: 'shredded' },
      { name: 'lime', amount: 2, unit: 'count', notes: '' },
      { name: 'cilantro', amount: 0.25, unit: 'cup', notes: 'chopped' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Season chicken with cumin, chili powder, garlic. Grill until 165°F internal.', time: 15 },
      { step: 2, text: 'Cook rice, fluff with lime juice and chopped cilantro.', time: 20 },
      { step: 3, text: 'Warm black beans with a pinch of cumin.', time: 5 },
      { step: 4, text: 'Slice chicken, assemble bowls with rice, beans, and all toppings.', time: 5 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    totalTimeMinutes: 40,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 520,
      protein: 35,
      carbs: 48,
      fat: 22,
      fiber: 10,
      sodium: 720
    }),
    originalNutrition: JSON.stringify({
      calories: 665,
      protein: 36,
      carbs: 75,
      fat: 23,
      fiber: 11,
      sodium: 1420
    }),
    dietaryTags: JSON.stringify(['gluten-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'GF Nashville Hot Chicken Tenders',
    slug: 'gf-nashville-hot-chicken',
    description: 'KFC Nashville Hot tenders made gluten-free with rice flour coating - all the heat, no wheat.',
    brand: 'KFC',
    category: 'chicken',
    originalItemName: 'Nashville Hot Chicken Tenders',
    ingredients: JSON.stringify([
      { name: 'chicken tenders', amount: 2, unit: 'lbs', notes: '' },
      { name: 'rice flour', amount: 1.5, unit: 'cups', notes: '' },
      { name: 'cornstarch', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'buttermilk', amount: 1, unit: 'cup', notes: '' },
      { name: 'cayenne pepper', amount: 3, unit: 'tbsp', notes: '' },
      { name: 'brown sugar', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'paprika', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'garlic powder', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'vegetable oil', amount: 2, unit: 'cups', notes: 'for frying' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Marinate chicken in buttermilk with 1 tbsp cayenne for 2+ hours.', time: 120 },
      { step: 2, text: 'Mix rice flour, cornstarch, paprika, garlic powder, salt.', time: 3 },
      { step: 3, text: 'Dredge chicken in flour mixture, shaking off excess.', time: 5 },
      { step: 4, text: 'Fry at 350°F for 6-8 minutes until golden and cooked through.', time: 8 },
      { step: 5, text: 'Mix remaining cayenne with brown sugar and melted butter, brush on tenders.', time: 3 }
    ]),
    prepTimeMinutes: 130,
    cookTimeMinutes: 15,
    totalTimeMinutes: 145,
    servings: 6,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 385,
      protein: 32,
      carbs: 28,
      fat: 16,
      fiber: 1,
      sodium: 580
    }),
    originalNutrition: JSON.stringify({
      calories: 420,
      protein: 27,
      carbs: 23,
      fat: 25,
      fiber: 1,
      sodium: 1150
    }),
    dietaryTags: JSON.stringify(['gluten-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500',
    isPublished: true,
    isFeatured: false
  },

  // ============================================
  // DAIRY-FREE ONLY (for exclusion testing)
  // ============================================
  {
    title: 'Dairy-Free McChicken',
    slug: 'dairy-free-mcchicken',
    description: 'McDonald\'s McChicken sandwich made completely dairy-free with plant-based mayo.',
    brand: 'McDonald\'s',
    category: 'chicken',
    originalItemName: 'McChicken',
    ingredients: JSON.stringify([
      { name: 'chicken breast', amount: 4, unit: 'pieces', notes: 'pounded thin' },
      { name: 'plain hamburger buns', amount: 4, unit: 'count', notes: 'dairy-free' },
      { name: 'flour', amount: 1, unit: 'cup', notes: '' },
      { name: 'plant milk', amount: 1, unit: 'cup', notes: 'oat or soy' },
      { name: 'panko breadcrumbs', amount: 1.5, unit: 'cups', notes: '' },
      { name: 'vegan mayo', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'shredded lettuce', amount: 2, unit: 'cups', notes: '' },
      { name: 'vegetable oil', amount: 1, unit: 'cup', notes: 'for frying' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Set up breading station: flour, plant milk, and panko in separate dishes.', time: 3 },
      { step: 2, text: 'Season chicken with salt, pepper, garlic powder, onion powder.', time: 2 },
      { step: 3, text: 'Dredge chicken: flour, milk, panko. Let sit 5 minutes.', time: 8 },
      { step: 4, text: 'Shallow fry at 350°F for 4-5 minutes per side until golden.', time: 10 },
      { step: 5, text: 'Assemble on toasted buns with vegan mayo and lettuce.', time: 3 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    totalTimeMinutes: 30,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 420,
      protein: 28,
      carbs: 42,
      fat: 16,
      fiber: 2,
      sodium: 680
    }),
    originalNutrition: JSON.stringify({
      calories: 400,
      protein: 14,
      carbs: 39,
      fat: 21,
      fiber: 1,
      sodium: 560
    }),
    dietaryTags: JSON.stringify(['dairy-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Dairy-Free Popeyes Sandwich',
    slug: 'dairy-free-popeyes-sandwich',
    description: 'The viral Popeyes chicken sandwich made dairy-free - crispy, spicy, and just as crave-worthy.',
    brand: 'Popeyes',
    category: 'chicken',
    originalItemName: 'Chicken Sandwich',
    ingredients: JSON.stringify([
      { name: 'chicken thighs', amount: 4, unit: 'boneless', notes: '' },
      { name: 'pickle juice', amount: 1, unit: 'cup', notes: 'for brining' },
      { name: 'hot sauce', amount: 0.5, unit: 'cup', notes: 'Louisiana style' },
      { name: 'flour', amount: 1.5, unit: 'cups', notes: '' },
      { name: 'cornstarch', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'cayenne', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'paprika', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'brioche buns', amount: 4, unit: 'count', notes: 'dairy-free' },
      { name: 'pickles', amount: 16, unit: 'slices', notes: '' },
      { name: 'vegan mayo', amount: 0.5, unit: 'cup', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Brine chicken in pickle juice and hot sauce for 4+ hours.', time: 240 },
      { step: 2, text: 'Mix flour, cornstarch, cayenne, paprika, garlic powder, salt.', time: 3 },
      { step: 3, text: 'Remove chicken from brine, dredge in flour mixture twice for extra crispy.', time: 5 },
      { step: 4, text: 'Fry at 350°F for 7-8 minutes until golden brown and cooked through.', time: 8 },
      { step: 5, text: 'Toast buns, spread spicy mayo, add chicken and pickles.', time: 3 }
    ]),
    prepTimeMinutes: 250,
    cookTimeMinutes: 15,
    totalTimeMinutes: 265,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 520,
      protein: 32,
      carbs: 48,
      fat: 22,
      fiber: 2,
      sodium: 1050
    }),
    originalNutrition: JSON.stringify({
      calories: 700,
      protein: 28,
      carbs: 50,
      fat: 42,
      fiber: 2,
      sodium: 1443
    }),
    dietaryTags: JSON.stringify(['dairy-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500',
    isPublished: true,
    isFeatured: true
  },

  // ============================================
  // KETO ONLY (for exclusion testing)
  // ============================================
  {
    title: 'Keto Five Guys Burger',
    slug: 'keto-five-guys-burger',
    description: 'Five Guys style burger in a lettuce wrap with all the free toppings - only 5g net carbs.',
    brand: 'Five Guys',
    category: 'burgers',
    originalItemName: 'Bacon Cheeseburger',
    ingredients: JSON.stringify([
      { name: 'ground beef', amount: 2, unit: 'lbs', notes: '80/20' },
      { name: 'bacon', amount: 8, unit: 'slices', notes: '' },
      { name: 'American cheese', amount: 8, unit: 'slices', notes: '' },
      { name: 'butter lettuce', amount: 1, unit: 'head', notes: 'for wrapping' },
      { name: 'tomato', amount: 2, unit: 'medium', notes: 'sliced' },
      { name: 'pickles', amount: 16, unit: 'slices', notes: '' },
      { name: 'jalapeños', amount: 0.5, unit: 'cup', notes: 'sliced' },
      { name: 'mushrooms', amount: 1, unit: 'cup', notes: 'sautéed' },
      { name: 'mayo', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'mustard', amount: 0.25, unit: 'cup', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Cook bacon until crispy, set aside. Save the fat.', time: 10 },
      { step: 2, text: 'Sauté mushrooms in bacon fat until golden.', time: 5 },
      { step: 3, text: 'Form beef into 8 ball-shaped patties, smash flat on hot griddle.', time: 8 },
      { step: 4, text: 'Add cheese in last minute. Stack 2 patties per burger.', time: 2 },
      { step: 5, text: 'Wrap in large lettuce leaves with all toppings.', time: 3 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 720,
      protein: 48,
      carbs: 5,
      fat: 56,
      fiber: 2,
      sodium: 1180
    }),
    originalNutrition: JSON.stringify({
      calories: 1060,
      protein: 51,
      carbs: 40,
      fat: 75,
      fiber: 2,
      sodium: 1650
    }),
    dietaryTags: JSON.stringify(['keto']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Keto Buffalo Wild Wings',
    slug: 'keto-buffalo-wings',
    description: 'Buffalo Wild Wings style traditional wings - no breading, just crispy skin and bold buffalo sauce.',
    brand: 'Buffalo Wild Wings',
    category: 'chicken',
    originalItemName: 'Traditional Wings',
    ingredients: JSON.stringify([
      { name: 'chicken wings', amount: 3, unit: 'lbs', notes: 'split into drums and flats' },
      { name: 'butter', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'hot sauce', amount: 0.75, unit: 'cup', notes: 'Frank\'s RedHot' },
      { name: 'garlic powder', amount: 1, unit: 'tsp', notes: '' },
      { name: 'baking powder', amount: 1, unit: 'tbsp', notes: 'for crispy skin' },
      { name: 'celery', amount: 6, unit: 'stalks', notes: '' },
      { name: 'blue cheese dressing', amount: 1, unit: 'cup', notes: 'for dipping' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Pat wings completely dry. Toss with baking powder, salt, and garlic.', time: 5 },
      { step: 2, text: 'Bake on wire rack at 425°F for 45-50 minutes, flipping halfway.', time: 50 },
      { step: 3, text: 'Melt butter, whisk in hot sauce to make buffalo sauce.', time: 3 },
      { step: 4, text: 'Toss crispy wings in buffalo sauce, serve with celery and blue cheese.', time: 3 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 50,
    totalTimeMinutes: 60,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 580,
      protein: 42,
      carbs: 2,
      fat: 44,
      fiber: 0,
      sodium: 1280
    }),
    originalNutrition: JSON.stringify({
      calories: 640,
      protein: 44,
      carbs: 5,
      fat: 48,
      fiber: 0,
      sodium: 2200
    }),
    dietaryTags: JSON.stringify(['keto']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500',
    isPublished: true,
    isFeatured: false
  },

  // ============================================
  // LOW-SODIUM ONLY (for exclusion testing)
  // ============================================
  {
    title: 'Low-Sodium Grilled Chicken Sandwich',
    slug: 'low-sodium-grilled-chicken',
    description: 'Chick-fil-A grilled chicken sandwich with homemade seasoning - only 420mg sodium vs 1050mg original.',
    brand: 'Chick-fil-A',
    category: 'chicken',
    originalItemName: 'Grilled Chicken Sandwich',
    ingredients: JSON.stringify([
      { name: 'chicken breast', amount: 4, unit: 'pieces', notes: '' },
      { name: 'multigrain buns', amount: 4, unit: 'count', notes: '' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'lemon juice', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'honey', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'garlic powder', amount: 1, unit: 'tsp', notes: '' },
      { name: 'smoked paprika', amount: 1, unit: 'tsp', notes: '' },
      { name: 'butter lettuce', amount: 4, unit: 'leaves', notes: '' },
      { name: 'tomato', amount: 1, unit: 'large', notes: 'sliced' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Marinate chicken in olive oil, lemon, honey, garlic, and paprika for 1 hour.', time: 60 },
      { step: 2, text: 'Grill chicken on medium-high heat 6-7 minutes per side until 165°F.', time: 14 },
      { step: 3, text: 'Let rest 5 minutes before slicing.', time: 5 },
      { step: 4, text: 'Toast buns, assemble with lettuce, tomato, and chicken.', time: 3 }
    ]),
    prepTimeMinutes: 65,
    cookTimeMinutes: 20,
    totalTimeMinutes: 85,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 340,
      protein: 35,
      carbs: 28,
      fat: 10,
      fiber: 3,
      sodium: 420
    }),
    originalNutrition: JSON.stringify({
      calories: 320,
      protein: 28,
      carbs: 36,
      fat: 6,
      fiber: 4,
      sodium: 1050
    }),
    dietaryTags: JSON.stringify(['low-sodium']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Low-Sodium Asian Chicken Salad',
    slug: 'low-sodium-asian-salad',
    description: 'Panera\'s Asian Sesame Chicken Salad with a homemade low-sodium sesame dressing.',
    brand: 'Panera Bread',
    category: 'salads',
    originalItemName: 'Asian Sesame Chicken Salad',
    ingredients: JSON.stringify([
      { name: 'chicken breast', amount: 1, unit: 'lb', notes: 'grilled, sliced' },
      { name: 'mixed greens', amount: 8, unit: 'cups', notes: '' },
      { name: 'cilantro', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'edamame', amount: 1, unit: 'cup', notes: 'shelled' },
      { name: 'wonton strips', amount: 0.5, unit: 'cup', notes: 'unsalted' },
      { name: 'sesame seeds', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'rice vinegar', amount: 3, unit: 'tbsp', notes: '' },
      { name: 'sesame oil', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'honey', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'ginger', amount: 1, unit: 'tsp', notes: 'fresh, grated' },
      { name: 'low-sodium soy sauce', amount: 1, unit: 'tbsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Whisk together rice vinegar, sesame oil, honey, ginger, and low-sodium soy.', time: 3 },
      { step: 2, text: 'Season chicken with ginger and garlic, grill until cooked through.', time: 12 },
      { step: 3, text: 'Toss greens with edamame and cilantro.', time: 3 },
      { step: 4, text: 'Top with sliced chicken, wonton strips, sesame seeds. Drizzle with dressing.', time: 3 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    totalTimeMinutes: 30,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 320,
      protein: 32,
      carbs: 22,
      fat: 12,
      fiber: 4,
      sodium: 380
    }),
    originalNutrition: JSON.stringify({
      calories: 410,
      protein: 31,
      carbs: 31,
      fat: 19,
      fiber: 5,
      sodium: 810
    }),
    dietaryTags: JSON.stringify(['low-sodium']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
    isPublished: true,
    isFeatured: false
  },

  // ============================================
  // MULTI-TAG RECIPES (realistic combinations)
  // ============================================
  {
    title: 'High Protein Keto Smash Burger',
    slug: 'high-protein-keto-smash-burger',
    description: 'Smashburger-style double patties wrapped in lettuce - 52g protein and only 4g net carbs.',
    brand: 'Smashburger',
    category: 'burgers',
    originalItemName: 'Double Smash Burger',
    ingredients: JSON.stringify([
      { name: 'ground beef', amount: 2, unit: 'lbs', notes: '80/20' },
      { name: 'butter lettuce', amount: 1, unit: 'head', notes: '' },
      { name: 'American cheese', amount: 8, unit: 'slices', notes: '' },
      { name: 'red onion', amount: 1, unit: 'medium', notes: 'sliced thin' },
      { name: 'pickles', amount: 16, unit: 'slices', notes: '' },
      { name: 'smash sauce', amount: 0.5, unit: 'cup', notes: 'mayo + mustard + pickle juice' },
      { name: 'garlic powder', amount: 1, unit: 'tsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Form beef into 8 loose balls (2oz each). Season generously.', time: 5 },
      { step: 2, text: 'Smash balls flat on screaming hot griddle with firm press. Don\'t move.', time: 3 },
      { step: 3, text: 'Flip when edges are crispy, add cheese. Cook 1 more minute.', time: 2 },
      { step: 4, text: 'Stack 2 patties, wrap in lettuce with onion, pickles, and sauce.', time: 3 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 10,
    totalTimeMinutes: 20,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 620,
      protein: 52,
      carbs: 4,
      fat: 44,
      fiber: 1,
      sodium: 920
    }),
    originalNutrition: JSON.stringify({
      calories: 870,
      protein: 46,
      carbs: 44,
      fat: 58,
      fiber: 2,
      sodium: 1420
    }),
    dietaryTags: JSON.stringify(['high-protein', 'keto', 'low-carb']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Vegan Gluten-Free Buddha Bowl',
    slug: 'vegan-gf-buddha-bowl',
    description: 'Sweetgreen-inspired grain bowl made vegan and gluten-free with quinoa and tahini dressing.',
    brand: 'Sweetgreen',
    category: 'bowls',
    originalItemName: 'Harvest Bowl',
    ingredients: JSON.stringify([
      { name: 'quinoa', amount: 2, unit: 'cups', notes: 'cooked' },
      { name: 'roasted sweet potato', amount: 2, unit: 'cups', notes: 'cubed' },
      { name: 'chickpeas', amount: 1, unit: 'can', notes: 'drained' },
      { name: 'kale', amount: 4, unit: 'cups', notes: 'massaged' },
      { name: 'avocado', amount: 2, unit: 'medium', notes: 'sliced' },
      { name: 'tahini', amount: 0.25, unit: 'cup', notes: '' },
      { name: 'lemon juice', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'maple syrup', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'garlic', amount: 1, unit: 'clove', notes: 'minced' },
      { name: 'pumpkin seeds', amount: 0.25, unit: 'cup', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Roast sweet potato and chickpeas at 400°F with olive oil and cumin.', time: 30 },
      { step: 2, text: 'Massage kale with olive oil and salt until tender.', time: 5 },
      { step: 3, text: 'Whisk tahini with lemon, maple, garlic, and water until smooth.', time: 3 },
      { step: 4, text: 'Build bowls with quinoa, kale, sweet potato, chickpeas, avocado. Drizzle dressing.', time: 5 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    totalTimeMinutes: 45,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 480,
      protein: 16,
      carbs: 58,
      fat: 22,
      fiber: 14,
      sodium: 280
    }),
    originalNutrition: JSON.stringify({
      calories: 705,
      protein: 29,
      carbs: 42,
      fat: 47,
      fiber: 6,
      sodium: 650
    }),
    dietaryTags: JSON.stringify(['vegan', 'gluten-free', 'dairy-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Vegetarian Low-Carb Egg Wrap',
    slug: 'vegetarian-lowcarb-egg-wrap',
    description: 'Starbucks-style spinach feta wrap using an egg wrap instead of tortilla - vegetarian and low-carb.',
    brand: 'Starbucks',
    category: 'breakfast',
    originalItemName: 'Spinach Feta Wrap',
    ingredients: JSON.stringify([
      { name: 'eggs', amount: 8, unit: 'large', notes: '' },
      { name: 'baby spinach', amount: 4, unit: 'cups', notes: '' },
      { name: 'feta cheese', amount: 1, unit: 'cup', notes: 'crumbled' },
      { name: 'sun-dried tomatoes', amount: 0.5, unit: 'cup', notes: 'chopped' },
      { name: 'cream cheese', amount: 4, unit: 'tbsp', notes: 'softened' },
      { name: 'garlic powder', amount: 0.5, unit: 'tsp', notes: '' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Beat 2 eggs, pour into greased non-stick pan, swirl to cover bottom. Cook until set.', time: 3 },
      { step: 2, text: 'Sauté spinach until just wilted, season with garlic powder.', time: 3 },
      { step: 3, text: 'Spread cream cheese on egg wrap, add spinach, feta, sun-dried tomatoes.', time: 2 },
      { step: 4, text: 'Roll up tightly, slice in half. Repeat with remaining eggs.', time: 5 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 310,
      protein: 20,
      carbs: 6,
      fat: 24,
      fiber: 2,
      sodium: 580
    }),
    originalNutrition: JSON.stringify({
      calories: 290,
      protein: 20,
      carbs: 34,
      fat: 10,
      fiber: 6,
      sodium: 840
    }),
    dietaryTags: JSON.stringify(['vegetarian', 'low-carb']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'High Protein Dairy-Free Chicken Bowl',
    slug: 'high-protein-df-chicken-bowl',
    description: 'CAVA-style chicken bowl loaded with protein and completely dairy-free - 48g protein per serving.',
    brand: 'CAVA',
    category: 'bowls',
    originalItemName: 'Greens and Grains Bowl',
    ingredients: JSON.stringify([
      { name: 'chicken breast', amount: 1.5, unit: 'lbs', notes: '' },
      { name: 'quinoa', amount: 2, unit: 'cups', notes: 'cooked' },
      { name: 'cucumber', amount: 1, unit: 'large', notes: 'diced' },
      { name: 'cherry tomatoes', amount: 2, unit: 'cups', notes: 'halved' },
      { name: 'red onion', amount: 0.5, unit: 'cup', notes: 'sliced' },
      { name: 'hummus', amount: 1, unit: 'cup', notes: '' },
      { name: 'lemon juice', amount: 3, unit: 'tbsp', notes: '' },
      { name: 'olive oil', amount: 3, unit: 'tbsp', notes: '' },
      { name: 'oregano', amount: 1, unit: 'tbsp', notes: 'dried' },
      { name: 'garlic', amount: 4, unit: 'cloves', notes: 'minced' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Marinate chicken in olive oil, lemon, oregano, and garlic for 30 minutes.', time: 30 },
      { step: 2, text: 'Grill chicken 6-7 minutes per side until cooked through, let rest and slice.', time: 15 },
      { step: 3, text: 'Toss cucumber, tomatoes, and onion with remaining lemon and olive oil.', time: 5 },
      { step: 4, text: 'Build bowls with quinoa, veggie mixture, sliced chicken, and hummus.', time: 5 }
    ]),
    prepTimeMinutes: 40,
    cookTimeMinutes: 20,
    totalTimeMinutes: 60,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 520,
      protein: 48,
      carbs: 38,
      fat: 20,
      fiber: 8,
      sodium: 420
    }),
    originalNutrition: JSON.stringify({
      calories: 695,
      protein: 46,
      carbs: 54,
      fat: 32,
      fiber: 6,
      sodium: 1190
    }),
    dietaryTags: JSON.stringify(['high-protein', 'dairy-free', 'gluten-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Keto Low-Sodium Bacon Wrapped Chicken',
    slug: 'keto-lowsodium-bacon-chicken',
    description: 'Outback-inspired bacon wrapped chicken made keto and low-sodium with uncured bacon and homemade seasoning.',
    brand: 'Outback Steakhouse',
    category: 'chicken',
    originalItemName: 'Alice Springs Chicken',
    ingredients: JSON.stringify([
      { name: 'chicken breast', amount: 4, unit: 'pieces', notes: '' },
      { name: 'uncured bacon', amount: 8, unit: 'slices', notes: 'no nitrates, low sodium' },
      { name: 'mushrooms', amount: 2, unit: 'cups', notes: 'sliced' },
      { name: 'swiss cheese', amount: 4, unit: 'slices', notes: '' },
      { name: 'honey', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'dijon mustard', amount: 2, unit: 'tbsp', notes: 'no salt added' },
      { name: 'garlic powder', amount: 1, unit: 'tsp', notes: '' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Season chicken with garlic powder and pepper. Sear in hot pan until golden.', time: 8 },
      { step: 2, text: 'Sauté mushrooms in same pan until browned.', time: 5 },
      { step: 3, text: 'Place chicken in baking dish, top with honey-mustard, mushrooms, bacon, cheese.', time: 5 },
      { step: 4, text: 'Bake at 375°F for 20-25 minutes until chicken is 165°F and bacon is crispy.', time: 25 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 35,
    totalTimeMinutes: 50,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 420,
      protein: 45,
      carbs: 8,
      fat: 22,
      fiber: 1,
      sodium: 480
    }),
    originalNutrition: JSON.stringify({
      calories: 678,
      protein: 54,
      carbs: 24,
      fat: 40,
      fiber: 2,
      sodium: 1570
    }),
    dietaryTags: JSON.stringify(['keto', 'low-sodium', 'low-carb']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Vegan High-Protein Tofu Stir Fry',
    slug: 'vegan-high-protein-tofu-stirfry',
    description: 'Panda Express-style tofu stir fry with edamame - vegan with 28g plant protein per serving.',
    brand: 'Panda Express',
    category: 'asian',
    originalItemName: 'Kung Pao Chicken',
    ingredients: JSON.stringify([
      { name: 'extra firm tofu', amount: 2, unit: 'blocks', notes: 'pressed and cubed' },
      { name: 'edamame', amount: 2, unit: 'cups', notes: 'shelled' },
      { name: 'bell peppers', amount: 2, unit: 'large', notes: 'mixed colors, diced' },
      { name: 'zucchini', amount: 2, unit: 'medium', notes: 'diced' },
      { name: 'peanuts', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'soy sauce', amount: 0.25, unit: 'cup', notes: 'low sodium' },
      { name: 'rice vinegar', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'sesame oil', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'chili garlic sauce', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'cornstarch', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'ginger', amount: 1, unit: 'tbsp', notes: 'minced' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Toss tofu cubes in cornstarch, bake at 400°F for 25 min until crispy.', time: 30 },
      { step: 2, text: 'Stir fry vegetables in sesame oil over high heat until crisp-tender.', time: 5 },
      { step: 3, text: 'Mix soy sauce, vinegar, chili garlic sauce, and ginger for sauce.', time: 2 },
      { step: 4, text: 'Add tofu, edamame, peanuts, and sauce. Toss to coat and serve.', time: 3 }
    ]),
    prepTimeMinutes: 20,
    cookTimeMinutes: 35,
    totalTimeMinutes: 55,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 380,
      protein: 28,
      carbs: 22,
      fat: 22,
      fiber: 8,
      sodium: 520
    }),
    originalNutrition: JSON.stringify({
      calories: 290,
      protein: 15,
      carbs: 14,
      fat: 19,
      fiber: 2,
      sodium: 920
    }),
    dietaryTags: JSON.stringify(['vegan', 'high-protein', 'dairy-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Gluten-Free Dairy-Free Fish Tacos',
    slug: 'gf-df-fish-tacos',
    description: 'Rubio\'s famous fish tacos made with corn tortillas and dairy-free crema - GF and DF friendly.',
    brand: 'Rubio\'s',
    category: 'mexican',
    originalItemName: 'Original Fish Taco',
    ingredients: JSON.stringify([
      { name: 'mahi mahi', amount: 1.5, unit: 'lbs', notes: 'or cod' },
      { name: 'corn tortillas', amount: 12, unit: 'small', notes: '' },
      { name: 'cabbage', amount: 3, unit: 'cups', notes: 'shredded' },
      { name: 'lime juice', amount: 4, unit: 'tbsp', notes: '' },
      { name: 'rice flour', amount: 1, unit: 'cup', notes: 'for coating' },
      { name: 'cumin', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'garlic powder', amount: 1, unit: 'tsp', notes: '' },
      { name: 'coconut cream', amount: 0.5, unit: 'cup', notes: '' },
      { name: 'chipotle peppers', amount: 2, unit: 'tbsp', notes: 'minced' },
      { name: 'cilantro', amount: 0.5, unit: 'cup', notes: 'chopped' },
      { name: 'avocado', amount: 2, unit: 'medium', notes: 'sliced' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Cut fish into strips. Coat in rice flour seasoned with cumin and garlic.', time: 5 },
      { step: 2, text: 'Pan fry fish 3-4 minutes per side until golden and flaky.', time: 8 },
      { step: 3, text: 'Make crema: blend coconut cream, chipotle, lime juice.', time: 3 },
      { step: 4, text: 'Warm tortillas, layer with cabbage, fish, crema, avocado, cilantro.', time: 5 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    totalTimeMinutes: 30,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 420,
      protein: 32,
      carbs: 36,
      fat: 18,
      fiber: 6,
      sodium: 380
    }),
    originalNutrition: JSON.stringify({
      calories: 390,
      protein: 21,
      carbs: 39,
      fat: 18,
      fiber: 3,
      sodium: 620
    }),
    dietaryTags: JSON.stringify(['gluten-free', 'dairy-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Vegetarian Keto Stuffed Peppers',
    slug: 'vegetarian-keto-stuffed-peppers',
    description: 'Stuffed bell peppers with cauliflower rice, cheese, and Italian seasonings - vegetarian and keto-friendly.',
    brand: 'Olive Garden',
    category: 'italian',
    originalItemName: 'Stuffed Mushrooms',
    ingredients: JSON.stringify([
      { name: 'bell peppers', amount: 6, unit: 'large', notes: 'tops cut, seeded' },
      { name: 'cauliflower rice', amount: 4, unit: 'cups', notes: '' },
      { name: 'mozzarella cheese', amount: 2, unit: 'cups', notes: 'shredded' },
      { name: 'parmesan cheese', amount: 0.5, unit: 'cup', notes: 'grated' },
      { name: 'ricotta cheese', amount: 1, unit: 'cup', notes: '' },
      { name: 'marinara sauce', amount: 1, unit: 'cup', notes: 'no sugar added' },
      { name: 'Italian seasoning', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'garlic', amount: 4, unit: 'cloves', notes: 'minced' },
      { name: 'spinach', amount: 2, unit: 'cups', notes: 'chopped' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Sauté cauliflower rice with garlic and spinach until tender.', time: 8 },
      { step: 2, text: 'Mix with ricotta, half the mozzarella, parmesan, and seasonings.', time: 3 },
      { step: 3, text: 'Stuff peppers, top with marinara and remaining mozzarella.', time: 5 },
      { step: 4, text: 'Bake at 375°F for 35-40 minutes until peppers are tender and cheese bubbles.', time: 40 }
    ]),
    prepTimeMinutes: 20,
    cookTimeMinutes: 40,
    totalTimeMinutes: 60,
    servings: 6,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 285,
      protein: 18,
      carbs: 14,
      fat: 18,
      fiber: 4,
      sodium: 520
    }),
    originalNutrition: JSON.stringify({
      calories: 350,
      protein: 15,
      carbs: 42,
      fat: 14,
      fiber: 3,
      sodium: 780
    }),
    dietaryTags: JSON.stringify(['vegetarian', 'keto', 'low-carb']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'High Protein Low-Carb Greek Chicken',
    slug: 'high-protein-lowcarb-greek-chicken',
    description: 'Zoes Kitchen-style Greek marinated chicken with tzatziki - 45g protein, only 8g carbs.',
    brand: 'Zoes Kitchen',
    category: 'mediterranean',
    originalItemName: 'Chicken Kabobs',
    ingredients: JSON.stringify([
      { name: 'chicken breast', amount: 2, unit: 'lbs', notes: 'cubed' },
      { name: 'Greek yogurt', amount: 1, unit: 'cup', notes: 'plain' },
      { name: 'cucumber', amount: 1, unit: 'large', notes: 'grated, squeezed dry' },
      { name: 'lemon juice', amount: 3, unit: 'tbsp', notes: '' },
      { name: 'olive oil', amount: 3, unit: 'tbsp', notes: '' },
      { name: 'garlic', amount: 6, unit: 'cloves', notes: 'minced' },
      { name: 'oregano', amount: 2, unit: 'tbsp', notes: 'dried' },
      { name: 'dill', amount: 2, unit: 'tbsp', notes: 'fresh, chopped' },
      { name: 'cherry tomatoes', amount: 2, unit: 'cups', notes: '' },
      { name: 'red onion', amount: 1, unit: 'medium', notes: 'quartered' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Marinate chicken in olive oil, lemon, half the garlic, and oregano for 2 hours.', time: 120 },
      { step: 2, text: 'Make tzatziki: mix yogurt, cucumber, remaining garlic, dill, lemon.', time: 5 },
      { step: 3, text: 'Thread chicken, tomatoes, onion on skewers. Grill 12-15 minutes, turning.', time: 15 },
      { step: 4, text: 'Serve kabobs over greens with tzatziki sauce.', time: 3 }
    ]),
    prepTimeMinutes: 130,
    cookTimeMinutes: 20,
    totalTimeMinutes: 150,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 380,
      protein: 45,
      carbs: 8,
      fat: 18,
      fiber: 2,
      sodium: 320
    }),
    originalNutrition: JSON.stringify({
      calories: 350,
      protein: 36,
      carbs: 18,
      fat: 16,
      fiber: 2,
      sodium: 620
    }),
    dietaryTags: JSON.stringify(['high-protein', 'low-carb', 'gluten-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Vegan Low-Sodium Buddha Bowl',
    slug: 'vegan-low-sodium-buddha-bowl',
    description: 'Tender Greens-style plant-based bowl with no added salt - clean eating with maximum flavor.',
    brand: 'Tender Greens',
    category: 'bowls',
    originalItemName: 'Happy Vegan Plate',
    ingredients: JSON.stringify([
      { name: 'brown rice', amount: 2, unit: 'cups', notes: 'cooked without salt' },
      { name: 'roasted chickpeas', amount: 2, unit: 'cups', notes: '' },
      { name: 'roasted broccoli', amount: 3, unit: 'cups', notes: '' },
      { name: 'shredded carrots', amount: 1, unit: 'cup', notes: '' },
      { name: 'avocado', amount: 2, unit: 'medium', notes: '' },
      { name: 'tahini', amount: 0.25, unit: 'cup', notes: '' },
      { name: 'lemon juice', amount: 3, unit: 'tbsp', notes: '' },
      { name: 'maple syrup', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'cumin', amount: 1, unit: 'tsp', notes: '' },
      { name: 'smoked paprika', amount: 1, unit: 'tsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Toss chickpeas in cumin and paprika, roast at 400°F for 25 minutes.', time: 30 },
      { step: 2, text: 'Roast broccoli with olive oil and garlic at same temp.', time: 25 },
      { step: 3, text: 'Whisk tahini, lemon, maple, and water for dressing.', time: 3 },
      { step: 4, text: 'Build bowls with rice, veggies, chickpeas, avocado. Drizzle dressing.', time: 5 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    totalTimeMinutes: 45,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 420,
      protein: 14,
      carbs: 52,
      fat: 20,
      fiber: 12,
      sodium: 180
    }),
    originalNutrition: JSON.stringify({
      calories: 520,
      protein: 18,
      carbs: 58,
      fat: 24,
      fiber: 10,
      sodium: 780
    }),
    dietaryTags: JSON.stringify(['vegan', 'low-sodium', 'dairy-free']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
    isPublished: true,
    isFeatured: false
  },

  // ============================================
  // CONTROL RECIPES (no special dietary tags)
  // ============================================
  {
    title: 'Classic Quarter Pounder',
    slug: 'classic-quarter-pounder',
    description: 'McDonald\'s Quarter Pounder made at home with fresh beef and classic toppings.',
    brand: 'McDonald\'s',
    category: 'burgers',
    originalItemName: 'Quarter Pounder with Cheese',
    ingredients: JSON.stringify([
      { name: 'ground beef', amount: 1, unit: 'lb', notes: '80/20' },
      { name: 'sesame seed buns', amount: 4, unit: 'count', notes: '' },
      { name: 'American cheese', amount: 4, unit: 'slices', notes: '' },
      { name: 'onion', amount: 1, unit: 'small', notes: 'diced' },
      { name: 'pickles', amount: 8, unit: 'slices', notes: '' },
      { name: 'ketchup', amount: 4, unit: 'tbsp', notes: '' },
      { name: 'mustard', amount: 2, unit: 'tbsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Form beef into 4 quarter-pound patties. Season with salt and pepper.', time: 5 },
      { step: 2, text: 'Cook patties on hot griddle 4-5 minutes per side for medium.', time: 10 },
      { step: 3, text: 'Add cheese in last minute to melt. Toast buns.', time: 2 },
      { step: 4, text: 'Assemble with ketchup, mustard, onions, and pickles.', time: 2 }
    ]),
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 520,
      protein: 30,
      carbs: 38,
      fat: 28,
      fiber: 2,
      sodium: 980
    }),
    originalNutrition: JSON.stringify({
      calories: 520,
      protein: 30,
      carbs: 42,
      fat: 26,
      fiber: 2,
      sodium: 1100
    }),
    dietaryTags: JSON.stringify([]),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Traditional Pepperoni Pizza',
    slug: 'traditional-pepperoni-pizza',
    description: 'Domino\'s-style hand-tossed pepperoni pizza made from scratch.',
    brand: 'Domino\'s',
    category: 'pizza',
    originalItemName: 'Pepperoni Pizza',
    ingredients: JSON.stringify([
      { name: 'pizza dough', amount: 1, unit: 'lb', notes: 'store-bought or homemade' },
      { name: 'pizza sauce', amount: 0.75, unit: 'cup', notes: '' },
      { name: 'mozzarella cheese', amount: 2, unit: 'cups', notes: 'shredded' },
      { name: 'pepperoni', amount: 4, unit: 'oz', notes: 'sliced' },
      { name: 'Italian seasoning', amount: 1, unit: 'tsp', notes: '' },
      { name: 'olive oil', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'garlic powder', amount: 0.5, unit: 'tsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Preheat oven to 475°F with pizza stone or inverted baking sheet inside.', time: 30 },
      { step: 2, text: 'Stretch dough to 12-14 inch round. Brush edges with olive oil.', time: 5 },
      { step: 3, text: 'Spread sauce, add cheese and pepperoni. Sprinkle with seasonings.', time: 3 },
      { step: 4, text: 'Bake 12-15 minutes until crust is golden and cheese bubbles.', time: 15 }
    ]),
    prepTimeMinutes: 35,
    cookTimeMinutes: 15,
    totalTimeMinutes: 50,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 380,
      protein: 16,
      carbs: 42,
      fat: 18,
      fiber: 2,
      sodium: 920
    }),
    originalNutrition: JSON.stringify({
      calories: 300,
      protein: 12,
      carbs: 36,
      fat: 12,
      fiber: 2,
      sodium: 760
    }),
    dietaryTags: JSON.stringify([]),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae78?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Crispy Fried Chicken',
    slug: 'crispy-fried-chicken',
    description: 'KFC Original Recipe copycat - buttermilk-brined and coated in 11 herbs and spices.',
    brand: 'KFC',
    category: 'chicken',
    originalItemName: 'Original Recipe Chicken',
    ingredients: JSON.stringify([
      { name: 'chicken pieces', amount: 3, unit: 'lbs', notes: 'mixed, bone-in' },
      { name: 'buttermilk', amount: 2, unit: 'cups', notes: '' },
      { name: 'flour', amount: 2, unit: 'cups', notes: '' },
      { name: 'paprika', amount: 2, unit: 'tbsp', notes: '' },
      { name: 'white pepper', amount: 1, unit: 'tsp', notes: '' },
      { name: 'garlic powder', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'onion powder', amount: 1, unit: 'tbsp', notes: '' },
      { name: 'oregano', amount: 1, unit: 'tsp', notes: '' },
      { name: 'thyme', amount: 1, unit: 'tsp', notes: '' },
      { name: 'vegetable oil', amount: 4, unit: 'cups', notes: 'for frying' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Soak chicken in buttermilk for 4+ hours or overnight.', time: 240 },
      { step: 2, text: 'Mix flour with all spices and herbs thoroughly.', time: 5 },
      { step: 3, text: 'Dredge chicken in seasoned flour, pressing to adhere. Let rest 10 minutes.', time: 15 },
      { step: 4, text: 'Fry in 350°F oil for 15-18 minutes until golden and cooked through.', time: 18 }
    ]),
    prepTimeMinutes: 260,
    cookTimeMinutes: 20,
    totalTimeMinutes: 280,
    servings: 6,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 450,
      protein: 28,
      carbs: 24,
      fat: 28,
      fiber: 1,
      sodium: 680
    }),
    originalNutrition: JSON.stringify({
      calories: 390,
      protein: 25,
      carbs: 11,
      fat: 27,
      fiber: 1,
      sodium: 1140
    }),
    dietaryTags: JSON.stringify([]),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500',
    isPublished: true,
    isFeatured: false
  },
  {
    title: 'Bacon Egg and Cheese Biscuit',
    slug: 'bacon-egg-cheese-biscuit',
    description: 'McDonald\'s breakfast classic - flaky biscuit with bacon, egg, and melty cheese.',
    brand: 'McDonald\'s',
    category: 'breakfast',
    originalItemName: 'Bacon Egg & Cheese Biscuit',
    ingredients: JSON.stringify([
      { name: 'refrigerated biscuits', amount: 4, unit: 'count', notes: 'buttermilk' },
      { name: 'eggs', amount: 4, unit: 'large', notes: '' },
      { name: 'bacon', amount: 8, unit: 'slices', notes: '' },
      { name: 'American cheese', amount: 4, unit: 'slices', notes: '' },
      { name: 'butter', amount: 2, unit: 'tbsp', notes: '' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Bake biscuits according to package directions.', time: 15 },
      { step: 2, text: 'Cook bacon until crispy. Set aside.', time: 8 },
      { step: 3, text: 'Fry eggs in butter, folding to fit biscuit size.', time: 4 },
      { step: 4, text: 'Split biscuits, layer with cheese, bacon, and egg. Serve hot.', time: 2 }
    ]),
    prepTimeMinutes: 5,
    cookTimeMinutes: 25,
    totalTimeMinutes: 30,
    servings: 4,
    difficulty: 'easy',
    nutrition: JSON.stringify({
      calories: 480,
      protein: 20,
      carbs: 32,
      fat: 30,
      fiber: 1,
      sodium: 1050
    }),
    originalNutrition: JSON.stringify({
      calories: 450,
      protein: 19,
      carbs: 37,
      fat: 26,
      fiber: 1,
      sodium: 1270
    }),
    dietaryTags: JSON.stringify([]),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
    isPublished: true,
    isFeatured: false
  }
];

async function main() {
  console.log('Start seeding...');
  
  // Clear existing recipes first to avoid duplicates
  await prisma.recipe.deleteMany({});
  console.log('Cleared existing recipes');

  const allRecipes = [...sampleRecipes, ...additionalRecipes];
  for (const recipe of allRecipes) {
    const result = await prisma.recipe.create({
      data: recipe,
    });
    console.log(`Created recipe: ${result.title}`);
  }

  console.log(`\nSeeding finished. Created ${allRecipes.length} recipes.`);
  
  // Print summary by dietary tag
  const tagCounts: Record<string, number> = {};
  for (const recipe of allRecipes) {
    const tags = JSON.parse(recipe.dietaryTags) as string[];
    if (tags.length === 0) {
      tagCounts['no-tags'] = (tagCounts['no-tags'] || 0) + 1;
    }
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  console.log('\nRecipes by dietary tag:');
  for (const [tag, count] of Object.entries(tagCounts).sort()) {
    console.log(`  ${tag}: ${count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
