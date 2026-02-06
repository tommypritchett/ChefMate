import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Recipe Database Overhaul ===\n');

  // ============================================
  // STEP 1: Fix mislabeled high-protein recipes
  // ============================================
  console.log('STEP 1: Fixing mislabeled high-protein tags...\n');

  // Classic Quarter Pounder: ratio 17.3 — remove high-protein
  const qp = await prisma.recipe.update({
    where: { slug: 'classic-quarter-pounder' },
    data: { dietaryTags: JSON.stringify([]) },
  });
  console.log(`  ✅ Fixed: ${qp.title} → tags: []`);

  // Dairy-Free Popeyes Sandwich: ratio 16.2 — remove high-protein, keep dairy-free
  const dp = await prisma.recipe.update({
    where: { slug: 'dairy-free-popeyes-sandwich' },
    data: { dietaryTags: JSON.stringify(['dairy-free']) },
  });
  console.log(`  ✅ Fixed: ${dp.title} → tags: ['dairy-free']`);

  // Bunless Baconator: ratio 16.6 — remove high-protein, keep low-carb
  const bb = await prisma.recipe.update({
    where: { slug: 'bunless-baconator' },
    data: { dietaryTags: JSON.stringify(['low-carb']) },
  });
  console.log(`  ✅ Fixed: ${bb.title} → tags: ['low-carb']`);

  console.log('\n');

  // ============================================
  // STEP 2: Add new recipes to fill category gaps
  // ============================================
  // After fix: high-protein=15, low-carb=8, vegetarian=5, vegan=6
  // Need: low-carb≥10, vegetarian≥10, vegan≥10

  console.log('STEP 2: Adding new recipes...\n');

  const newRecipes = [
    // ============================================
    // VEGAN + VEGETARIAN (counts for both)
    // ============================================
    {
      title: 'Vegan Chipotle Sofritas Bowl',
      slug: 'vegan-chipotle-sofritas-bowl',
      description: 'Chipotle\'s signature sofritas bowl recreated at home — spiced braised tofu with cilantro lime rice, black beans, and fresh toppings. 100% plant-based.',
      brand: 'Chipotle',
      category: 'mexican',
      originalItemName: 'Sofritas Bowl',
      ingredients: JSON.stringify([
        { name: 'extra firm tofu', amount: 1, unit: 'block', notes: 'pressed and crumbled' },
        { name: 'chipotle peppers in adobo', amount: 2, unit: 'tbsp', notes: 'minced' },
        { name: 'cumin', amount: 1, unit: 'tsp', notes: '' },
        { name: 'smoked paprika', amount: 1, unit: 'tsp', notes: '' },
        { name: 'oregano', amount: 0.5, unit: 'tsp', notes: '' },
        { name: 'white rice', amount: 2, unit: 'cups', notes: 'cooked' },
        { name: 'lime juice', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'cilantro', amount: 0.25, unit: 'cup', notes: 'chopped' },
        { name: 'black beans', amount: 1, unit: 'can', notes: 'drained' },
        { name: 'corn salsa', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'guacamole', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'romaine lettuce', amount: 2, unit: 'cups', notes: 'shredded' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Press tofu for 15 minutes, then crumble into small pieces.', time: 15 },
        { step: 2, text: 'Sauté tofu with chipotle, cumin, paprika, and oregano until browned and crispy.', time: 10 },
        { step: 3, text: 'Cook rice, then fluff with lime juice and cilantro.', time: 20 },
        { step: 4, text: 'Warm black beans with a pinch of cumin.', time: 3 },
        { step: 5, text: 'Build bowls: rice, beans, sofritas, corn salsa, guac, and lettuce.', time: 3 },
      ]),
      prepTimeMinutes: 20,
      cookTimeMinutes: 25,
      totalTimeMinutes: 45,
      servings: 4,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 420, protein: 18, carbs: 52, fat: 16, fiber: 14, sodium: 580 }),
      originalNutrition: JSON.stringify({ calories: 555, protein: 17, carbs: 72, fat: 21, fiber: 13, sodium: 1070 }),
      dietaryTags: JSON.stringify(['vegan', 'vegetarian', 'dairy-free']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'Vegan Taco Bell Black Bean Crunch',
      slug: 'vegan-taco-bell-black-bean-crunch',
      description: 'Taco Bell\'s Crunchy Taco meets black beans and fresh veggies — crispy, crunchy, and totally plant-based. Way cheaper than the drive-thru.',
      brand: 'Taco Bell',
      category: 'mexican',
      originalItemName: 'Black Bean Crunchy Taco',
      ingredients: JSON.stringify([
        { name: 'crunchy taco shells', amount: 8, unit: 'count', notes: '' },
        { name: 'black beans', amount: 1, unit: 'can', notes: 'drained and mashed' },
        { name: 'taco seasoning', amount: 2, unit: 'tbsp', notes: 'low-sodium' },
        { name: 'shredded lettuce', amount: 2, unit: 'cups', notes: '' },
        { name: 'diced tomatoes', amount: 1, unit: 'cup', notes: '' },
        { name: 'red onion', amount: 0.25, unit: 'cup', notes: 'diced' },
        { name: 'hot sauce', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'avocado', amount: 1, unit: 'medium', notes: 'sliced' },
        { name: 'lime', amount: 1, unit: 'count', notes: 'juiced' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Heat black beans with taco seasoning in a small pot, mashing lightly.', time: 5 },
        { step: 2, text: 'Warm taco shells in oven at 350°F for 3 minutes.', time: 3 },
        { step: 3, text: 'Fill shells with seasoned beans, then top with lettuce, tomato, onion.', time: 3 },
        { step: 4, text: 'Add avocado slices, a squeeze of lime, and hot sauce.', time: 2 },
      ]),
      prepTimeMinutes: 10,
      cookTimeMinutes: 8,
      totalTimeMinutes: 18,
      servings: 4,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 310, protein: 12, carbs: 42, fat: 10, fiber: 11, sodium: 490 }),
      originalNutrition: JSON.stringify({ calories: 350, protein: 9, carbs: 46, fat: 14, fiber: 6, sodium: 710 }),
      dietaryTags: JSON.stringify(['vegan', 'vegetarian', 'dairy-free']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500',
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'Vegan Panda Express Orange Tofu',
      slug: 'vegan-panda-express-orange-tofu',
      description: 'Panda Express\'s iconic orange chicken — but made with crispy baked tofu and a lighter orange glaze. Sweet, tangy, and 100% vegan.',
      brand: 'Panda Express',
      category: 'asian',
      originalItemName: 'Orange Chicken',
      ingredients: JSON.stringify([
        { name: 'extra firm tofu', amount: 2, unit: 'blocks', notes: 'pressed and cubed' },
        { name: 'cornstarch', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'orange juice', amount: 0.5, unit: 'cup', notes: 'fresh squeezed' },
        { name: 'soy sauce', amount: 3, unit: 'tbsp', notes: '' },
        { name: 'rice vinegar', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'maple syrup', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'orange zest', amount: 1, unit: 'tbsp', notes: '' },
        { name: 'garlic', amount: 3, unit: 'cloves', notes: 'minced' },
        { name: 'ginger', amount: 1, unit: 'tbsp', notes: 'minced' },
        { name: 'red pepper flakes', amount: 0.5, unit: 'tsp', notes: '' },
        { name: 'sesame seeds', amount: 1, unit: 'tbsp', notes: '' },
        { name: 'green onions', amount: 3, unit: 'stalks', notes: 'sliced' },
        { name: 'brown rice', amount: 2, unit: 'cups', notes: 'cooked' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Press tofu 20 min, cube, toss in cornstarch. Bake at 425°F for 25 min, flipping halfway.', time: 45 },
        { step: 2, text: 'Make sauce: whisk OJ, soy sauce, vinegar, maple syrup, zest, garlic, ginger, pepper flakes.', time: 3 },
        { step: 3, text: 'Simmer sauce in a pan until thickened, about 5 minutes.', time: 5 },
        { step: 4, text: 'Toss crispy tofu in orange sauce. Serve over rice with sesame seeds and green onions.', time: 2 },
      ]),
      prepTimeMinutes: 25,
      cookTimeMinutes: 30,
      totalTimeMinutes: 55,
      servings: 4,
      difficulty: 'medium',
      nutrition: JSON.stringify({ calories: 360, protein: 18, carbs: 44, fat: 12, fiber: 4, sodium: 540 }),
      originalNutrition: JSON.stringify({ calories: 490, protein: 25, carbs: 51, fat: 21, fiber: 1, sodium: 820 }),
      dietaryTags: JSON.stringify(['vegan', 'vegetarian', 'dairy-free']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500',
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'Vegan Subway Veggie Delite Wrap',
      slug: 'vegan-subway-veggie-delite-wrap',
      description: 'Subway\'s Veggie Delite upgraded with hummus and a spinach tortilla — loaded with fresh veggies and way more filling than the original.',
      brand: 'Subway',
      category: 'sandwiches',
      originalItemName: 'Veggie Delite',
      ingredients: JSON.stringify([
        { name: 'spinach tortillas', amount: 4, unit: 'large', notes: '' },
        { name: 'hummus', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'cucumber', amount: 1, unit: 'large', notes: 'sliced thin' },
        { name: 'tomato', amount: 2, unit: 'medium', notes: 'sliced' },
        { name: 'red onion', amount: 0.5, unit: 'small', notes: 'sliced thin' },
        { name: 'bell pepper', amount: 1, unit: 'large', notes: 'sliced' },
        { name: 'shredded lettuce', amount: 2, unit: 'cups', notes: '' },
        { name: 'banana peppers', amount: 0.25, unit: 'cup', notes: '' },
        { name: 'olive oil', amount: 1, unit: 'tbsp', notes: '' },
        { name: 'red wine vinegar', amount: 1, unit: 'tbsp', notes: '' },
        { name: 'oregano', amount: 0.5, unit: 'tsp', notes: 'dried' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Warm tortillas briefly in a dry pan for pliability.', time: 2 },
        { step: 2, text: 'Spread 2 tbsp hummus on each tortilla.', time: 2 },
        { step: 3, text: 'Layer veggies: lettuce, tomato, cucumber, pepper, onion, banana peppers.', time: 3 },
        { step: 4, text: 'Drizzle with olive oil and vinegar, sprinkle oregano. Roll tightly and slice.', time: 2 },
      ]),
      prepTimeMinutes: 10,
      cookTimeMinutes: 2,
      totalTimeMinutes: 12,
      servings: 4,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 280, protein: 9, carbs: 38, fat: 10, fiber: 6, sodium: 520 }),
      originalNutrition: JSON.stringify({ calories: 230, protein: 9, carbs: 44, fat: 2.5, fiber: 5, sodium: 410 }),
      dietaryTags: JSON.stringify(['vegan', 'vegetarian', 'dairy-free']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500',
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'Vegan In-N-Out Animal Fries',
      slug: 'vegan-in-n-out-animal-fries',
      description: 'In-N-Out\'s famous Animal Fries gone vegan — crispy baked fries with cashew "cheese" sauce, caramelized onions, and secret spread.',
      brand: 'In-N-Out',
      category: 'sides',
      originalItemName: 'Animal Style Fries',
      ingredients: JSON.stringify([
        { name: 'russet potatoes', amount: 3, unit: 'large', notes: 'cut into fries' },
        { name: 'raw cashews', amount: 1, unit: 'cup', notes: 'soaked 2 hours' },
        { name: 'nutritional yeast', amount: 3, unit: 'tbsp', notes: '' },
        { name: 'turmeric', amount: 0.25, unit: 'tsp', notes: 'for color' },
        { name: 'onion', amount: 2, unit: 'large', notes: 'sliced thin' },
        { name: 'vegan mayo', amount: 0.25, unit: 'cup', notes: '' },
        { name: 'ketchup', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'sweet pickle relish', amount: 1, unit: 'tbsp', notes: '' },
        { name: 'olive oil', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'garlic powder', amount: 0.5, unit: 'tsp', notes: '' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Soak cut fries in cold water 30 min. Dry, toss with oil, bake 425°F for 35 min, flipping halfway.', time: 65 },
        { step: 2, text: 'Caramelize onions in a pan over medium-low heat for 20 minutes.', time: 20 },
        { step: 3, text: 'Blend soaked cashews, nutritional yeast, turmeric, garlic powder with 0.5 cup water for cheese sauce.', time: 3 },
        { step: 4, text: 'Make spread: mix vegan mayo, ketchup, relish.', time: 2 },
        { step: 5, text: 'Top fries with cheese sauce, caramelized onions, and spread.', time: 2 },
      ]),
      prepTimeMinutes: 40,
      cookTimeMinutes: 35,
      totalTimeMinutes: 75,
      servings: 4,
      difficulty: 'medium',
      nutrition: JSON.stringify({ calories: 380, protein: 10, carbs: 48, fat: 18, fiber: 6, sodium: 420 }),
      originalNutrition: JSON.stringify({ calories: 750, protein: 20, carbs: 56, fat: 52, fiber: 3, sodium: 1360 }),
      dietaryTags: JSON.stringify(['vegan', 'vegetarian', 'dairy-free']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
      isPublished: true,
      isFeatured: false,
    },

    // ============================================
    // VEGETARIAN ONLY
    // ============================================
    {
      title: 'Vegetarian Panera Broccoli Cheddar Soup',
      slug: 'vegetarian-panera-broccoli-cheddar',
      description: 'Panera\'s famous broccoli cheddar soup made at home — creamy, cheesy, and way cheaper than a bread bowl combo.',
      brand: 'Panera Bread',
      category: 'soups',
      originalItemName: 'Broccoli Cheddar Soup',
      ingredients: JSON.stringify([
        { name: 'broccoli florets', amount: 4, unit: 'cups', notes: 'chopped small' },
        { name: 'sharp cheddar cheese', amount: 2, unit: 'cups', notes: 'shredded' },
        { name: 'butter', amount: 3, unit: 'tbsp', notes: '' },
        { name: 'flour', amount: 3, unit: 'tbsp', notes: '' },
        { name: 'vegetable broth', amount: 3, unit: 'cups', notes: '' },
        { name: 'whole milk', amount: 1, unit: 'cup', notes: '' },
        { name: 'heavy cream', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'onion', amount: 1, unit: 'small', notes: 'diced' },
        { name: 'carrot', amount: 1, unit: 'medium', notes: 'grated' },
        { name: 'garlic', amount: 2, unit: 'cloves', notes: 'minced' },
        { name: 'nutmeg', amount: 0.25, unit: 'tsp', notes: '' },
        { name: 'dijon mustard', amount: 1, unit: 'tsp', notes: '' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Melt butter, sauté onion and carrot until soft. Add garlic.', time: 5 },
        { step: 2, text: 'Stir in flour, cook 1 min. Slowly whisk in broth and milk.', time: 5 },
        { step: 3, text: 'Add broccoli, simmer 15 min until tender. Add cream and nutmeg.', time: 15 },
        { step: 4, text: 'Stir in cheddar and dijon off heat until melted and smooth. Season to taste.', time: 3 },
      ]),
      prepTimeMinutes: 10,
      cookTimeMinutes: 25,
      totalTimeMinutes: 35,
      servings: 6,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 340, protein: 14, carbs: 16, fat: 26, fiber: 3, sodium: 680 }),
      originalNutrition: JSON.stringify({ calories: 360, protein: 13, carbs: 21, fat: 24, fiber: 3, sodium: 1010 }),
      dietaryTags: JSON.stringify(['vegetarian']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500',
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'Vegetarian Chick-fil-A Mac & Cheese',
      slug: 'vegetarian-chick-fil-a-mac-cheese',
      description: 'Chick-fil-A\'s creamy mac & cheese copycat — three-cheese blend with a panko crumb topping. Pure comfort food.',
      brand: 'Chick-fil-A',
      category: 'sides',
      originalItemName: 'Mac & Cheese',
      ingredients: JSON.stringify([
        { name: 'elbow macaroni', amount: 1, unit: 'lb', notes: '' },
        { name: 'sharp cheddar', amount: 1.5, unit: 'cups', notes: 'shredded' },
        { name: 'parmesan', amount: 0.5, unit: 'cup', notes: 'grated' },
        { name: 'cream cheese', amount: 4, unit: 'oz', notes: 'softened' },
        { name: 'whole milk', amount: 2, unit: 'cups', notes: '' },
        { name: 'butter', amount: 3, unit: 'tbsp', notes: '' },
        { name: 'flour', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'panko breadcrumbs', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'garlic powder', amount: 0.5, unit: 'tsp', notes: '' },
        { name: 'paprika', amount: 0.25, unit: 'tsp', notes: '' },
        { name: 'mustard powder', amount: 0.25, unit: 'tsp', notes: '' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Cook pasta 1 minute less than package directions. Drain and set aside.', time: 10 },
        { step: 2, text: 'Melt 2 tbsp butter, whisk in flour, cook 1 min. Add milk gradually, whisk until thick.', time: 5 },
        { step: 3, text: 'Off heat, stir in cheddar, parmesan, cream cheese, garlic, mustard until smooth.', time: 3 },
        { step: 4, text: 'Toss pasta in sauce. Top with panko mixed with 1 tbsp melted butter and paprika.', time: 2 },
        { step: 5, text: 'Broil 2-3 minutes until panko is golden. Watch closely!', time: 3 },
      ]),
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      totalTimeMinutes: 30,
      servings: 8,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 420, protein: 18, carbs: 42, fat: 20, fiber: 2, sodium: 640 }),
      originalNutrition: JSON.stringify({ calories: 450, protein: 16, carbs: 33, fat: 28, fiber: 0, sodium: 1050 }),
      dietaryTags: JSON.stringify(['vegetarian']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=500',
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'Vegetarian Taco Bell Mexican Pizza',
      slug: 'vegetarian-taco-bell-mexican-pizza',
      description: 'The legendary Taco Bell Mexican Pizza — made vegetarian with seasoned refried beans. Two crispy tortillas, beans, sauce, cheese, and toppings.',
      brand: 'Taco Bell',
      category: 'mexican',
      originalItemName: 'Mexican Pizza',
      ingredients: JSON.stringify([
        { name: 'flour tortillas', amount: 8, unit: 'small', notes: '' },
        { name: 'refried beans', amount: 1, unit: 'can', notes: 'vegetarian' },
        { name: 'enchilada sauce', amount: 0.75, unit: 'cup', notes: '' },
        { name: 'Mexican blend cheese', amount: 2, unit: 'cups', notes: 'shredded' },
        { name: 'diced tomatoes', amount: 1, unit: 'cup', notes: '' },
        { name: 'green onions', amount: 4, unit: 'stalks', notes: 'sliced' },
        { name: 'black olives', amount: 0.25, unit: 'cup', notes: 'sliced' },
        { name: 'taco seasoning', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'vegetable oil', amount: 0.25, unit: 'cup', notes: 'for frying tortillas' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Fry tortillas in oil until crispy and golden, about 1 min per side. Drain on paper towels.', time: 8 },
        { step: 2, text: 'Mix refried beans with taco seasoning and heat through.', time: 3 },
        { step: 3, text: 'Place one crispy tortilla on baking sheet, spread beans, top with second tortilla.', time: 3 },
        { step: 4, text: 'Spoon enchilada sauce on top, add cheese, tomatoes, olives, green onions.', time: 3 },
        { step: 5, text: 'Bake at 400°F for 8-10 minutes until cheese is melted and bubbly.', time: 10 },
      ]),
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      totalTimeMinutes: 35,
      servings: 4,
      difficulty: 'medium',
      nutrition: JSON.stringify({ calories: 390, protein: 16, carbs: 36, fat: 20, fiber: 6, sodium: 720 }),
      originalNutrition: JSON.stringify({ calories: 540, protein: 20, carbs: 46, fat: 30, fiber: 5, sodium: 1030 }),
      dietaryTags: JSON.stringify(['vegetarian']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500',
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'Vegetarian Panda Express Chow Mein',
      slug: 'vegetarian-panda-express-chow-mein',
      description: 'Panda Express chow mein made vegetarian with extra veggies and a perfectly balanced soy-sesame sauce. Ready in 20 minutes.',
      brand: 'Panda Express',
      category: 'asian',
      originalItemName: 'Chow Mein',
      ingredients: JSON.stringify([
        { name: 'lo mein noodles', amount: 12, unit: 'oz', notes: '' },
        { name: 'cabbage', amount: 3, unit: 'cups', notes: 'shredded' },
        { name: 'celery', amount: 3, unit: 'stalks', notes: 'sliced diagonally' },
        { name: 'onion', amount: 1, unit: 'large', notes: 'sliced' },
        { name: 'carrots', amount: 2, unit: 'medium', notes: 'julienned' },
        { name: 'soy sauce', amount: 3, unit: 'tbsp', notes: '' },
        { name: 'sesame oil', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'vegetable oil', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'garlic', amount: 3, unit: 'cloves', notes: 'minced' },
        { name: 'sugar', amount: 1, unit: 'tsp', notes: '' },
        { name: 'white pepper', amount: 0.25, unit: 'tsp', notes: '' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Cook noodles per package. Drain, toss with 1 tbsp sesame oil to prevent sticking.', time: 8 },
        { step: 2, text: 'Heat veg oil on high. Stir-fry cabbage, celery, onion, and carrots 3-4 min until crisp-tender.', time: 4 },
        { step: 3, text: 'Add garlic, cook 30 sec. Add noodles, soy sauce, remaining sesame oil, sugar, and pepper.', time: 2 },
        { step: 4, text: 'Toss everything over high heat for 2 minutes until noodles are coated and slightly charred.', time: 2 },
      ]),
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      totalTimeMinutes: 25,
      servings: 4,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 350, protein: 10, carbs: 50, fat: 12, fiber: 4, sodium: 680 }),
      originalNutrition: JSON.stringify({ calories: 510, protein: 13, carbs: 80, fat: 15, fiber: 6, sodium: 980 }),
      dietaryTags: JSON.stringify(['vegetarian']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500',
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'Vegetarian Starbucks Impossible Breakfast Sandwich',
      slug: 'vegetarian-starbucks-impossible-breakfast',
      description: 'Starbucks Impossible Breakfast Sandwich made at home — plant-based sausage patty with egg and cheese on an English muffin.',
      brand: 'Starbucks',
      category: 'breakfast',
      originalItemName: 'Impossible Breakfast Sandwich',
      ingredients: JSON.stringify([
        { name: 'Impossible sausage patties', amount: 4, unit: 'count', notes: 'or Beyond' },
        { name: 'English muffins', amount: 4, unit: 'count', notes: '' },
        { name: 'eggs', amount: 4, unit: 'large', notes: '' },
        { name: 'cheddar cheese', amount: 4, unit: 'slices', notes: '' },
        { name: 'butter', amount: 1, unit: 'tbsp', notes: '' },
        { name: 'salt', amount: 0.25, unit: 'tsp', notes: '' },
        { name: 'black pepper', amount: 0.125, unit: 'tsp', notes: '' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Cook plant sausage patties in a skillet per package directions until browned.', time: 6 },
        { step: 2, text: 'Fry eggs in butter to desired doneness, season with salt and pepper.', time: 4 },
        { step: 3, text: 'Toast English muffins until golden.', time: 3 },
        { step: 4, text: 'Stack: bottom muffin, sausage patty, cheese, egg, top muffin.', time: 1 },
      ]),
      prepTimeMinutes: 5,
      cookTimeMinutes: 12,
      totalTimeMinutes: 17,
      servings: 4,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 380, protein: 22, carbs: 28, fat: 20, fiber: 3, sodium: 650 }),
      originalNutrition: JSON.stringify({ calories: 420, protein: 22, carbs: 34, fat: 22, fiber: 3, sodium: 780 }),
      dietaryTags: JSON.stringify(['vegetarian']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
      isPublished: true,
      isFeatured: false,
    },

    // ============================================
    // LOW-CARB (need 2+ more for 10)
    // ============================================
    {
      title: 'Low-Carb Chick-fil-A Grilled Nuggets',
      slug: 'low-carb-chick-fil-a-grilled-nuggets',
      description: 'Chick-fil-A\'s grilled nuggets copycat — marinated in pickle juice, grilled to perfection. Only 4g carbs with 32g protein.',
      brand: 'Chick-fil-A',
      category: 'chicken',
      originalItemName: 'Grilled Nuggets',
      ingredients: JSON.stringify([
        { name: 'chicken breast', amount: 2, unit: 'lbs', notes: 'cut into 1-inch pieces' },
        { name: 'pickle juice', amount: 1, unit: 'cup', notes: 'for brining' },
        { name: 'milk', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'garlic powder', amount: 1, unit: 'tsp', notes: '' },
        { name: 'paprika', amount: 1, unit: 'tsp', notes: '' },
        { name: 'sugar', amount: 0.5, unit: 'tsp', notes: '' },
        { name: 'olive oil', amount: 1, unit: 'tbsp', notes: '' },
        { name: 'salt', amount: 0.5, unit: 'tsp', notes: '' },
        { name: 'black pepper', amount: 0.25, unit: 'tsp', notes: '' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Brine chicken pieces in pickle juice and milk for at least 1 hour.', time: 60 },
        { step: 2, text: 'Drain and pat dry. Season with garlic, paprika, sugar, salt, pepper.', time: 3 },
        { step: 3, text: 'Grill or pan-sear nuggets on medium-high heat, 3-4 min per side.', time: 8 },
        { step: 4, text: 'Check internal temp hits 165°F. Serve with your favorite sugar-free dipping sauce.', time: 1 },
      ]),
      prepTimeMinutes: 65,
      cookTimeMinutes: 10,
      totalTimeMinutes: 75,
      servings: 4,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 260, protein: 42, carbs: 4, fat: 8, fiber: 0, sodium: 480 }),
      originalNutrition: JSON.stringify({ calories: 140, protein: 25, carbs: 2, fat: 4, fiber: 0, sodium: 530 }),
      dietaryTags: JSON.stringify(['low-carb', 'high-protein', 'gluten-free']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500',
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'Low-Carb Chipotle Chicken Lettuce Bowl',
      slug: 'low-carb-chipotle-chicken-lettuce-bowl',
      description: 'Chipotle bowl without the rice — loaded with grilled chicken, fajita veggies, guac, and salsa on a bed of romaine. Just 12g net carbs.',
      brand: 'Chipotle',
      category: 'bowls',
      originalItemName: 'Chicken Bowl',
      ingredients: JSON.stringify([
        { name: 'chicken breast', amount: 1.5, unit: 'lbs', notes: '' },
        { name: 'romaine lettuce', amount: 6, unit: 'cups', notes: 'chopped' },
        { name: 'bell peppers', amount: 2, unit: 'large', notes: 'sliced' },
        { name: 'onion', amount: 1, unit: 'large', notes: 'sliced' },
        { name: 'guacamole', amount: 0.75, unit: 'cup', notes: '' },
        { name: 'pico de gallo', amount: 0.75, unit: 'cup', notes: '' },
        { name: 'sour cream', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'ancho chili powder', amount: 2, unit: 'tsp', notes: '' },
        { name: 'cumin', amount: 1, unit: 'tsp', notes: '' },
        { name: 'garlic powder', amount: 1, unit: 'tsp', notes: '' },
        { name: 'oregano', amount: 0.5, unit: 'tsp', notes: '' },
        { name: 'lime juice', amount: 2, unit: 'tbsp', notes: '' },
        { name: 'olive oil', amount: 2, unit: 'tbsp', notes: '' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Marinate chicken in chili powder, cumin, garlic, oregano, lime juice, oil for 30 min.', time: 30 },
        { step: 2, text: 'Grill chicken 6-7 min per side until 165°F. Rest 5 min, slice.', time: 18 },
        { step: 3, text: 'Sauté peppers and onion in a hot pan until charred and tender.', time: 6 },
        { step: 4, text: 'Build bowls: romaine base, topped with chicken, fajita veggies, guac, pico, sour cream.', time: 3 },
      ]),
      prepTimeMinutes: 35,
      cookTimeMinutes: 25,
      totalTimeMinutes: 60,
      servings: 4,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 400, protein: 44, carbs: 14, fat: 20, fiber: 6, sodium: 540 }),
      originalNutrition: JSON.stringify({ calories: 665, protein: 36, carbs: 75, fat: 23, fiber: 11, sodium: 1420 }),
      dietaryTags: JSON.stringify(['low-carb', 'high-protein', 'gluten-free']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'Low-Carb Wendy\'s Taco Salad',
      slug: 'low-carb-wendys-taco-salad',
      description: 'Wendy\'s taco salad without the tortilla bowl — seasoned beef over crisp greens with all the Tex-Mex fixings. 10g net carbs.',
      brand: 'Wendy\'s',
      category: 'salads',
      originalItemName: 'Taco Salad',
      ingredients: JSON.stringify([
        { name: 'ground beef', amount: 1, unit: 'lb', notes: '90/10 lean' },
        { name: 'romaine lettuce', amount: 6, unit: 'cups', notes: 'chopped' },
        { name: 'cheddar cheese', amount: 1, unit: 'cup', notes: 'shredded' },
        { name: 'tomato', amount: 1, unit: 'large', notes: 'diced' },
        { name: 'sour cream', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'salsa', amount: 0.5, unit: 'cup', notes: '' },
        { name: 'jalapeños', amount: 0.25, unit: 'cup', notes: 'sliced' },
        { name: 'taco seasoning', amount: 2, unit: 'tbsp', notes: 'low-sodium' },
        { name: 'lime juice', amount: 1, unit: 'tbsp', notes: '' },
      ]),
      instructions: JSON.stringify([
        { step: 1, text: 'Brown ground beef, drain fat. Add taco seasoning and 1/4 cup water, simmer 5 min.', time: 12 },
        { step: 2, text: 'Arrange romaine in large bowls.', time: 2 },
        { step: 3, text: 'Top with seasoned beef, cheese, tomato, jalapeños.', time: 2 },
        { step: 4, text: 'Serve with sour cream, salsa, and a squeeze of lime.', time: 1 },
      ]),
      prepTimeMinutes: 10,
      cookTimeMinutes: 12,
      totalTimeMinutes: 22,
      servings: 4,
      difficulty: 'easy',
      nutrition: JSON.stringify({ calories: 380, protein: 32, carbs: 10, fat: 24, fiber: 3, sodium: 620 }),
      originalNutrition: JSON.stringify({ calories: 660, protein: 28, carbs: 70, fat: 30, fiber: 8, sodium: 1320 }),
      dietaryTags: JSON.stringify(['low-carb', 'gluten-free']),
      isAiGenerated: false,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
      isPublished: true,
      isFeatured: false,
    },
  ];

  let created = 0;
  for (const recipe of newRecipes) {
    try {
      // Check if slug already exists
      const existing = await prisma.recipe.findUnique({ where: { slug: recipe.slug } });
      if (existing) {
        console.log(`  ⏭️  Skipped (exists): ${recipe.title}`);
        continue;
      }
      await prisma.recipe.create({ data: recipe });
      console.log(`  ✅ Created: ${recipe.title}`);
      created++;
    } catch (err: any) {
      console.error(`  ❌ Failed: ${recipe.title} — ${err.message}`);
    }
  }

  console.log(`\n  Created ${created} new recipes.\n`);

  // ============================================
  // STEP 3: Verification
  // ============================================
  console.log('STEP 3: Verification\n');

  const allRecipes = await prisma.recipe.findMany({ where: { isPublished: true } });
  console.log(`  Total recipes: ${allRecipes.length}`);

  const tagCounts: Record<string, number> = {};
  let hpIssues = 0;
  for (const r of allRecipes) {
    const tags = JSON.parse(r.dietaryTags || '[]') as string[];
    const nutrition = JSON.parse(r.nutrition || '{}');
    for (const t of tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    if (tags.includes('high-protein')) {
      const ratio = nutrition.calories / nutrition.protein;
      if (ratio > 15) {
        console.log(`  ⚠️  HIGH-PROTEIN issue: ${r.title} ratio=${ratio.toFixed(1)}`);
        hpIssues++;
      }
    }
  }

  console.log('\n  Tag counts:');
  for (const [tag, count] of Object.entries(tagCounts).sort()) {
    const status = count >= 10 ? '✅' : '⚠️';
    console.log(`    ${status} ${tag}: ${count}`);
  }

  if (hpIssues === 0) {
    console.log('\n  ✅ All high-protein recipes have valid ratios (≤15)');
  } else {
    console.log(`\n  ⚠️  ${hpIssues} high-protein recipes have ratio > 15!`);
  }

  console.log('\n=== Overhaul Complete ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
