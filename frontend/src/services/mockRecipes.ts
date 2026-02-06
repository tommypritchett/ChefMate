// Mock recipes for testing without using AI tokens
export const mockRecipes = [
  {
    title: "Protein-Packed Greek Yogurt Big Mac",
    description: "A revolutionary take on McDonald's classic using 93% lean ground beef, Greek yogurt-based special sauce, and whole grain buns for a healthier, protein-rich burger experience.",
    brand: "McDonald's",
    originalItem: "Big Mac", 
    prepTime: 15,
    cookTime: 20,
    servings: 2,
    difficulty: "medium" as const,
    ingredients: [
      { name: "93% lean ground beef", amount: 0.75, unit: "lb", notes: "extra lean for less fat", isOptional: false },
      { name: "Greek yogurt (plain, non-fat)", amount: 0.5, unit: "cup", notes: "for special sauce base", isOptional: false },
      { name: "Whole grain burger buns", amount: 2, unit: "pieces", notes: "toasted", isOptional: false },
      { name: "Romaine lettuce", amount: 2, unit: "cups", notes: "shredded", isOptional: false },
      { name: "Tomatoes", amount: 2, unit: "medium", notes: "sliced", isOptional: false },
      { name: "Red onion", amount: 0.25, unit: "cup", notes: "thinly sliced", isOptional: false },
      { name: "Reduced-fat cheddar", amount: 2, unit: "slices", notes: "part-skim", isOptional: false },
      { name: "Dill pickles", amount: 8, unit: "slices", notes: "low sodium", isOptional: false },
      { name: "Dijon mustard", amount: 1, unit: "tbsp", notes: "for sauce", isOptional: false },
      { name: "Apple cider vinegar", amount: 1, unit: "tsp", notes: "for tang", isOptional: false },
      { name: "Garlic powder", amount: 0.5, unit: "tsp", notes: "for flavor", isOptional: false },
      { name: "Smoked paprika", amount: 0.25, unit: "tsp", notes: "for depth", isOptional: false }
    ],
    instructions: [
      {
        step: 1,
        text: "Prepare the Greek yogurt special sauce by combining Greek yogurt, Dijon mustard, apple cider vinegar, garlic powder, and smoked paprika in a bowl. Mix thoroughly and refrigerate while preparing other ingredients.",
        time: 5,
        tips: "Let the sauce chill for at least 10 minutes to allow flavors to meld together. This creates a tangy, creamy base that mimics the original Big Mac sauce."
      },
      {
        step: 2, 
        text: "Season the 93% lean ground beef with salt and black pepper. Form into 4 thin patties (about 3oz each) - they should be slightly larger than the bun as they'll shrink during cooking.",
        time: 5,
        tips: "Making thinner patties ensures even cooking and mimics the original Big Mac's thin patty style. Press a slight indentation in the center to prevent bulging."
      },
      {
        step: 3,
        text: "Heat a large non-stick skillet or grill pan over medium-high heat. Cook the beef patties for 2-3 minutes per side until well-browned and cooked through (internal temperature 160°F).",
        time: 8,
        tips: "Don't press down on the patties while cooking as this releases juices. The lean beef cooks faster than regular ground beef, so watch carefully to prevent overcooking."
      },
      {
        step: 4,
        text: "Toast the whole grain buns in a toaster or dry skillet until golden brown. This adds texture and helps prevent the bun from getting soggy from the sauce.",
        time: 2,
        tips: "Toasting is crucial for structural integrity and adds a pleasant crunch that contrasts with the soft fillings."
      },
      {
        step: 5,
        text: "Assemble the burgers: Spread Greek yogurt sauce on both bun halves, layer with lettuce, tomato, onion, beef patty, cheese, pickles, and top bun. Serve immediately.",
        time: 5,
        tips: "Layer strategically - wet ingredients (tomato) go between dry ones (lettuce, cheese) to prevent soggy buns. Press gently to help everything stay together."
      }
    ],
    nutrition: {
      calories: 425,
      protein: 38,
      carbs: 28,
      fat: 18,
      fiber: 6,
      sodium: 580,
      sugar: 8
    },
    originalNutrition: {
      calories: 650,
      protein: 25,
      carbs: 45,
      fat: 42,
      fiber: 2,
      sodium: 1200,
      sugar: 15
    },
    dietaryTags: ["high-protein", "whole-grain", "low-sodium", "greek-yogurt-substitute"],
    tips: [
      "Greek yogurt provides probiotics and significantly more protein than traditional mayo-based sauces",
      "Using 93% lean beef cuts fat by 60% while maintaining flavor and juiciness",
      "Whole grain buns add fiber and B-vitamins not found in refined white buns"
    ],
    substitutions: [
      {
        ingredient: "93% lean ground beef",
        alternatives: ["Ground turkey (93% lean)", "Plant-based ground meat", "Lentil and mushroom patties", "Ground chicken breast"]
      },
      {
        ingredient: "Greek yogurt",
        alternatives: ["Cottage cheese (blended)", "Cashew cream", "Avocado mash", "Low-fat mayo"]
      },
      {
        ingredient: "Whole grain buns",
        alternatives: ["Ezekiel bread", "Portobello mushroom caps", "Large lettuce leaves", "Sweet potato rounds"]
      }
    ]
  },
  {
    title: "Crispy Greek Yogurt Herb-Crusted Chicken",
    description: "KFC's famous fried chicken reimagined with Greek yogurt marinade and a crispy herb coating, baked instead of fried for 70% less fat while maintaining incredible flavor and crunch.",
    brand: "KFC",
    originalItem: "Original Recipe Chicken",
    prepTime: 20,
    cookTime: 35,
    servings: 4,
    difficulty: "medium" as const,
    ingredients: [
      { name: "Chicken thighs (skin removed)", amount: 2, unit: "lbs", notes: "bone-in for flavor", isOptional: false },
      { name: "Greek yogurt (plain)", amount: 1, unit: "cup", notes: "for tenderizing marinade", isOptional: false },
      { name: "Whole wheat panko breadcrumbs", amount: 1.5, unit: "cups", notes: "for crunch", isOptional: false },
      { name: "Almond flour", amount: 0.5, unit: "cup", notes: "extra protein", isOptional: false },
      { name: "Smoked paprika", amount: 2, unit: "tsp", notes: "signature flavor", isOptional: false },
      { name: "Garlic powder", amount: 1, unit: "tsp", notes: "aromatic base", isOptional: false },
      { name: "Onion powder", amount: 1, unit: "tsp", notes: "depth of flavor", isOptional: false },
      { name: "Dried thyme", amount: 1, unit: "tsp", notes: "herb blend", isOptional: false },
      { name: "Dried oregano", amount: 1, unit: "tsp", notes: "Mediterranean touch", isOptional: false },
      { name: "Black pepper", amount: 0.5, unit: "tsp", notes: "freshly ground", isOptional: false },
      { name: "Sea salt", amount: 1, unit: "tsp", notes: "reduced sodium", isOptional: false },
      { name: "Olive oil spray", amount: 2, unit: "tbsp", notes: "for browning", isOptional: false }
    ],
    instructions: [
      {
        step: 1,
        text: "Marinate the skinless chicken thighs in Greek yogurt mixed with half the salt, pepper, and garlic powder for at least 2 hours or overnight. The yogurt's acids break down tough fibers while adding protein.",
        time: 10,
        tips: "Greek yogurt marinade creates incredibly tender meat and adds 15g protein per serving. The longer you marinate, the more tender and flavorful the chicken becomes."
      },
      {
        step: 2,
        text: "Preheat oven to 425°F. Line a baking sheet with parchment paper and place a wire rack on top for even air circulation around the chicken.",
        time: 5,
        tips: "The wire rack is crucial for achieving crispy coating all around - it prevents the bottom from steaming and getting soggy."
      },
      {
        step: 3,
        text: "Create the herb coating by combining panko breadcrumbs, almond flour, and all remaining spices in a large bowl. Mix thoroughly to distribute seasonings evenly.",
        time: 5,
        tips: "Almond flour adds protein and healthy fats while helping create an extra crispy texture. Toast the panko briefly in a dry pan for even more crunch."
      },
      {
        step: 4,
        text: "Remove chicken from marinade and coat each piece thoroughly in the herb mixture, pressing gently to help coating adhere. Place on prepared wire rack.",
        time: 8,
        tips: "Don't shake off excess marinade - it helps the coating stick and keeps the chicken moist during baking. Press coating firmly for maximum adherence."
      },
      {
        step: 5,
        text: "Lightly spray coated chicken with olive oil spray and bake for 35-40 minutes until internal temperature reaches 165°F and coating is golden brown and crispy.",
        time: 35,
        tips: "The oil spray is essential for browning and crisping. Check temperature with a meat thermometer at the thickest part, avoiding bone contact."
      }
    ],
    nutrition: {
      calories: 340,
      protein: 42,
      carbs: 12,
      fat: 14,
      fiber: 3,
      sodium: 520,
      sugar: 3
    },
    originalNutrition: {
      calories: 520,
      protein: 29,
      carbs: 16,
      fat: 35,
      fiber: 1,
      sodium: 890,
      sugar: 0
    },
    dietaryTags: ["high-protein", "baked-not-fried", "gluten-free-option", "greek-yogurt-marinade"],
    tips: [
      "Greek yogurt marinade acts as a natural meat tenderizer and adds 45% more protein than traditional buttermilk",
      "Removing skin reduces calories by 120 per serving while the herb coating maintains flavor impact",
      "Almond flour coating provides healthy fats and extra protein compared to traditional flour"
    ]
  }
];

export const generateMockRecipe = (prompt: string) => {
  const promptLower = prompt.toLowerCase();
  
  // Check for specific fast food matches
  if (promptLower.includes('big mac') || promptLower.includes('mcdonald')) {
    return mockRecipes[0];
  } else if (promptLower.includes('kfc') || promptLower.includes('chicken') || promptLower.includes('fried')) {
    return mockRecipes[1];
  } else {
    // Create a more customized recipe based on the prompt
    const baseRecipe = { ...mockRecipes[0] };
    
    // Extract key terms from prompt to customize the recipe
    if (promptLower.includes('pizza')) {
      baseRecipe.title = `Protein-Loaded Cauliflower Crust ${prompt}`;
      baseRecipe.description = `A healthier take on ${prompt} using cauliflower crust, lean proteins, and Greek yogurt-based sauce for a guilt-free pizza experience.`;
      baseRecipe.brand = "Pizza Hut";
      baseRecipe.originalItem = prompt;
    } else if (promptLower.includes('taco') || promptLower.includes('burrito')) {
      baseRecipe.title = `Greek Yogurt ${prompt} Bowl`;
      baseRecipe.description = `Transform ${prompt} into a protein-packed bowl with Greek yogurt crema, lean ground turkey, and fresh vegetables.`;
      baseRecipe.brand = "Taco Bell";
      baseRecipe.originalItem = prompt;
    } else if (promptLower.includes('sandwich') || promptLower.includes('sub')) {
      baseRecipe.title = `Whole Grain ${prompt}`;
      baseRecipe.description = `Elevated ${prompt} with lean proteins, whole grain bread, and Greek yogurt-based spreads for maximum nutrition.`;
      baseRecipe.brand = "Subway";
      baseRecipe.originalItem = prompt;
    } else if (promptLower.includes('pasta')) {
      baseRecipe.title = `Protein Pasta ${prompt}`;
      baseRecipe.description = `High-protein version of ${prompt} using chickpea pasta and Greek yogurt alfredo for better nutrition.`;
      baseRecipe.brand = "Olive Garden";
      baseRecipe.originalItem = prompt;
    } else {
      // Generic healthy version
      baseRecipe.title = `Healthy ${prompt}`;
      baseRecipe.description = `A nutritious remake of ${prompt} featuring Greek yogurt, lean proteins, and whole grain ingredients for better health without sacrificing taste.`;
      baseRecipe.originalItem = prompt;
    }
    
    return baseRecipe;
  }
};