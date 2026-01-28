import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleRecipes = [
  {
    title: 'High Protein Quesarito',
    slug: 'high-protein-quesarito',
    description: 'A healthier take on Taco Bell\'s Quesarito with lean ground turkey and whole wheat tortillas.',
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
    dietaryTags: JSON.stringify(['high-protein', 'high-fiber']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Crispy Baked Chicken Sandwich',
    slug: 'crispy-baked-chicken-sandwich',
    description: 'A healthier version of Chick-fil-A\'s chicken sandwich with baked chicken and whole grain buns.',
    brand: 'Chick-fil-A',
    category: 'chicken',
    originalItemName: 'Original Chicken Sandwich',
    ingredients: JSON.stringify([
      { name: 'chicken breasts', amount: 4, unit: 'pieces', notes: 'boneless, skinless' },
      { name: 'whole grain hamburger buns', amount: 4, unit: 'count', notes: '' },
      { name: 'panko breadcrumbs', amount: 1, unit: 'cup', notes: '' },
      { name: 'flour', amount: 0.5, unit: 'cup', notes: 'all-purpose' },
      { name: 'eggs', amount: 2, unit: 'large', notes: 'beaten' },
      { name: 'pickle slices', amount: 12, unit: 'slices', notes: '' },
      { name: 'lettuce', amount: 4, unit: 'leaves', notes: 'butter lettuce' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Preheat oven to 400°F and line a baking sheet with parchment paper.', time: 5 },
      { step: 2, text: 'Set up breading station: flour in one dish, beaten eggs in another, panko in third.', time: 3 },
      { step: 3, text: 'Dredge chicken in flour, then egg, then panko. Place on baking sheet.', time: 8 },
      { step: 4, text: 'Bake for 20-25 minutes until golden and internal temp reaches 165°F.', time: 25 },
      { step: 5, text: 'Toast buns and assemble sandwiches with lettuce and pickles.', time: 5 }
    ]),
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    totalTimeMinutes: 40,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 385,
      protein: 35,
      carbs: 32,
      fat: 12,
      fiber: 4,
      sodium: 620
    }),
    originalNutrition: JSON.stringify({
      calories: 440,
      protein: 28,
      carbs: 40,
      fat: 19,
      fiber: 2,
      sodium: 1350
    }),
    dietaryTags: JSON.stringify(['high-protein', 'baked-not-fried']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=500',
    isPublished: true,
    isFeatured: true
  },
  {
    title: 'Veggie Big Mac',
    slug: 'veggie-big-mac',
    description: 'A plant-based version of McDonald\'s Big Mac with black bean patties and special sauce.',
    brand: 'McDonald\'s',
    category: 'burgers',
    originalItemName: 'Big Mac',
    ingredients: JSON.stringify([
      { name: 'black beans', amount: 2, unit: 'cans', notes: 'drained and rinsed' },
      { name: 'whole wheat hamburger buns', amount: 4, unit: 'count', notes: '3-layer style' },
      { name: 'romaine lettuce', amount: 2, unit: 'cups', notes: 'shredded' },
      { name: 'tomatoes', amount: 2, unit: 'medium', notes: 'sliced' },
      { name: 'red onion', amount: 0.25, unit: 'cup', notes: 'diced' },
      { name: 'pickles', amount: 8, unit: 'slices', notes: '' },
      { name: 'vegan cheese', amount: 4, unit: 'slices', notes: 'optional' }
    ]),
    instructions: JSON.stringify([
      { step: 1, text: 'Mash black beans and form into 4 patties. Season with salt, pepper, and garlic.', time: 10 },
      { step: 2, text: 'Cook patties in skillet with oil for 4-5 minutes per side until crispy.', time: 10 },
      { step: 3, text: 'Toast bun layers lightly in toaster or dry pan.', time: 3 },
      { step: 4, text: 'Make special sauce by mixing vegan mayo, ketchup, mustard, and pickle relish.', time: 3 },
      { step: 5, text: 'Assemble burgers with sauce, lettuce, patty, cheese, tomato, onion, and pickles.', time: 8 }
    ]),
    prepTimeMinutes: 20,
    cookTimeMinutes: 15,
    totalTimeMinutes: 35,
    servings: 4,
    difficulty: 'medium',
    nutrition: JSON.stringify({
      calories: 320,
      protein: 15,
      carbs: 48,
      fat: 8,
      fiber: 12,
      sodium: 580
    }),
    originalNutrition: JSON.stringify({
      calories: 563,
      protein: 25,
      carbs: 45,
      fat: 33,
      fiber: 3,
      sodium: 1040
    }),
    dietaryTags: JSON.stringify(['vegan', 'high-fiber', 'plant-based']),
    isAiGenerated: false,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    isPublished: true,
    isFeatured: false
  }
];

async function main() {
  console.log('Start seeding...');
  
  for (const recipe of sampleRecipes) {
    const result = await prisma.recipe.create({
      data: recipe,
    });
    console.log(`Created recipe with id: ${result.id}`);
  }
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });