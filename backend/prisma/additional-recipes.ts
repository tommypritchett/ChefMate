// Helper to reduce boilerplate
function r(
  title: string, slug: string, desc: string, cat: string,
  ings: Array<[string, number, string, string?]>,
  steps: Array<[number, string, number]>,
  prep: number, cook: number, servings: number, diff: string,
  cal: number, protein: number, carbs: number, fat: number, fiber: number, sodium: number,
  tags: string[], img: string, featured = false, brand: string | null = null
) {
  return {
    title, slug, description: desc, brand, category: cat, originalItemName: null,
    ingredients: JSON.stringify(ings.map(([name, amount, unit, notes]) => ({ name, amount, unit, notes: notes || '' }))),
    instructions: JSON.stringify(steps.map(([step, text, time]) => ({ step, text, time }))),
    prepTimeMinutes: prep, cookTimeMinutes: cook, totalTimeMinutes: prep + cook,
    servings, difficulty: diff,
    nutrition: JSON.stringify({ calories: cal, protein, carbs, fat, fiber, sodium }),
    originalNutrition: null,
    dietaryTags: JSON.stringify(tags),
    isAiGenerated: false, imageUrl: `https://images.unsplash.com/${img}?w=500`,
    isPublished: true, isFeatured: featured,
  };
}

export const additionalRecipes = [
  // ═══════════════════════════════════════════
  // BREAKFAST (10)
  // ═══════════════════════════════════════════
  r('Overnight Oats', 'overnight-oats',
    'Creamy no-cook oats with chia seeds, berries, and honey — perfect meal prep breakfast.', 'breakfast',
    [['rolled oats', 1, 'cup'], ['almond milk', 1, 'cup'], ['chia seeds', 2, 'tablespoons'], ['honey', 1, 'tablespoon'], ['mixed berries', 0.5, 'cup']],
    [[1, 'Mix oats, milk, chia seeds, and honey in a jar.', 3], [2, 'Refrigerate overnight or at least 4 hours.', 0], [3, 'Top with berries and serve cold.', 2]],
    5, 0, 2, 'easy', 310, 10, 52, 8, 8, 95, ['vegetarian', 'meal-prep', 'quick'], 'photo-1517673400267-0251440c45dc'),

  r('Protein Pancakes', 'protein-pancakes',
    'Fluffy pancakes made with protein powder, banana, and eggs — 30g protein per serving.', 'breakfast',
    [['protein powder', 1, 'scoop'], ['banana', 1, 'whole', 'ripe'], ['eggs', 2, 'whole'], ['oat flour', 0.5, 'cup'], ['baking powder', 1, 'teaspoon']],
    [[1, 'Blend all ingredients until smooth.', 2], [2, 'Cook on a greased griddle over medium heat, 2-3 min per side.', 10], [3, 'Serve with fresh fruit and a drizzle of maple syrup.', 2]],
    5, 12, 2, 'easy', 345, 30, 38, 8, 4, 320, ['high-protein', 'quick'], 'photo-1528207776546-365bb710ee93'),

  r('Veggie Egg Muffins', 'veggie-egg-muffins',
    'Grab-and-go egg cups loaded with spinach, peppers, and feta cheese.', 'breakfast',
    [['eggs', 8, 'whole'], ['spinach', 2, 'cups', 'chopped'], ['bell pepper', 1, 'whole', 'diced'], ['feta cheese', 0.5, 'cup', 'crumbled'], ['onion', 0.25, 'cup', 'diced']],
    [[1, 'Preheat oven to 375°F. Grease a 12-cup muffin tin.', 3], [2, 'Whisk eggs and mix in vegetables and cheese.', 3], [3, 'Divide evenly among muffin cups.', 2], [4, 'Bake for 20-22 minutes until set.', 22]],
    8, 22, 4, 'easy', 195, 16, 4, 12, 1, 380, ['high-protein', 'low-carb', 'keto', 'gluten-free', 'meal-prep'], 'photo-1482049016688-2d3e1b311543'),

  r('Tropical Smoothie Bowl', 'tropical-smoothie-bowl',
    'Thick mango-pineapple smoothie bowl topped with granola and coconut flakes.', 'breakfast',
    [['frozen mango', 1.5, 'cups'], ['frozen pineapple', 1, 'cup'], ['banana', 1, 'whole'], ['coconut milk', 0.5, 'cup'], ['granola', 0.25, 'cup']],
    [[1, 'Blend mango, pineapple, banana, and coconut milk until thick.', 3], [2, 'Pour into a bowl.', 1], [3, 'Top with granola, coconut flakes, and sliced fruit.', 2]],
    6, 0, 2, 'easy', 340, 5, 72, 7, 6, 35, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free', 'quick'], 'photo-1590301157890-4810ed352733'),

  r('Loaded Avocado Toast', 'loaded-avocado-toast',
    'Smashed avocado on sourdough with eggs, everything seasoning, and red pepper flakes.', 'breakfast',
    [['sourdough bread', 2, 'slices'], ['avocado', 1, 'whole', 'ripe'], ['eggs', 2, 'whole'], ['everything bagel seasoning', 1, 'teaspoon'], ['lemon juice', 1, 'teaspoon']],
    [[1, 'Toast bread until golden and crispy.', 3], [2, 'Mash avocado with lemon juice, salt, and pepper. Spread on toast.', 2], [3, 'Fry eggs sunny-side up and place on top.', 4], [4, 'Sprinkle with everything seasoning and red pepper flakes.', 1]],
    5, 8, 2, 'easy', 385, 16, 32, 24, 8, 420, ['vegetarian', 'quick'], 'photo-1525351484163-7529414344d8'),

  r('Shakshuka', 'shakshuka',
    'North African eggs poached in spiced tomato sauce with peppers and onions.', 'breakfast',
    [['canned tomatoes', 1, 'can', '28 oz'], ['eggs', 6, 'whole'], ['bell pepper', 1, 'whole', 'diced'], ['onion', 1, 'whole', 'diced'], ['cumin', 1, 'teaspoon'], ['feta cheese', 0.25, 'cup', 'crumbled']],
    [[1, 'Sauté onion and pepper in olive oil until soft.', 7], [2, 'Add tomatoes, cumin, paprika, and simmer 10 minutes.', 10], [3, 'Make wells and crack eggs into the sauce. Cover and cook 5-7 min.', 7], [4, 'Top with feta and fresh herbs. Serve with bread.', 1]],
    10, 25, 4, 'easy', 245, 15, 18, 12, 4, 580, ['vegetarian', 'gluten-free'], 'photo-1590412200988-a436970781fa'),

  r('Cinnamon French Toast', 'cinnamon-french-toast',
    'Classic French toast with cinnamon, vanilla, and a crispy golden exterior.', 'breakfast',
    [['thick bread', 6, 'slices', 'brioche or challah'], ['eggs', 3, 'whole'], ['milk', 0.75, 'cup'], ['cinnamon', 1.5, 'teaspoons'], ['vanilla extract', 1, 'teaspoon'], ['butter', 2, 'tablespoons']],
    [[1, 'Whisk eggs, milk, cinnamon, and vanilla in a shallow dish.', 2], [2, 'Dip each bread slice, coating both sides.', 3], [3, 'Cook in buttered pan 2-3 minutes per side until golden.', 12], [4, 'Serve with maple syrup and fresh berries.', 1]],
    5, 15, 3, 'easy', 365, 12, 42, 16, 2, 380, ['vegetarian'], 'photo-1484723091739-30a097e8f929'),

  r('Maple Pecan Granola', 'maple-pecan-granola',
    'Crunchy homemade granola clusters with maple syrup, pecans, and dried cranberries.', 'breakfast',
    [['rolled oats', 3, 'cups'], ['pecans', 1, 'cup', 'chopped'], ['maple syrup', 0.33, 'cup'], ['coconut oil', 0.25, 'cup', 'melted'], ['dried cranberries', 0.5, 'cup']],
    [[1, 'Preheat oven to 325°F. Mix oats, pecans, syrup, and oil.', 3], [2, 'Spread on baking sheet and press flat.', 2], [3, 'Bake 25 minutes, stirring halfway.', 25], [4, 'Cool completely, add cranberries, and break into clusters.', 5]],
    5, 30, 8, 'easy', 285, 6, 36, 14, 4, 10, ['vegan', 'vegetarian', 'dairy-free', 'meal-prep'], 'photo-1517093602195-b40af9688b46'),

  r('Breakfast Burrito', 'breakfast-burrito-supreme',
    'Hearty breakfast burrito with scrambled eggs, black beans, cheese, and salsa.', 'breakfast',
    [['large flour tortillas', 4, 'whole'], ['eggs', 6, 'whole'], ['black beans', 1, 'can', 'drained'], ['cheddar cheese', 1, 'cup', 'shredded'], ['salsa', 0.5, 'cup'], ['avocado', 1, 'whole', 'sliced']],
    [[1, 'Scramble eggs in a skillet over medium heat.', 5], [2, 'Warm beans and tortillas.', 2], [3, 'Fill tortillas with eggs, beans, cheese, salsa, and avocado.', 3], [4, 'Roll into burritos. Optional: grill for crispy exterior.', 3]],
    8, 10, 4, 'easy', 485, 26, 42, 22, 10, 720, ['high-protein'], 'photo-1626700051175-6818013e1d4f'),

  r('Chia Pudding', 'vanilla-chia-pudding',
    'Creamy vanilla chia pudding that preps in 5 minutes and sets overnight.', 'breakfast',
    [['chia seeds', 0.33, 'cup'], ['almond milk', 1.5, 'cups'], ['maple syrup', 2, 'tablespoons'], ['vanilla extract', 1, 'teaspoon'], ['fresh fruit', 0.5, 'cup']],
    [[1, 'Mix chia seeds, milk, syrup, and vanilla in a jar.', 2], [2, 'Stir well to prevent clumping.', 1], [3, 'Refrigerate at least 4 hours or overnight.', 0], [4, 'Top with fresh fruit and serve.', 2]],
    5, 0, 2, 'easy', 235, 7, 30, 10, 12, 120, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free', 'meal-prep'], 'photo-1511690743698-d9d18f7e20f1'),

  // ═══════════════════════════════════════════
  // CROCKPOT / SLOW COOKER (10)
  // ═══════════════════════════════════════════
  r('Slow Cooker Beef Stew', 'slow-cooker-beef-stew',
    'Hearty beef stew with tender vegetables, slowly simmered for maximum flavor.', 'crockpot',
    [['beef chuck', 2, 'lbs', 'cubed'], ['potatoes', 3, 'whole', 'cubed'], ['carrots', 3, 'whole', 'sliced'], ['onion', 1, 'whole', 'diced'], ['beef broth', 3, 'cups'], ['tomato paste', 2, 'tablespoons']],
    [[1, 'Brown beef in a skillet with oil. Transfer to slow cooker.', 8], [2, 'Add vegetables, broth, tomato paste, and seasonings.', 5], [3, 'Cook on low 8 hours or high 4 hours until beef is tender.', 480], [4, 'Season and thicken with a cornstarch slurry if desired.', 5]],
    20, 480, 6, 'easy', 385, 35, 28, 14, 4, 620, ['high-protein', 'dairy-free', 'gluten-free', 'meal-prep'], 'photo-1534939561126-855b8675edd7'),

  r('Pulled Pork', 'slow-cooker-pulled-pork',
    'Fall-apart tender pulled pork with smoky BBQ sauce. Perfect for sandwiches.', 'crockpot',
    [['pork shoulder', 4, 'lbs'], ['BBQ sauce', 1.5, 'cups'], ['apple cider vinegar', 0.25, 'cup'], ['brown sugar', 2, 'tablespoons'], ['onion', 1, 'whole', 'sliced'], ['garlic', 4, 'cloves']],
    [[1, 'Rub pork with spices and place in slow cooker with onion and garlic.', 5], [2, 'Add vinegar and half the BBQ sauce.', 2], [3, 'Cook on low 8-10 hours until easily shredded.', 540], [4, 'Shred with forks, mix with remaining BBQ sauce.', 5]],
    10, 540, 10, 'easy', 420, 38, 22, 20, 1, 680, ['high-protein', 'dairy-free'], 'photo-1529193591184-b1d58069ecdd'),

  r('Chicken Tortilla Soup', 'chicken-tortilla-soup',
    'Zesty Mexican soup with shredded chicken, black beans, corn, and crispy tortilla strips.', 'crockpot',
    [['chicken breasts', 1.5, 'lbs'], ['diced tomatoes', 2, 'cans', '14 oz each'], ['black beans', 1, 'can', 'drained'], ['corn', 1, 'cup'], ['chicken broth', 3, 'cups'], ['tortilla strips', 1, 'cup']],
    [[1, 'Place chicken, tomatoes, beans, corn, broth, and spices in slow cooker.', 5], [2, 'Cook on low 6-8 hours or high 3-4 hours.', 420], [3, 'Shred chicken with two forks and stir back in.', 3], [4, 'Serve topped with tortilla strips, avocado, and sour cream.', 2]],
    10, 420, 6, 'easy', 340, 32, 35, 8, 8, 780, ['high-protein', 'gluten-free'], 'photo-1547592166-23ac45744acd'),

  r('Slow Cooker Chili', 'slow-cooker-chili',
    'Award-winning beef and bean chili loaded with peppers and warm spices.', 'crockpot',
    [['ground beef', 2, 'lbs'], ['kidney beans', 2, 'cans', 'drained'], ['diced tomatoes', 1, 'can', '28 oz'], ['onion', 1, 'whole', 'diced'], ['bell peppers', 2, 'whole', 'diced'], ['chili powder', 3, 'tablespoons']],
    [[1, 'Brown ground beef in a skillet and drain fat.', 8], [2, 'Add everything to slow cooker with spices.', 5], [3, 'Cook on low 6-8 hours for deepest flavor.', 420], [4, 'Serve with shredded cheese, sour cream, and cornbread.', 2]],
    15, 420, 8, 'easy', 395, 32, 30, 16, 10, 720, ['high-protein', 'gluten-free'], 'photo-1455619452474-d2be8b1e70cd'),

  r('Crockpot Pot Roast', 'crockpot-pot-roast',
    'Classic Sunday pot roast with melt-in-your-mouth beef and root vegetables.', 'crockpot',
    [['beef chuck roast', 3, 'lbs'], ['potatoes', 4, 'whole', 'quartered'], ['carrots', 4, 'whole', 'cut in chunks'], ['onion', 1, 'whole', 'quartered'], ['beef broth', 1, 'cup'], ['garlic', 4, 'cloves']],
    [[1, 'Sear roast on all sides in hot pan.', 8], [2, 'Place vegetables in slow cooker, set roast on top.', 3], [3, 'Add broth, garlic, and herbs. Cook on low 8-10 hours.', 540], [4, 'Slice beef and serve with vegetables and au jus.', 5]],
    15, 540, 6, 'easy', 445, 42, 24, 20, 3, 480, ['high-protein', 'dairy-free', 'gluten-free'], 'photo-1544025162-d76694265947'),

  r('Carnitas', 'slow-cooker-carnitas',
    'Mexican-style braised pork that is tender inside and crisped under the broiler.', 'crockpot',
    [['pork shoulder', 3, 'lbs', 'trimmed'], ['orange juice', 0.5, 'cup'], ['lime juice', 0.25, 'cup'], ['onion', 1, 'whole', 'quartered'], ['garlic', 6, 'cloves'], ['cumin', 1, 'tablespoon']],
    [[1, 'Rub pork with cumin, oregano, salt, and pepper.', 5], [2, 'Place in slow cooker with onion, garlic, and juices.', 3], [3, 'Cook on low 8 hours until fork-tender. Shred.', 480], [4, 'Broil shredded pork for 3-5 min until edges crisp.', 5]],
    10, 485, 8, 'easy', 365, 36, 6, 22, 0, 420, ['high-protein', 'gluten-free', 'dairy-free'], 'photo-1551504734-5ee1c4a1479b'),

  r('White Chicken Chili', 'white-chicken-chili',
    'Creamy white chili with chicken, white beans, green chiles, and a hint of lime.', 'crockpot',
    [['chicken breasts', 1.5, 'lbs'], ['white beans', 2, 'cans', 'drained'], ['green chiles', 2, 'cans', '4 oz each'], ['chicken broth', 3, 'cups'], ['cream cheese', 4, 'oz'], ['cumin', 1, 'teaspoon']],
    [[1, 'Add chicken, beans, chiles, broth, and spices to slow cooker.', 5], [2, 'Cook on low 6-8 hours or high 3-4 hours.', 420], [3, 'Shred chicken and stir in cream cheese until melted.', 5], [4, 'Serve with tortilla chips, lime wedges, and jalapeños.', 2]],
    10, 420, 6, 'easy', 365, 35, 28, 12, 7, 780, ['high-protein', 'gluten-free'], 'photo-1604152135912-04a022e23696'),

  r('Crockpot Lentil Soup', 'crockpot-lentil-soup',
    'Nourishing lentil soup with vegetables, cumin, and a squeeze of lemon.', 'crockpot',
    [['brown lentils', 2, 'cups', 'rinsed'], ['carrots', 3, 'whole', 'diced'], ['celery', 3, 'stalks', 'diced'], ['onion', 1, 'whole', 'diced'], ['vegetable broth', 6, 'cups'], ['cumin', 1, 'teaspoon']],
    [[1, 'Add all ingredients to slow cooker.', 5], [2, 'Cook on low 6-8 hours until lentils are tender.', 420], [3, 'Season with salt, pepper, and lemon juice.', 2], [4, 'Blend partially for creamier texture if desired.', 2]],
    10, 420, 6, 'easy', 285, 18, 46, 2, 16, 480, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free', 'budget-friendly', 'meal-prep'], 'photo-1547592166-23ac45744acd'),

  r('Slow Cooker Butter Chicken', 'slow-cooker-butter-chicken',
    'Restaurant-quality Indian butter chicken made easy in the slow cooker.', 'crockpot',
    [['chicken thighs', 2, 'lbs', 'boneless'], ['tomato sauce', 1, 'can', '15 oz'], ['heavy cream', 0.5, 'cup'], ['butter', 3, 'tablespoons'], ['garam masala', 2, 'tablespoons'], ['garlic', 4, 'cloves', 'minced']],
    [[1, 'Cut chicken into chunks and place in slow cooker.', 5], [2, 'Mix tomato sauce, spices, garlic, and ginger. Pour over chicken.', 3], [3, 'Cook on low 6 hours. Stir in butter and cream.', 360], [4, 'Serve over basmati rice with naan bread.', 2]],
    10, 360, 6, 'easy', 395, 32, 12, 24, 2, 580, ['high-protein', 'gluten-free'], 'photo-1565557623262-b51c2513a641'),

  r('Crockpot BBQ Ribs', 'crockpot-bbq-ribs',
    'Fall-off-the-bone baby back ribs slow-cooked with smoky BBQ sauce.', 'crockpot',
    [['baby back ribs', 2, 'racks'], ['BBQ sauce', 2, 'cups'], ['brown sugar', 2, 'tablespoons'], ['apple cider vinegar', 2, 'tablespoons'], ['smoked paprika', 1, 'tablespoon'], ['garlic powder', 1, 'teaspoon']],
    [[1, 'Remove membrane from ribs. Rub with spices.', 5], [2, 'Cut racks to fit slow cooker, stand upright along sides.', 3], [3, 'Pour half the BBQ sauce over ribs. Cook low 7-8 hours.', 480], [4, 'Broil with remaining sauce 3-5 min for caramelized finish.', 5]],
    10, 485, 4, 'easy', 520, 38, 28, 28, 1, 880, ['high-protein', 'dairy-free', 'gluten-free'], 'photo-1544025162-d76694265947'),

  // ═══════════════════════════════════════════
  // SHEET PAN (8)
  // ═══════════════════════════════════════════
  r('Sheet Pan Fajitas', 'sheet-pan-fajitas',
    'Sizzling fajitas with chicken, peppers, and onions — all on one sheet pan.', 'sheet-pan',
    [['chicken breasts', 1.5, 'lbs', 'sliced'], ['bell peppers', 3, 'whole', 'sliced'], ['onion', 1, 'whole', 'sliced'], ['fajita seasoning', 2, 'tablespoons'], ['olive oil', 2, 'tablespoons'], ['tortillas', 8, 'whole']],
    [[1, 'Preheat oven to 425°F. Toss chicken and veggies with seasoning and oil.', 5], [2, 'Spread on sheet pan in single layer.', 3], [3, 'Bake 20-25 minutes until chicken is cooked and veggies charred.', 22], [4, 'Serve in warm tortillas with toppings.', 2]],
    10, 25, 4, 'easy', 385, 34, 36, 12, 4, 640, ['high-protein', 'dairy-free', 'quick'], 'photo-1565299585323-38d6b0865b47'),

  r('Lemon Herb Chicken & Vegetables', 'lemon-herb-sheet-pan-chicken',
    'One-pan roasted chicken thighs with potatoes and seasonal vegetables.', 'sheet-pan',
    [['chicken thighs', 6, 'pieces', 'bone-in'], ['baby potatoes', 1.5, 'lbs', 'halved'], ['broccoli', 2, 'cups', 'florets'], ['lemon', 2, 'whole', 'sliced'], ['garlic', 4, 'cloves'], ['herbs', 2, 'tablespoons', 'rosemary, thyme']],
    [[1, 'Preheat oven to 425°F. Toss potatoes with oil and arrange on sheet pan.', 5], [2, 'Season chicken and nestle among potatoes with lemon slices.', 5], [3, 'Bake 25 min, add broccoli, bake 10 more minutes.', 35], [4, 'Rest 5 minutes before serving.', 5]],
    15, 40, 4, 'easy', 425, 36, 30, 18, 5, 520, ['high-protein', 'gluten-free', 'dairy-free'], 'photo-1598103442097-8b74394b95c6'),

  r('Sheet Pan Salmon & Asparagus', 'sheet-pan-salmon-asparagus',
    'Perfectly baked salmon fillets with roasted asparagus and lemon butter.', 'sheet-pan',
    [['salmon fillets', 4, 'pieces', '6 oz each'], ['asparagus', 1, 'lb', 'trimmed'], ['lemon', 1, 'whole', 'sliced'], ['butter', 2, 'tablespoons', 'melted'], ['garlic', 3, 'cloves', 'minced']],
    [[1, 'Preheat oven to 400°F. Arrange asparagus on sheet pan.', 3], [2, 'Place salmon on top. Brush with garlic butter and top with lemon.', 5], [3, 'Bake 12-15 minutes until salmon flakes easily.', 14], [4, 'Season with salt, pepper, and fresh dill.', 1]],
    10, 15, 4, 'easy', 365, 38, 6, 20, 3, 380, ['high-protein', 'low-carb', 'keto', 'gluten-free', 'quick'], 'photo-1467003909585-2f8a72700288'),

  r('Sausage & Peppers Sheet Pan', 'sheet-pan-sausage-peppers',
    'Italian sausages roasted with colorful peppers and onions. Simple and delicious.', 'sheet-pan',
    [['Italian sausages', 6, 'links'], ['bell peppers', 4, 'whole', 'sliced'], ['onion', 2, 'whole', 'sliced'], ['olive oil', 2, 'tablespoons'], ['Italian seasoning', 1, 'tablespoon']],
    [[1, 'Preheat oven to 400°F. Slice sausages or leave whole.', 3], [2, 'Toss peppers and onions with oil and seasoning on sheet pan.', 3], [3, 'Nestle sausages among vegetables.', 2], [4, 'Bake 25-30 minutes until sausages are browned and veggies tender.', 28]],
    8, 30, 4, 'easy', 445, 24, 16, 32, 3, 920, ['high-protein', 'gluten-free', 'dairy-free', 'quick'], 'photo-1529193591184-b1d58069ecdd'),

  r('Honey Garlic Shrimp & Broccoli', 'sheet-pan-honey-garlic-shrimp',
    'Sweet and garlicky shrimp with crispy broccoli, all done in 20 minutes.', 'sheet-pan',
    [['large shrimp', 1.5, 'lbs', 'peeled'], ['broccoli', 4, 'cups', 'florets'], ['honey', 3, 'tablespoons'], ['soy sauce', 2, 'tablespoons'], ['garlic', 4, 'cloves', 'minced'], ['sesame seeds', 1, 'tablespoon']],
    [[1, 'Preheat oven to 425°F. Toss broccoli with oil on sheet pan, bake 10 min.', 12], [2, 'Mix honey, soy sauce, and garlic for glaze.', 2], [3, 'Add shrimp to pan, drizzle with glaze, bake 8 min more.', 8], [4, 'Garnish with sesame seeds and serve over rice.', 2]],
    10, 22, 4, 'easy', 285, 32, 22, 6, 4, 720, ['high-protein', 'dairy-free', 'quick'], 'photo-1559847844-5315695dadae'),

  r('Teriyaki Chicken Sheet Pan', 'sheet-pan-teriyaki-chicken',
    'Sticky teriyaki chicken with snap peas and pineapple on one pan.', 'sheet-pan',
    [['chicken thighs', 2, 'lbs', 'boneless'], ['teriyaki sauce', 0.5, 'cup'], ['snap peas', 2, 'cups'], ['pineapple chunks', 1, 'cup'], ['sesame oil', 1, 'tablespoon']],
    [[1, 'Marinate chicken in teriyaki sauce for 15 minutes.', 15], [2, 'Preheat oven to 425°F. Place chicken on sheet pan.', 3], [3, 'Bake 15 min, add snap peas and pineapple, bake 10 more.', 25], [4, 'Broil 2-3 min for caramelized finish. Serve over rice.', 3]],
    20, 28, 4, 'easy', 395, 34, 28, 14, 2, 840, ['high-protein', 'dairy-free'], 'photo-1567620832903-9fc6debc209f'),

  r('Italian Sheet Pan Chicken', 'italian-sheet-pan-chicken',
    'Herb-crusted chicken with zucchini, tomatoes, and olives — Mediterranean flavors.', 'sheet-pan',
    [['chicken breasts', 4, 'pieces'], ['zucchini', 2, 'whole', 'sliced'], ['cherry tomatoes', 2, 'cups'], ['olives', 0.5, 'cup', 'kalamata'], ['Italian herbs', 2, 'tablespoons'], ['olive oil', 3, 'tablespoons']],
    [[1, 'Preheat oven to 425°F. Rub chicken with herbs and oil.', 5], [2, 'Arrange chicken and vegetables on sheet pan.', 3], [3, 'Bake 22-25 minutes until chicken reaches 165°F.', 24], [4, 'Squeeze fresh lemon over everything before serving.', 1]],
    10, 25, 4, 'easy', 345, 38, 10, 18, 3, 520, ['high-protein', 'low-carb', 'gluten-free', 'dairy-free', 'quick'], 'photo-1532550907401-a500c9a57435'),

  r('Roasted Cauliflower Steaks', 'roasted-cauliflower-steaks',
    'Thick cauliflower steaks roasted until golden with chimichurri sauce.', 'sheet-pan',
    [['cauliflower', 2, 'heads', 'cut into 1-inch steaks'], ['olive oil', 3, 'tablespoons'], ['cumin', 1, 'teaspoon'], ['smoked paprika', 1, 'teaspoon'], ['chimichurri', 0.5, 'cup']],
    [[1, 'Preheat oven to 425°F. Brush cauliflower steaks with oil and spices.', 5], [2, 'Arrange on sheet pan in single layer.', 2], [3, 'Roast 25-30 minutes, flipping halfway, until golden and tender.', 28], [4, 'Drizzle with chimichurri and serve.', 2]],
    10, 30, 4, 'easy', 165, 6, 16, 10, 6, 280, ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-calorie', 'low-carb'], 'photo-1607532941433-304659e8198a'),

  // ═══════════════════════════════════════════
  // SALADS (8)
  // ═══════════════════════════════════════════
  r('Classic Cobb Salad', 'classic-cobb-salad',
    'Rows of grilled chicken, bacon, avocado, egg, and blue cheese over greens.', 'salad',
    [['romaine lettuce', 6, 'cups', 'chopped'], ['grilled chicken', 1, 'lb', 'sliced'], ['bacon', 6, 'slices', 'cooked, crumbled'], ['avocado', 1, 'whole', 'diced'], ['hard-boiled eggs', 4, 'whole'], ['blue cheese', 0.5, 'cup', 'crumbled']],
    [[1, 'Arrange chopped romaine on a large platter.', 2], [2, 'Arrange rows of chicken, bacon, avocado, egg, and tomato.', 5], [3, 'Sprinkle with blue cheese.', 1], [4, 'Serve with ranch or vinaigrette dressing on the side.', 1]],
    15, 0, 4, 'easy', 425, 38, 8, 28, 4, 720, ['high-protein', 'low-carb', 'gluten-free', 'keto'], 'photo-1512621776951-a57141f2eefd'),

  r('Grilled Caesar Salad', 'grilled-caesar-salad',
    'Charred romaine hearts with creamy Caesar dressing, parmesan, and croutons.', 'salad',
    [['romaine hearts', 4, 'whole', 'halved lengthwise'], ['Caesar dressing', 0.5, 'cup'], ['parmesan cheese', 0.5, 'cup', 'shaved'], ['croutons', 1, 'cup'], ['lemon', 1, 'whole'], ['olive oil', 2, 'tablespoons']],
    [[1, 'Brush romaine halves with olive oil and season.', 3], [2, 'Grill cut-side down 2-3 minutes until lightly charred.', 3], [3, 'Plate and drizzle generously with Caesar dressing.', 2], [4, 'Top with parmesan shavings, croutons, and a lemon squeeze.', 2]],
    8, 3, 4, 'easy', 285, 10, 18, 20, 3, 580, ['vegetarian', 'quick'], 'photo-1550304943-4f24f54ddde9'),

  r('Greek Salad', 'traditional-greek-salad',
    'Chunky Mediterranean salad with tomatoes, cucumber, feta, and olive oil dressing.', 'salad',
    [['tomatoes', 4, 'whole', 'chunked'], ['cucumber', 1, 'whole', 'chunked'], ['red onion', 0.5, 'whole', 'sliced'], ['kalamata olives', 0.5, 'cup'], ['feta cheese', 6, 'oz', 'block'], ['olive oil', 3, 'tablespoons']],
    [[1, 'Cut tomatoes and cucumber into large chunks.', 5], [2, 'Toss with onion and olives in a bowl.', 2], [3, 'Place feta block on top. Drizzle with olive oil and oregano.', 2], [4, 'Season with salt, pepper, and a splash of red wine vinegar.', 1]],
    10, 0, 4, 'easy', 225, 8, 12, 18, 3, 620, ['vegetarian', 'gluten-free', 'low-carb', 'quick'], 'photo-1540189549336-e6e99c3679fe'),

  r('Thai Mango Salad', 'thai-mango-salad',
    'Bright and refreshing salad with mango, peanuts, and spicy lime dressing.', 'salad',
    [['green mango', 2, 'whole', 'julienned'], ['carrots', 2, 'whole', 'shredded'], ['peanuts', 0.33, 'cup', 'crushed'], ['cilantro', 0.5, 'cup'], ['lime juice', 3, 'tablespoons'], ['fish sauce', 1, 'tablespoon']],
    [[1, 'Julienne green mango and shred carrots.', 8], [2, 'Mix lime juice, fish sauce, sugar, and chili for dressing.', 2], [3, 'Toss mango, carrots, herbs, and dressing together.', 2], [4, 'Top with crushed peanuts and serve immediately.', 1]],
    12, 0, 4, 'easy', 195, 6, 28, 8, 4, 480, ['dairy-free', 'gluten-free', 'vegan', 'quick', 'low-calorie'], 'photo-1540420773420-3366772f4999'),

  r('Mediterranean Quinoa Salad', 'mediterranean-quinoa-salad',
    'Protein-packed quinoa salad with chickpeas, sun-dried tomatoes, and lemon dressing.', 'salad',
    [['quinoa', 1.5, 'cups', 'cooked'], ['chickpeas', 1, 'can', 'drained'], ['sun-dried tomatoes', 0.5, 'cup', 'chopped'], ['cucumber', 1, 'whole', 'diced'], ['red onion', 0.25, 'cup', 'diced'], ['feta cheese', 0.5, 'cup', 'crumbled']],
    [[1, 'Cook quinoa and let cool to room temperature.', 15], [2, 'Toss with chickpeas, tomatoes, cucumber, and onion.', 3], [3, 'Whisk lemon juice, olive oil, and oregano for dressing.', 2], [4, 'Drizzle dressing, top with feta, and serve.', 1]],
    15, 15, 4, 'easy', 345, 14, 48, 12, 8, 420, ['vegetarian', 'high-protein', 'meal-prep'], 'photo-1505253758473-96b7015fcd40'),

  r('Southwest Chicken Salad', 'southwest-chicken-salad',
    'Grilled chicken salad with black beans, corn, avocado, and chipotle ranch.', 'salad',
    [['grilled chicken', 1, 'lb', 'sliced'], ['mixed greens', 6, 'cups'], ['black beans', 1, 'can', 'drained'], ['corn', 1, 'cup'], ['avocado', 1, 'whole', 'diced'], ['chipotle ranch', 0.5, 'cup']],
    [[1, 'Season and grill chicken. Let rest, then slice.', 12], [2, 'Arrange greens on plates and top with beans, corn, and avocado.', 3], [3, 'Add sliced chicken on top.', 1], [4, 'Drizzle with chipotle ranch and tortilla strips.', 2]],
    10, 12, 4, 'easy', 425, 36, 32, 18, 10, 680, ['high-protein', 'gluten-free'], 'photo-1546793665-c74683f339c1'),

  r('Asian Sesame Chicken Salad', 'asian-sesame-chicken-salad',
    'Crispy wonton strips over greens with mandarin oranges and sesame ginger dressing.', 'salad',
    [['grilled chicken', 1, 'lb', 'shredded'], ['mixed greens', 6, 'cups'], ['mandarin oranges', 1, 'can', 'drained'], ['edamame', 1, 'cup'], ['wonton strips', 0.5, 'cup'], ['sesame ginger dressing', 0.5, 'cup']],
    [[1, 'Grill and shred chicken. Let cool slightly.', 12], [2, 'Toss greens with edamame and mandarin oranges.', 3], [3, 'Top with shredded chicken and wonton strips.', 2], [4, 'Drizzle with sesame ginger dressing and toss.', 1]],
    10, 12, 4, 'easy', 365, 34, 28, 14, 5, 580, ['high-protein', 'dairy-free'], 'photo-1512621776951-a57141f2eefd'),

  r('Caprese Salad', 'classic-caprese-salad',
    'Simple Italian salad with fresh mozzarella, tomatoes, and basil drizzled with balsamic.', 'salad',
    [['fresh mozzarella', 8, 'oz', 'sliced'], ['tomatoes', 4, 'whole', 'sliced'], ['fresh basil', 0.5, 'cup', 'leaves'], ['balsamic glaze', 2, 'tablespoons'], ['olive oil', 2, 'tablespoons']],
    [[1, 'Alternate slices of tomato and mozzarella on a platter.', 3], [2, 'Tuck basil leaves between slices.', 2], [3, 'Drizzle with olive oil and balsamic glaze.', 1], [4, 'Season with flaky salt and fresh-cracked pepper.', 1]],
    8, 0, 4, 'easy', 245, 14, 8, 18, 1, 320, ['vegetarian', 'gluten-free', 'low-carb', 'quick'], 'photo-1608897013039-887f21d8c804'),

  // ═══════════════════════════════════════════
  // DESSERTS (8)
  // ═══════════════════════════════════════════
  r('Protein Brownies', 'protein-brownies',
    'Fudgy brownies with 15g protein per serving, made with protein powder and black beans.', 'dessert',
    [['black beans', 1, 'can', 'drained and rinsed'], ['chocolate protein powder', 2, 'scoops'], ['cocoa powder', 0.25, 'cup'], ['eggs', 2, 'whole'], ['maple syrup', 0.25, 'cup'], ['dark chocolate chips', 0.25, 'cup']],
    [[1, 'Preheat oven to 350°F. Blend beans, eggs, syrup, cocoa until smooth.', 3], [2, 'Fold in protein powder and chocolate chips.', 2], [3, 'Pour into greased 8x8 pan. Bake 20-25 minutes.', 22], [4, 'Cool completely before cutting into 9 squares.', 10]],
    8, 25, 9, 'easy', 145, 15, 18, 4, 4, 120, ['high-protein', 'gluten-free', 'vegetarian'], 'photo-1606313564200-e75d5e30476c'),

  r('Banana Nice Cream', 'banana-nice-cream',
    'Guilt-free ice cream made with just frozen bananas — no sugar added.', 'dessert',
    [['frozen bananas', 4, 'whole', 'sliced'], ['almond milk', 2, 'tablespoons'], ['vanilla extract', 1, 'teaspoon'], ['peanut butter', 2, 'tablespoons', 'optional']],
    [[1, 'Blend frozen banana slices in a food processor until smooth.', 5], [2, 'Add almond milk and vanilla, blend until creamy.', 2], [3, 'Swirl in peanut butter if desired.', 1], [4, 'Serve immediately or freeze 30 min for firmer texture.', 1]],
    5, 0, 4, 'easy', 135, 2, 30, 3, 3, 5, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free', 'quick', 'low-calorie'], 'photo-1497034825429-c343d7c6a68f'),

  r('Baked Cinnamon Apples', 'baked-cinnamon-apples',
    'Warm baked apples with cinnamon, oats, and a drizzle of caramel.', 'dessert',
    [['apples', 4, 'whole', 'cored'], ['rolled oats', 0.5, 'cup'], ['brown sugar', 2, 'tablespoons'], ['cinnamon', 1, 'teaspoon'], ['butter', 2, 'tablespoons', 'cold, diced'], ['walnuts', 0.25, 'cup', 'chopped']],
    [[1, 'Preheat oven to 375°F. Core apples and place in baking dish.', 5], [2, 'Mix oats, sugar, cinnamon, butter, and walnuts for filling.', 3], [3, 'Stuff filling into apple centers.', 3], [4, 'Bake 30-35 minutes until apples are tender.', 32]],
    10, 35, 4, 'easy', 225, 3, 38, 8, 5, 25, ['vegetarian', 'gluten-free'], 'photo-1568702846914-96b305d2aaeb'),

  r('Dark Chocolate Mousse', 'dark-chocolate-mousse',
    'Rich and silky chocolate mousse made with avocado — secretly healthy.', 'dessert',
    [['ripe avocados', 2, 'whole'], ['cocoa powder', 0.33, 'cup'], ['maple syrup', 0.25, 'cup'], ['vanilla extract', 1, 'teaspoon'], ['almond milk', 2, 'tablespoons']],
    [[1, 'Blend avocados until perfectly smooth.', 3], [2, 'Add cocoa powder, maple syrup, vanilla, and milk. Blend until silky.', 3], [3, 'Taste and adjust sweetness.', 1], [4, 'Chill 1 hour and serve topped with berries or shaved chocolate.', 60]],
    8, 0, 4, 'easy', 215, 3, 24, 14, 8, 15, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'], 'photo-1541783245831-57d6fb0926d3'),

  r('Berry Crumble', 'mixed-berry-crumble',
    'Warm mixed berry crumble with a buttery oat topping — perfect with vanilla ice cream.', 'dessert',
    [['mixed berries', 4, 'cups', 'fresh or frozen'], ['rolled oats', 1, 'cup'], ['flour', 0.5, 'cup'], ['butter', 0.33, 'cup', 'cold, diced'], ['brown sugar', 0.33, 'cup'], ['lemon juice', 1, 'tablespoon']],
    [[1, 'Preheat oven to 375°F. Toss berries with sugar and lemon juice in a baking dish.', 3], [2, 'Mix oats, flour, brown sugar, and butter until crumbly.', 4], [3, 'Sprinkle crumble over berries.', 2], [4, 'Bake 35-40 minutes until golden and bubbly.', 38]],
    10, 40, 6, 'easy', 265, 4, 42, 10, 5, 45, ['vegetarian'], 'photo-1464305795204-6f5bbfc7fb81'),

  r('Frozen Yogurt Bark', 'frozen-yogurt-bark',
    'Colorful frozen yogurt bark with berries, granola, and drizzled chocolate.', 'dessert',
    [['Greek yogurt', 2, 'cups'], ['honey', 2, 'tablespoons'], ['mixed berries', 1, 'cup'], ['granola', 0.5, 'cup'], ['dark chocolate chips', 2, 'tablespoons']],
    [[1, 'Mix yogurt with honey and spread on a parchment-lined baking sheet.', 3], [2, 'Press berries and granola into the yogurt.', 3], [3, 'Drizzle melted chocolate over the top.', 2], [4, 'Freeze 3-4 hours until solid. Break into pieces.', 0]],
    10, 0, 8, 'easy', 115, 6, 16, 3, 1, 35, ['vegetarian', 'gluten-free', 'low-calorie', 'quick'], 'photo-1488477181946-6428a0291777'),

  r('No-Bake Energy Bites', 'no-bake-energy-bites',
    'Peanut butter oat energy bites with chocolate chips — perfect snack.', 'dessert',
    [['rolled oats', 1, 'cup'], ['peanut butter', 0.5, 'cup'], ['honey', 0.33, 'cup'], ['mini chocolate chips', 0.25, 'cup'], ['flax seeds', 2, 'tablespoons'], ['vanilla extract', 1, 'teaspoon']],
    [[1, 'Mix all ingredients in a large bowl until combined.', 3], [2, 'Refrigerate 30 minutes until firm enough to roll.', 0], [3, 'Roll into 1-inch balls (makes about 20).', 5], [4, 'Store in refrigerator for up to 1 week.', 0]],
    10, 0, 20, 'easy', 85, 3, 11, 4, 1, 30, ['vegetarian', 'quick', 'meal-prep'], 'photo-1558961363-fa8fdf82db35'),

  r('Chia Pudding Parfait', 'chia-pudding-parfait',
    'Layered chia pudding with mango puree and toasted coconut.', 'dessert',
    [['chia seeds', 0.25, 'cup'], ['coconut milk', 1, 'cup'], ['mango', 1, 'whole', 'pureed'], ['toasted coconut', 2, 'tablespoons'], ['honey', 1, 'tablespoon']],
    [[1, 'Mix chia seeds with coconut milk and honey. Refrigerate 4 hours.', 3], [2, 'Puree mango until smooth.', 2], [3, 'Layer chia pudding and mango puree in glasses.', 3], [4, 'Top with toasted coconut and serve.', 1]],
    8, 0, 4, 'easy', 195, 5, 26, 10, 8, 20, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'], 'photo-1511690743698-d9d18f7e20f1'),

  // ═══════════════════════════════════════════
  // SIDES (6)
  // ═══════════════════════════════════════════
  r('Garlic Mashed Cauliflower', 'garlic-mashed-cauliflower',
    'Low-carb mashed cauliflower that tastes like mashed potatoes with roasted garlic.', 'sides',
    [['cauliflower', 1, 'head', 'cut into florets'], ['butter', 2, 'tablespoons'], ['garlic', 4, 'cloves', 'roasted'], ['cream cheese', 2, 'oz'], ['chives', 2, 'tablespoons', 'chopped']],
    [[1, 'Steam cauliflower until very tender, 12-15 minutes.', 14], [2, 'Drain well — squeeze out excess moisture.', 2], [3, 'Blend with butter, garlic, and cream cheese until smooth.', 3], [4, 'Season with salt and pepper. Top with chives.', 1]],
    5, 16, 4, 'easy', 125, 4, 10, 8, 3, 180, ['vegetarian', 'low-carb', 'keto', 'gluten-free', 'quick', 'low-calorie'], 'photo-1607532941433-304659e8198a'),

  r('Roasted Brussels Sprouts', 'roasted-brussels-sprouts',
    'Crispy caramelized Brussels sprouts with balsamic glaze and parmesan.', 'sides',
    [['Brussels sprouts', 1.5, 'lbs', 'halved'], ['olive oil', 3, 'tablespoons'], ['balsamic vinegar', 2, 'tablespoons'], ['parmesan', 0.25, 'cup', 'grated'], ['garlic', 2, 'cloves', 'minced']],
    [[1, 'Preheat oven to 425°F. Toss sprouts with oil, garlic, salt and pepper.', 5], [2, 'Spread cut-side down on sheet pan.', 2], [3, 'Roast 25-30 minutes until crispy and caramelized.', 28], [4, 'Drizzle with balsamic and sprinkle with parmesan.', 1]],
    8, 30, 4, 'easy', 155, 7, 14, 10, 5, 220, ['vegetarian', 'gluten-free', 'low-calorie'], 'photo-1438118907704-7718ee9a191a'),

  r('Quinoa Pilaf', 'herbed-quinoa-pilaf',
    'Fluffy quinoa with herbs, toasted almonds, and dried cranberries.', 'sides',
    [['quinoa', 1.5, 'cups'], ['vegetable broth', 3, 'cups'], ['almonds', 0.33, 'cup', 'slivered, toasted'], ['dried cranberries', 0.25, 'cup'], ['fresh herbs', 0.25, 'cup', 'parsley, mint']],
    [[1, 'Rinse quinoa and toast in dry pan 2 minutes.', 3], [2, 'Add broth, bring to boil, reduce to simmer, cover 15 min.', 16], [3, 'Fluff with fork and stir in herbs and cranberries.', 2], [4, 'Top with toasted almonds and serve.', 1]],
    5, 20, 4, 'easy', 275, 10, 42, 8, 5, 380, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'], 'photo-1505253758473-96b7015fcd40'),

  r('Crispy Sweet Potato Fries', 'crispy-sweet-potato-fries',
    'Oven-baked sweet potato fries that are actually crispy, with chipotle aioli.', 'sides',
    [['sweet potatoes', 2, 'lbs', 'cut into fries'], ['cornstarch', 2, 'tablespoons'], ['olive oil', 2, 'tablespoons'], ['smoked paprika', 1, 'teaspoon'], ['garlic powder', 0.5, 'teaspoon']],
    [[1, 'Preheat oven to 425°F. Soak fries in cold water 30 min, drain, pat dry.', 32], [2, 'Toss with cornstarch, oil, and spices.', 3], [3, 'Spread on sheet pan in single layer — don\'t overcrowd.', 3], [4, 'Bake 25-30 min, flipping halfway, until crispy.', 28]],
    35, 30, 4, 'easy', 215, 3, 38, 6, 5, 65, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'], 'photo-1529692236671-f1f6cf9683ba'),

  r('Cilantro Lime Rice', 'cilantro-lime-rice',
    'Chipotle-style cilantro lime rice — fluffy and bright with fresh citrus.', 'sides',
    [['long grain rice', 2, 'cups'], ['lime juice', 3, 'tablespoons'], ['cilantro', 0.5, 'cup', 'chopped'], ['butter', 1, 'tablespoon'], ['salt', 1, 'teaspoon']],
    [[1, 'Cook rice according to package directions.', 18], [2, 'Fluff with fork and stir in butter until melted.', 2], [3, 'Add lime juice and cilantro. Toss gently.', 2], [4, 'Season with salt and serve.', 1]],
    5, 20, 6, 'easy', 215, 4, 44, 3, 1, 400, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free', 'budget-friendly', 'quick'], 'photo-1536304929831-ee1ca9d44906'),

  r('Garlic Sauteed Green Beans', 'garlic-sauteed-green-beans',
    'Tender-crisp green beans sauteed with garlic, almonds, and lemon zest.', 'sides',
    [['green beans', 1, 'lb', 'trimmed'], ['garlic', 3, 'cloves', 'sliced'], ['almonds', 0.25, 'cup', 'slivered'], ['olive oil', 2, 'tablespoons'], ['lemon zest', 1, 'teaspoon']],
    [[1, 'Blanch green beans in boiling water 2 minutes, then ice bath.', 4], [2, 'Heat oil in skillet. Toast almonds until golden.', 3], [3, 'Add garlic, cook 30 seconds. Add green beans, toss 3-4 min.', 4], [4, 'Finish with lemon zest, salt, and pepper.', 1]],
    5, 12, 4, 'easy', 125, 4, 10, 9, 4, 10, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free', 'quick', 'low-calorie'], 'photo-1506084868230-bb9d95c24759'),

  // ═══════════════════════════════════════════
  // BOWLS (6)
  // ═══════════════════════════════════════════
  r('Buddha Bowl', 'rainbow-buddha-bowl',
    'Colorful plant-based bowl with roasted sweet potato, quinoa, chickpeas, and tahini.', 'bowls',
    [['sweet potato', 1, 'whole', 'cubed'], ['quinoa', 1, 'cup', 'cooked'], ['chickpeas', 1, 'can', 'drained'], ['kale', 2, 'cups', 'massaged'], ['avocado', 1, 'whole', 'sliced'], ['tahini', 0.25, 'cup']],
    [[1, 'Roast sweet potato and chickpeas at 425°F for 25 minutes.', 28], [2, 'Massage kale with olive oil and lemon juice.', 3], [3, 'Assemble bowls with quinoa, kale, sweet potato, and chickpeas.', 3], [4, 'Top with avocado and drizzle tahini dressing.', 2]],
    10, 28, 2, 'easy', 485, 16, 62, 20, 14, 420, ['vegan', 'vegetarian', 'dairy-free', 'gluten-free', 'meal-prep'], 'photo-1512621776951-a57141f2eefd'),

  r('Poke Bowl', 'ahi-tuna-poke-bowl',
    'Hawaiian-style poke bowl with marinated ahi tuna, rice, and fresh toppings.', 'bowls',
    [['sushi-grade ahi tuna', 1, 'lb', 'cubed'], ['sushi rice', 2, 'cups', 'cooked'], ['soy sauce', 3, 'tablespoons'], ['sesame oil', 1, 'tablespoon'], ['avocado', 1, 'whole', 'sliced'], ['edamame', 0.5, 'cup']],
    [[1, 'Cube tuna and marinate in soy sauce, sesame oil, and rice vinegar.', 15], [2, 'Prepare rice and divide among bowls.', 3], [3, 'Top with marinated tuna, avocado, edamame, and cucumber.', 3], [4, 'Garnish with sesame seeds, nori, and pickled ginger.', 2]],
    20, 0, 4, 'easy', 425, 34, 42, 14, 5, 780, ['high-protein', 'dairy-free'], 'photo-1546069901-ba9599a7e63c'),

  r('Chicken Burrito Bowl', 'chicken-burrito-bowl',
    'Chipotle-style burrito bowl with grilled chicken, rice, beans, and all the toppings.', 'bowls',
    [['chicken breasts', 1.5, 'lbs', 'grilled, sliced'], ['cilantro lime rice', 2, 'cups'], ['black beans', 1, 'can', 'drained'], ['corn', 1, 'cup'], ['pico de gallo', 0.5, 'cup'], ['guacamole', 0.5, 'cup']],
    [[1, 'Season and grill chicken, then slice into strips.', 15], [2, 'Warm rice and beans separately.', 5], [3, 'Divide rice among bowls, layer beans, corn, and chicken.', 3], [4, 'Top with pico de gallo, guacamole, and sour cream.', 2]],
    15, 15, 4, 'easy', 485, 38, 52, 14, 11, 620, ['high-protein', 'gluten-free'], 'photo-1555939594-58d7cb561ad1'),

  r('Korean Bibimbap Bowl', 'korean-bibimbap-bowl',
    'Traditional Korean rice bowl with seasoned vegetables, beef, and gochujang sauce.', 'bowls',
    [['white rice', 2, 'cups', 'cooked'], ['ground beef', 0.75, 'lb'], ['spinach', 2, 'cups'], ['carrots', 1, 'cup', 'julienned'], ['bean sprouts', 1, 'cup'], ['gochujang sauce', 3, 'tablespoons']],
    [[1, 'Cook beef with soy sauce and sesame oil until browned.', 8], [2, 'Saute spinach, carrots, and bean sprouts separately.', 10], [3, 'Divide rice among bowls, arrange toppings in sections.', 3], [4, 'Top with a fried egg and drizzle gochujang sauce.', 4]],
    15, 22, 4, 'medium', 445, 28, 48, 16, 4, 720, ['high-protein', 'dairy-free'], 'photo-1553163147-622ab57be1c7'),

  r('Teriyaki Salmon Rice Bowl', 'teriyaki-salmon-rice-bowl',
    'Glazed teriyaki salmon over rice with steamed broccoli and sesame seeds.', 'bowls',
    [['salmon fillets', 4, 'pieces', '5 oz each'], ['teriyaki sauce', 0.5, 'cup'], ['white rice', 2, 'cups', 'cooked'], ['broccoli', 2, 'cups', 'steamed'], ['sesame seeds', 1, 'tablespoon']],
    [[1, 'Marinate salmon in teriyaki sauce for 15 minutes.', 15], [2, 'Pan-sear or bake salmon at 400°F for 12-15 min.', 15], [3, 'Steam broccoli until tender-crisp.', 5], [4, 'Serve salmon over rice with broccoli, drizzle teriyaki, add sesame seeds.', 2]],
    20, 15, 4, 'easy', 425, 36, 42, 12, 3, 880, ['high-protein', 'dairy-free'], 'photo-1567620832903-9fc6debc209f'),

  r('Mediterranean Falafel Bowl', 'mediterranean-falafel-bowl',
    'Crispy falafel over greens with hummus, tahini, and Mediterranean vegetables.', 'bowls',
    [['falafel', 12, 'pieces', 'prepared'], ['mixed greens', 4, 'cups'], ['hummus', 0.5, 'cup'], ['cucumber', 1, 'whole', 'diced'], ['cherry tomatoes', 1, 'cup', 'halved'], ['tahini sauce', 0.25, 'cup']],
    [[1, 'Bake or air-fry falafel until crispy, about 15 minutes.', 15], [2, 'Divide greens among bowls, add cucumber and tomatoes.', 3], [3, 'Top with warm falafel and hummus.', 2], [4, 'Drizzle tahini sauce and serve with pita.', 1]],
    10, 15, 4, 'easy', 385, 14, 42, 18, 10, 620, ['vegan', 'vegetarian', 'dairy-free', 'high-protein'], 'photo-1529042410759-befb1204b468'),

  // ═══════════════════════════════════════════
  // PASTA (7)
  // ═══════════════════════════════════════════
  r('Lemon Garlic Shrimp Pasta', 'lemon-garlic-shrimp-pasta',
    'Light pasta with succulent shrimp in a lemon garlic butter sauce.', 'pasta',
    [['linguine', 12, 'oz'], ['large shrimp', 1, 'lb', 'peeled'], ['garlic', 4, 'cloves', 'minced'], ['lemon juice', 3, 'tablespoons'], ['butter', 3, 'tablespoons'], ['parsley', 0.25, 'cup', 'chopped']],
    [[1, 'Cook pasta. Reserve 1 cup pasta water.', 10], [2, 'Saute shrimp in butter 2-3 min per side. Remove.', 6], [3, 'Add garlic, cook 1 min. Add lemon juice and pasta water.', 2], [4, 'Toss pasta with sauce and shrimp. Garnish with parsley.', 2]],
    10, 20, 4, 'easy', 425, 32, 52, 11, 3, 480, ['high-protein', 'quick'], 'photo-1563379926898-05f4575a45d8'),

  r('One-Pot Chicken Alfredo', 'one-pot-chicken-alfredo',
    'Creamy alfredo pasta with chicken, all made in one pot for easy cleanup.', 'pasta',
    [['fettuccine', 12, 'oz'], ['chicken breasts', 1, 'lb', 'diced'], ['heavy cream', 2, 'cups'], ['parmesan cheese', 1, 'cup', 'grated'], ['garlic', 3, 'cloves', 'minced'], ['chicken broth', 2, 'cups']],
    [[1, 'Cook diced chicken until golden. Remove.', 8], [2, 'Add pasta, broth, and cream. Bring to boil.', 5], [3, 'Simmer 12-15 min until pasta is tender and sauce thickens.', 15], [4, 'Stir in parmesan and chicken. Season.', 2]],
    10, 30, 6, 'easy', 525, 32, 48, 22, 2, 620, ['high-protein'], 'photo-1645112411341-6c4fd023714a'),

  r('Healthy Turkey Bolognese', 'healthy-turkey-bolognese',
    'Lighter bolognese with lean ground turkey and hidden vegetable goodness.', 'pasta',
    [['spaghetti', 12, 'oz'], ['ground turkey', 1.5, 'lbs'], ['crushed tomatoes', 1, 'can', '28 oz'], ['carrots', 2, 'whole', 'diced'], ['onion', 1, 'whole', 'diced'], ['garlic', 4, 'cloves', 'minced']],
    [[1, 'Saute onion, carrots, and garlic until softened.', 7], [2, 'Add turkey, cook until browned.', 8], [3, 'Add tomatoes and herbs. Simmer 20 minutes.', 20], [4, 'Cook pasta and toss with sauce.', 10]],
    10, 45, 6, 'easy', 385, 32, 48, 8, 5, 380, ['high-protein', 'dairy-free'], 'photo-1572453800999-e8d2d1589b7c'),

  r('Pesto Zucchini Noodles', 'pesto-zucchini-noodles',
    'Low-carb zucchini noodles tossed in fresh basil pesto with cherry tomatoes.', 'pasta',
    [['zucchini', 4, 'whole', 'spiralized'], ['basil pesto', 0.5, 'cup'], ['cherry tomatoes', 1, 'cup', 'halved'], ['parmesan', 0.25, 'cup', 'shaved'], ['pine nuts', 2, 'tablespoons', 'toasted']],
    [[1, 'Spiralize zucchini and pat dry.', 5], [2, 'Lightly saute zoodles 2-3 min until just tender.', 3], [3, 'Toss with pesto and tomatoes.', 2], [4, 'Top with parmesan and pine nuts.', 1]],
    10, 5, 4, 'easy', 185, 8, 12, 13, 3, 320, ['low-carb', 'keto', 'vegetarian', 'gluten-free', 'quick', 'low-calorie'], 'photo-1623428187969-5da2dcea5ebf'),

  r('Baked Ziti', 'classic-baked-ziti',
    'Classic baked ziti with ricotta, mozzarella, and marinara — ultimate comfort food.', 'pasta',
    [['ziti pasta', 1, 'lb'], ['marinara sauce', 4, 'cups'], ['ricotta cheese', 2, 'cups'], ['mozzarella', 2, 'cups', 'shredded'], ['parmesan', 0.5, 'cup', 'grated'], ['basil', 0.25, 'cup', 'chopped']],
    [[1, 'Cook ziti until al dente, drain.', 10], [2, 'Mix with marinara and ricotta.', 3], [3, 'Transfer to baking dish, top with mozzarella and parmesan.', 3], [4, 'Bake at 375°F for 25-30 min until bubbly. Garnish with basil.', 28]],
    15, 40, 8, 'easy', 465, 24, 52, 18, 4, 720, ['vegetarian', 'high-protein'], 'photo-1574894709920-11b28e7367e3'),

  r('Penne Arrabbiata', 'spicy-penne-arrabbiata',
    'Fiery Italian pasta with tomatoes, garlic, and red pepper flakes.', 'pasta',
    [['penne pasta', 1, 'lb'], ['crushed tomatoes', 1, 'can', '28 oz'], ['garlic', 6, 'cloves', 'minced'], ['red pepper flakes', 1, 'teaspoon'], ['olive oil', 3, 'tablespoons'], ['parsley', 0.25, 'cup']],
    [[1, 'Cook penne. Reserve pasta water.', 10], [2, 'Saute garlic and pepper flakes in olive oil 1 min.', 1], [3, 'Add tomatoes, simmer 15 minutes.', 15], [4, 'Toss pasta with sauce. Garnish with parsley.', 2]],
    5, 28, 6, 'easy', 295, 10, 52, 6, 4, 185, ['vegan', 'vegetarian', 'dairy-free', 'budget-friendly'], 'photo-1621996346565-e3dbc646d9a9'),

  r('Healthy Mac and Cheese', 'healthy-mac-and-cheese',
    'Lightened-up mac and cheese with cauliflower and Greek yogurt for hidden veggies.', 'pasta',
    [['elbow macaroni', 12, 'oz'], ['cauliflower florets', 2, 'cups'], ['cheddar cheese', 1.5, 'cups', 'shredded'], ['Greek yogurt', 0.5, 'cup'], ['milk', 1, 'cup']],
    [[1, 'Cook pasta. Steam cauliflower until very soft.', 12], [2, 'Blend cauliflower with milk and yogurt until smooth.', 3], [3, 'Combine with pasta and cheese. Stir until melted.', 3], [4, 'Season with salt, pepper, garlic powder.', 1]],
    10, 19, 6, 'easy', 315, 16, 42, 9, 3, 280, ['vegetarian', 'high-protein', 'quick'], 'photo-1476124369491-b79e5ab6e69d'),

  // ═══════════════════════════════════════════
  // TRENDING (10)
  // ═══════════════════════════════════════════
  r('Birria Tacos', 'birria-tacos',
    'Viral slow-braised beef tacos with melted cheese and consommé for dipping.', 'trending',
    [['beef chuck', 3, 'lbs', 'cubed'], ['dried chiles', 6, 'whole', 'guajillo and ancho'], ['corn tortillas', 16, 'whole'], ['oaxaca cheese', 2, 'cups', 'shredded'], ['onion', 1, 'whole', 'diced'], ['cilantro', 0.5, 'cup']],
    [[1, 'Blend rehydrated chiles with spices. Pour over beef in slow cooker.', 10], [2, 'Cook low 8 hours until beef shreds easily.', 480], [3, 'Dip tortillas in broth, fill with beef and cheese, pan-fry until crispy.', 15], [4, 'Serve with consommé for dipping.', 2]],
    20, 500, 8, 'medium', 525, 42, 28, 28, 4, 620, ['high-protein', 'gluten-free'], 'photo-1565299585323-38d6b0865b47', true),

  r('Smash Burgers', 'smash-burgers',
    'Crispy-edged smash burgers with melted cheese and special sauce.', 'trending',
    [['ground beef', 1.5, 'lbs', '80/20'], ['burger buns', 4, 'whole'], ['American cheese', 8, 'slices'], ['onion', 1, 'whole', 'thinly sliced'], ['pickles', 8, 'slices'], ['special sauce', 0.25, 'cup']],
    [[1, 'Heat cast iron skillet over high heat.', 3], [2, 'Form beef into balls. Smash flat on griddle.', 5], [3, 'Cook 2 min, flip, add cheese, cook 1 more min.', 3], [4, 'Assemble on toasted buns with sauce and pickles.', 3]],
    10, 14, 4, 'easy', 685, 38, 32, 45, 2, 920, ['high-protein', 'quick'], 'photo-1568901346375-23c9450c58cd', true),

  r('Marry Me Chicken', 'marry-me-chicken',
    'Viral creamy sun-dried tomato chicken so good it might inspire a proposal.', 'trending',
    [['chicken breasts', 4, 'pieces'], ['heavy cream', 1, 'cup'], ['sun-dried tomatoes', 0.5, 'cup', 'chopped'], ['parmesan', 0.5, 'cup', 'grated'], ['garlic', 3, 'cloves', 'minced'], ['basil', 0.25, 'cup']],
    [[1, 'Sear chicken until golden. Remove.', 8], [2, 'Saute garlic and sun-dried tomatoes.', 2], [3, 'Add cream and parmesan, simmer. Return chicken.', 8], [4, 'Simmer 10 min until done. Garnish with basil.', 10]],
    10, 28, 4, 'easy', 465, 42, 8, 30, 1, 520, ['high-protein', 'low-carb', 'gluten-free'], 'photo-1598103442097-8b74394b95c6', true),

  r('Baked Feta Pasta', 'baked-feta-pasta',
    'Viral TikTok pasta with roasted feta, burst cherry tomatoes, and basil.', 'trending',
    [['feta cheese block', 8, 'oz'], ['cherry tomatoes', 4, 'cups'], ['pasta', 12, 'oz'], ['olive oil', 0.33, 'cup'], ['garlic', 4, 'cloves'], ['basil', 0.5, 'cup', 'torn']],
    [[1, 'Preheat oven to 400°F. Place feta in center of dish, surround with tomatoes.', 3], [2, 'Drizzle with oil, add garlic, season.', 2], [3, 'Bake 30-35 min until tomatoes burst.', 35], [4, 'Cook pasta, toss with feta-tomato mixture and basil.', 12]],
    5, 47, 4, 'easy', 495, 18, 56, 22, 4, 680, ['vegetarian'], 'photo-1621996346565-e3dbc646d9a9', true),

  r('TikTok Salmon Rice Bowl', 'tiktok-salmon-rice-bowl',
    'Viral salmon bowl with soy-glazed salmon, avocado, and kimchi.', 'trending',
    [['salmon fillet', 1, 'lb', 'diced'], ['soy sauce', 2, 'tablespoons'], ['sriracha', 1, 'tablespoon'], ['sushi rice', 2, 'cups', 'cooked'], ['avocado', 1, 'whole', 'diced'], ['kimchi', 0.5, 'cup']],
    [[1, 'Marinate diced salmon in soy sauce, sriracha, sesame oil.', 10], [2, 'Cook salmon in hot pan 3-4 minutes.', 4], [3, 'Divide rice among bowls, top with salmon.', 2], [4, 'Add avocado, kimchi, seaweed, sesame seeds.', 2]],
    15, 4, 4, 'easy', 425, 28, 42, 16, 4, 780, ['high-protein', 'dairy-free', 'quick'], 'photo-1546069901-ba9599a7e63c', true),

  r('Cloud Bread', 'cloud-bread',
    'Light and fluffy TikTok cloud bread made with just 3 ingredients.', 'trending',
    [['eggs', 3, 'whole', 'separated'], ['cream cheese', 3, 'tablespoons', 'softened'], ['cream of tartar', 0.25, 'teaspoon'], ['vanilla extract', 0.5, 'teaspoon']],
    [[1, 'Preheat 300°F. Beat whites with cream of tartar to stiff peaks.', 5], [2, 'Mix yolks with cream cheese and vanilla.', 2], [3, 'Fold whites into yolk mixture.', 2], [4, 'Scoop onto sheet pan. Bake 25-30 min.', 28]],
    10, 30, 6, 'easy', 65, 4, 1, 5, 0, 65, ['low-carb', 'keto', 'vegetarian', 'gluten-free', 'low-calorie'], 'photo-1509440159596-0249088772ff'),

  r('Protein Ice Cream', 'protein-ice-cream',
    'High-volume, low-calorie ice cream made with protein powder in a blender.', 'trending',
    [['vanilla protein powder', 1, 'scoop'], ['almond milk', 0.5, 'cup'], ['ice cubes', 2, 'cups'], ['xanthan gum', 0.25, 'teaspoon'], ['vanilla extract', 1, 'teaspoon']],
    [[1, 'Add all ingredients to a high-speed blender.', 1], [2, 'Blend on high 3-5 min until thick like soft-serve.', 5], [3, 'Scrape down sides and blend again.', 2], [4, 'Serve immediately or freeze 30 min for firmer texture.', 1]],
    5, 0, 1, 'easy', 125, 24, 6, 2, 1, 180, ['high-protein', 'low-carb', 'gluten-free', 'quick', 'low-calorie'], 'photo-1497034825429-c343d7c6a68f'),

  r('Cottage Cheese Flatbread', 'cottage-cheese-flatbread',
    'Viral high-protein flatbread made with cottage cheese and eggs.', 'trending',
    [['cottage cheese', 1, 'cup'], ['eggs', 2, 'whole'], ['garlic powder', 1, 'teaspoon'], ['Italian seasoning', 1, 'teaspoon'], ['mozzarella', 0.25, 'cup', 'shredded']],
    [[1, 'Preheat 350°F. Blend cottage cheese and eggs until smooth.', 3], [2, 'Stir in seasonings.', 1], [3, 'Pour onto parchment-lined sheet pan, spread into circle.', 2], [4, 'Bake 30-35 min until golden and set. Use as pizza base.', 33]],
    5, 35, 2, 'easy', 185, 20, 5, 9, 0, 480, ['high-protein', 'low-carb', 'keto', 'vegetarian', 'gluten-free'], 'photo-1513104890138-7c749659a591'),

  r('Everything Bagel Chicken', 'everything-bagel-chicken',
    'Crispy baked chicken coated with trendy everything bagel seasoning.', 'trending',
    [['chicken breasts', 4, 'pieces'], ['everything bagel seasoning', 3, 'tablespoons'], ['olive oil', 2, 'tablespoons'], ['Greek yogurt', 0.25, 'cup'], ['lemon juice', 1, 'tablespoon']],
    [[1, 'Preheat 425°F. Mix yogurt with lemon juice.', 3], [2, 'Coat chicken with yogurt, press seasoning onto all sides.', 5], [3, 'Place on sheet pan, drizzle with oil.', 2], [4, 'Bake 22-25 min until 165°F internal.', 24]],
    10, 25, 4, 'easy', 285, 42, 3, 11, 1, 580, ['high-protein', 'low-carb', 'gluten-free', 'quick'], 'photo-1532550907401-a500c9a57435'),

  r('Butter Board', 'butter-board',
    'Trendy spreadable herb butter board for sharing with crusty bread.', 'trending',
    [['softened butter', 1, 'cup'], ['fresh herbs', 0.5, 'cup', 'parsley, chives, thyme'], ['flaky sea salt', 1, 'teaspoon'], ['honey', 2, 'tablespoons'], ['crusty bread', 1, 'loaf', 'sliced']],
    [[1, 'Spread softened butter on a wooden board.', 3], [2, 'Drizzle with honey, add herbs and salt.', 2], [3, 'Add extras: garlic, lemon zest, pepper flakes.', 2], [4, 'Serve with warm crusty bread.', 1]],
    10, 0, 8, 'easy', 285, 5, 28, 17, 1, 420, ['vegetarian', 'quick'], 'photo-1509440159596-0249088772ff'),
];
