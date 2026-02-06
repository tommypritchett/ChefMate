const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fast food menu prices (2024-2025 estimates in USD)
const FAST_FOOD_PRICES = {
  "McDonald's": {
    "Egg McMuffin": 5.49,
    "Big Mac": 6.99,
    "Quarter Pounder": 7.49,
    "McChicken": 2.99,
    "Bacon Egg & Cheese Biscuit": 4.99,
    "Sausage McMuffin": 4.99,
    "Chicken McNuggets": 5.99, // 10 piece
    "Mac & Cheese": 4.99,
    "Filet-O-Fish": 5.99,
    "McDouble": 3.99
  },
  "Taco Bell": {
    "Crunchwrap Supreme": 6.99,
    "Quesarito": 5.99,
    "Steak Grilled Cheese Burrito": 7.99,
    "Mexican Pizza": 5.99,
    "Chalupa": 4.99,
    "Burrito Supreme": 5.49,
    "Quesadilla": 4.99,
    "Nacho Fries": 3.99,
    "Soft Taco": 2.49,
    "Hard Taco": 2.29
  },
  "In-N-Out": {
    "Double-Double": 4.99,
    "Double-Double Protein Style": 4.99,
    "Cheeseburger": 3.99,
    "Hamburger": 3.49,
    "Animal Style Burger": 5.49,
    "Fries": 2.99
  },
  "Burger King": {
    "Whopper": 7.99,
    "Big King": 6.99,
    "Chicken Sandwich": 6.49,
    "Bacon King": 8.99,
    "Double Whopper": 9.49,
    "Fish Sandwich": 5.99,
    "Chicken Nuggets": 4.99
  },
  "Wendy's": {
    "Baconator": 8.99,
    "Dave's Single": 6.99,
    "Spicy Chicken": 6.49,
    "Junior Bacon Cheeseburger": 3.99,
    "Frosty": 2.99,
    "Chicken Nuggets": 5.99,
    "Chili": 4.49
  },
  "KFC": {
    "Original Recipe": 7.99, // 2 piece
    "Chicken Sandwich": 6.99,
    "Popcorn Chicken": 5.99,
    "Famous Bowl": 6.49,
    "Biscuit": 1.99,
    "Mac & Cheese": 4.99
  },
  "Pizza Hut": {
    "Pepperoni Pizza": 12.99, // Medium
    "Supreme Pizza": 15.99,
    "Meat Lovers": 16.99,
    "Cheese Pizza": 10.99,
    "Personal Pan Pizza": 6.99
  },
  "Subway": {
    "Italian BMT": 8.49, // 6 inch
    "Turkey Breast": 7.99,
    "Veggie Delite": 5.99,
    "Meatball Marinara": 6.99,
    "Chicken Teriyaki": 8.99,
    "Tuna": 7.49
  },
  "Chipotle": {
    "Chicken Bowl": 8.99,
    "Steak Bowl": 10.99,
    "Burrito": 9.49,
    "Quesadilla": 9.99,
    "Tacos": 8.49, // 3 tacos
    "Salad": 8.99
  },
  "Chick-fil-A": {
    "Chicken Sandwich": 5.99,
    "Spicy Chicken": 6.49,
    "Nuggets": 7.49, // 8 count
    "Mac & Cheese": 4.99,
    "Chicken Biscuit": 4.99,
    "Grilled Chicken": 6.99
  },
  "Sweetgreen": {
    "Harvest Bowl": 12.99,
    "Kale Caesar": 11.99,
    "Fish Taco": 13.99,
    "Shroomami": 11.99
  },
  "Starbucks": {
    "Spinach Feta Wrap": 5.99,
    "Egg Bites": 5.95, // 2 pack
    "Protein Box": 7.95,
    "Sandwich": 6.95
  },
  "Panera": {
    "Sandwich": 9.99,
    "Bowl": 10.99,
    "Soup": 7.99,
    "Salad": 11.99
  }
};

// Grocery ingredient costs per unit (2024 US averages)
const INGREDIENT_COSTS = {
  // Proteins
  "ground beef": { costPerLb: 5.99, unit: "lb" },
  "extra lean ground beef": { costPerLb: 7.49, unit: "lb" },
  "ground turkey": { costPerLb: 6.99, unit: "lb" },
  "chicken breast": { costPerLb: 4.99, unit: "lb" },
  "sirloin steak": { costPerLb: 12.99, unit: "lb" },
  "bacon": { costPerLb: 8.99, unit: "lb" },
  "thick-cut bacon": { costPerLb: 9.99, unit: "lb" },
  "eggs": { costPer: 3.49, perCount: 12, unit: "each" },
  "egg": { costPer: 0.29, perCount: 1, unit: "each" },
  
  // Dairy
  "cheddar cheese": { costPer: 4.99, perCount: 8, unit: "oz" },
  "shredded cheddar": { costPer: 4.99, perCount: 8, unit: "oz" },
  "reduced-fat cheddar cheese": { costPer: 5.49, perCount: 8, unit: "oz" },
  "american cheese": { costPer: 4.99, perCount: 16, unit: "slice" },
  "mozzarella cheese": { costPer: 4.99, perCount: 8, unit: "oz" },
  "pepper jack cheese": { costPer: 5.49, perCount: 8, unit: "oz" },
  "parmesan cheese": { costPer: 6.99, perCount: 8, unit: "oz" },
  "milk": { costPer: 3.99, perCount: 1, unit: "gallon" },
  "butter": { costPer: 4.99, perCount: 1, unit: "lb" },
  "sour cream": { costPer: 2.99, perCount: 16, unit: "oz" },
  "cream cheese": { costPer: 2.99, perCount: 8, unit: "oz" },
  
  // Grains & Bread
  "bread": { costPer: 2.99, perCount: 20, unit: "slice" },
  "whole wheat bread": { costPer: 3.49, perCount: 20, unit: "slice" },
  "hamburger buns": { costPer: 2.99, perCount: 8, unit: "bun" },
  "flour tortillas": { costPer: 3.99, perCount: 10, unit: "tortilla" },
  "large flour tortillas": { costPer: 4.49, perCount: 8, unit: "tortilla" },
  "whole wheat large tortillas": { costPer: 4.99, perCount: 8, unit: "tortilla" },
  "rice": { costPerLb: 1.99, unit: "cup" }, // ~0.2 lb per cup cooked
  "brown rice": { costPerLb: 2.49, unit: "cup" },
  "quinoa": { costPerLb: 5.99, unit: "cup" },
  
  // Vegetables
  "lettuce": { costPer: 2.49, perCount: 1, unit: "head" },
  "iceberg lettuce": { costPer: 1.99, perCount: 1, unit: "head" },
  "butter lettuce": { costPer: 2.99, perCount: 1, unit: "head" },
  "shredded lettuce": { costPer: 2.99, perCount: 16, unit: "oz" },
  "tomato": { costPerLb: 2.99, unit: "each" }, // ~0.5 lb each
  "onion": { costPerLb: 1.49, unit: "each" }, // ~0.5 lb each
  "bell pepper": { costPer: 1.99, perCount: 1, unit: "each" },
  "mushrooms": { costPer: 2.99, perCount: 8, unit: "oz" },
  "cauliflower": { costPer: 3.99, perCount: 1, unit: "head" },
  "spinach": { costPer: 3.99, perCount: 5, unit: "oz" },
  "avocado": { costPer: 1.99, perCount: 1, unit: "each" },
  "cilantro": { costPer: 1.99, perCount: 1, unit: "bunch" },
  "garlic": { costPer: 1.99, perCount: 1, unit: "bulb" }, // ~10 cloves per bulb
  
  // Pantry staples
  "black beans": { costPer: 1.49, perCount: 1, unit: "can" },
  "olive oil": { costPer: 7.99, perCount: 16, unit: "oz" },
  "salt": { costPer: 0.99, perCount: 1, unit: "container" },
  "pepper": { costPer: 2.99, perCount: 1, unit: "container" },
  "paprika": { costPer: 2.99, perCount: 1, unit: "container" },
  "cumin": { costPer: 2.99, perCount: 1, unit: "container" },
  "garlic powder": { costPer: 2.99, perCount: 1, unit: "container" },
  "italian seasoning": { costPer: 2.99, perCount: 1, unit: "container" },
  "taco seasoning": { costPer: 1.49, perCount: 1, unit: "packet" },
  
  // Condiments
  "mayonnaise": { costPer: 3.99, perCount: 30, unit: "oz" },
  "ketchup": { costPer: 2.99, perCount: 20, unit: "oz" },
  "mustard": { costPer: 2.49, perCount: 8, unit: "oz" },
  "yellow mustard": { costPer: 2.49, perCount: 8, unit: "oz" },
  "thousand island dressing": { costPer: 3.49, perCount: 16, unit: "oz" },
  "ranch dressing": { costPer: 3.49, perCount: 16, unit: "oz" },
  "salsa": { costPer: 3.99, perCount: 16, unit: "oz" },
  "pizza sauce": { costPer: 1.99, perCount: 14, unit: "oz" },
  "nacho cheese sauce": { costPer: 4.99, perCount: 15, unit: "oz" },
  "pickles": { costPer: 2.99, perCount: 24, unit: "slice" },
  
  // Specialty
  "tostada shells": { costPer: 3.49, perCount: 10, unit: "shell" },
  "pepperoni": { costPer: 4.99, perCount: 4, unit: "oz" },
  "chipotle peppers in adobo": { costPer: 2.99, perCount: 1, unit: "can" },
  "lime juice": { costPer: 2.99, perCount: 8, unit: "oz" }
};

// Helper function to calculate ingredient cost per serving
function calculateIngredientCost(ingredient, servings) {
  const name = ingredient.name.toLowerCase().trim();
  const amount = parseFloat(ingredient.amount);
  const unit = ingredient.unit.toLowerCase();
  
  // Find matching ingredient in cost database
  let costData = INGREDIENT_COSTS[name];
  
  // Try variations if exact match not found
  if (!costData) {
    // Try without modifiers
    const baseName = name.replace(/(fresh|frozen|organic|lean|reduced-fat|low-fat|extra|thick-cut|shredded|diced|minced|chopped)/g, '').trim();
    costData = INGREDIENT_COSTS[baseName];
  }
  
  if (!costData) {
    console.log(`Warning: No cost data found for ingredient: ${name}`);
    return { costPerServing: 0.50, breakdown: `${name}: $0.50 (estimated)` };
  }
  
  let totalCost = 0;
  let packageInfo = '';
  
  if (costData.costPerLb && (unit.includes('lb') || unit.includes('pound'))) {
    totalCost = amount * costData.costPerLb;
    packageInfo = `buy ${Math.ceil(amount)} lb for $${(Math.ceil(amount) * costData.costPerLb).toFixed(2)}`;
  } else if (costData.costPer && costData.perCount) {
    const unitsNeeded = amount;
    const packagesNeeded = Math.ceil(unitsNeeded / costData.perCount);
    totalCost = (unitsNeeded / costData.perCount) * costData.costPer;
    const packageCost = packagesNeeded * costData.costPer;
    const leftover = (packagesNeeded * costData.perCount) - unitsNeeded;
    packageInfo = `buy ${packagesNeeded} package(s) for $${packageCost.toFixed(2)}`;
    if (leftover > 0) {
      packageInfo += `, ${leftover} ${unit} leftover`;
    }
  } else {
    // Fallback for complex units
    totalCost = amount * 0.25; // Rough estimate
    packageInfo = `${amount} ${unit} (estimated)`;
  }
  
  const costPerServing = totalCost / servings;
  
  return {
    costPerServing,
    breakdown: `${ingredient.name}: $${costPerServing.toFixed(2)}/serving (${packageInfo})`
  };
}

// Main function to calculate and update all recipe costs
async function calculateAndUpdateCosts() {
  try {
    const recipes = await prisma.recipe.findMany({
      select: { 
        id: true, 
        title: true, 
        brand: true, 
        originalItemName: true, 
        servings: true, 
        ingredients: true 
      }
    });

    for (const recipe of recipes) {
      console.log(`\\n=== Processing: ${recipe.title} ===`);
      
      // Parse ingredients
      const ingredients = JSON.parse(recipe.ingredients);
      
      // Calculate ingredient costs
      let totalCostPerServing = 0;
      const costBreakdown = [];
      
      for (const ingredient of ingredients) {
        const cost = calculateIngredientCost(ingredient, recipe.servings);
        totalCostPerServing += cost.costPerServing;
        costBreakdown.push(cost.breakdown);
      }
      
      // Get fast food price
      const brand = recipe.brand;
      const originalItem = recipe.originalItemName;
      let originalPrice = null;
      
      if (brand && originalItem && FAST_FOOD_PRICES[brand] && FAST_FOOD_PRICES[brand][originalItem]) {
        originalPrice = FAST_FOOD_PRICES[brand][originalItem];
      } else {
        // Try to find a close match
        if (brand && FAST_FOOD_PRICES[brand]) {
          const brandPrices = FAST_FOOD_PRICES[brand];
          const keys = Object.keys(brandPrices);
          const match = keys.find(key => 
            key.toLowerCase().includes(originalItem?.toLowerCase().split(' ')[0] || '') ||
            originalItem?.toLowerCase().includes(key.toLowerCase().split(' ')[0] || '')
          );
          if (match) {
            originalPrice = brandPrices[match];
          }
        }
      }
      
      // Fallback pricing based on brand
      if (!originalPrice && brand) {
        const fallbackPrices = {
          "McDonald's": 5.99,
          "Taco Bell": 6.49,
          "Burger King": 7.49,
          "In-N-Out": 4.99,
          "Wendy's": 7.99,
          "KFC": 7.49,
          "Pizza Hut": 11.99,
          "Subway": 7.99,
          "Chipotle": 9.49,
          "Chick-fil-A": 6.49,
          "Sweetgreen": 12.49,
          "Starbucks": 6.49,
          "Panera": 10.99
        };
        originalPrice = fallbackPrices[brand] || 8.99;
      }
      
      // Calculate savings
      const costSavingsPercent = originalPrice ? 
        Math.round(((originalPrice - totalCostPerServing) / originalPrice) * 100) : null;
      
      // Prepare ingredient costs JSON
      const ingredientCostsJson = {
        breakdown: costBreakdown,
        totalPerServing: parseFloat(totalCostPerServing.toFixed(2)),
        calculatedAt: new Date().toISOString()
      };
      
      // Update database
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          estimatedCostPerServing: parseFloat(totalCostPerServing.toFixed(2)),
          originalPrice: originalPrice,
          costSavingsPercent: costSavingsPercent,
          ingredientCosts: JSON.stringify(ingredientCostsJson)
        }
      });
      
      console.log(`✓ Home cost: $${totalCostPerServing.toFixed(2)}/serving`);
      console.log(`✓ Fast food: $${originalPrice?.toFixed(2) || 'N/A'}`);
      console.log(`✓ Savings: ${costSavingsPercent || 'N/A'}%`);
    }
    
    console.log('\\n🎉 All recipes updated with cost data!');
    
  } catch (error) {
    console.error('Error calculating costs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the calculator
calculateAndUpdateCosts();