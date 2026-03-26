import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function nut(p: number, c: number, f: number, fiber: number, sodium: number) {
  return JSON.stringify({ calories: p * 4 + c * 4 + f * 9, protein: p, carbs: c, fat: f, fiber, sodium });
}

function ing(...items: [string, string, string, string?][]) {
  return JSON.stringify(items.map(([name, amount, unit, notes]) => ({ name, amount, unit, notes: notes || null })));
}

function ins(...steps: [number, string, number?][]) {
  return JSON.stringify(steps.map(([step_number, text, time_minutes]) => ({ step_number, text, time_minutes: time_minutes || 0 })));
}

function tags(...t: string[]) { return JSON.stringify(t); }

function r(
  title: string, desc: string, category: string, proteinType: string, difficulty: string,
  servings: number, prep: number, cook: number,
  protein: number, carbs: number, fat: number, fiber: number, sodium: number,
  ingredients: string, instructions: string, dietaryTags: string,
  opts?: { brand?: string; originalItemName?: string; cuisineStyle?: string; cookingMethod?: string }
) {
  return {
    id: randomUUID(), title, slug: slug(title), description: desc,
    brand: opts?.brand || null, category, originalItemName: opts?.originalItemName || null,
    ingredients, instructions,
    prepTimeMinutes: prep, cookTimeMinutes: cook, totalTimeMinutes: prep + cook,
    servings, difficulty,
    nutrition: nut(protein, carbs, fat, fiber, sodium),
    dietaryTags, proteinType,
    cuisineStyle: opts?.cuisineStyle || null,
    cookingMethod: opts?.cookingMethod || null,
    imageUrl: `https://picsum.photos/seed/${slug(title)}/400/300`,
    isPublished: true,
  };
}

const recipes = [
  // ===== SEAFOOD (15) =====
  r("Garlic Butter Salmon", "Pan-seared salmon with garlic butter and lemon", "seafood", "fish", "easy",
    2, 5, 12, 42, 2, 18, 0, 380,
    ing(["salmon fillets", "2", "6oz"], ["butter", "2", "tbsp"], ["garlic", "4", "cloves", "minced"], ["lemon", "1", "whole", "juiced"], ["fresh dill", "2", "tbsp", "chopped"]),
    ins([1, "Pat salmon dry, season with salt and pepper", 2], [2, "Melt butter in skillet over medium-high heat", 1], [3, "Sear salmon skin-side up 4 min, flip and cook 4 min", 8], [4, "Add garlic, cook 1 min, spoon butter over fish", 1]),
    tags("high-protein", "low-carb", "keto"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Honey Glazed Teriyaki Salmon", "Oven-baked salmon with a sweet teriyaki glaze", "seafood", "fish", "easy",
    2, 10, 15, 40, 18, 12, 1, 520,
    ing(["salmon fillets", "2", "6oz"], ["soy sauce", "3", "tbsp"], ["honey", "2", "tbsp"], ["rice vinegar", "1", "tbsp"], ["sesame oil", "1", "tsp"], ["ginger", "1", "tsp", "grated"], ["garlic", "2", "cloves", "minced"]),
    ins([1, "Whisk soy sauce, honey, vinegar, sesame oil, ginger, and garlic", 3], [2, "Place salmon on lined baking sheet, pour glaze over", 2], [3, "Bake at 400°F for 12-15 min until flaky", 15]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "oven" }),

  r("Blackened Cajun Shrimp", "Spicy Cajun-seasoned shrimp seared in a cast iron skillet", "seafood", "shrimp", "easy",
    4, 10, 6, 32, 4, 8, 1, 680,
    ing(["large shrimp", "1.5", "lb", "peeled and deveined"], ["cajun seasoning", "2", "tbsp"], ["olive oil", "2", "tbsp"], ["butter", "1", "tbsp"], ["lemon", "1", "whole", "wedged"], ["parsley", "2", "tbsp", "chopped"]),
    ins([1, "Toss shrimp with cajun seasoning", 3], [2, "Heat oil in cast iron over high heat", 1], [3, "Sear shrimp 2 min per side until charred", 4], [4, "Add butter, toss, serve with lemon", 1]),
    tags("high-protein", "low-carb", "keto"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Lemon Herb Baked Cod", "Flaky cod baked with herbs and a lemon crust", "seafood", "fish", "easy",
    2, 10, 15, 35, 6, 10, 1, 320,
    ing(["cod fillets", "2", "6oz"], ["panko breadcrumbs", "3", "tbsp"], ["parmesan", "2", "tbsp", "grated"], ["lemon zest", "1", "tsp"], ["dried oregano", "1", "tsp"], ["olive oil", "1", "tbsp"], ["garlic powder", "0.5", "tsp"]),
    ins([1, "Mix panko, parmesan, lemon zest, oregano, garlic powder", 3], [2, "Place cod on baking sheet, brush with oil", 2], [3, "Press breadcrumb mixture on top", 2], [4, "Bake at 400°F for 12-15 min", 15]),
    tags("high-protein", "low-carb"), { cuisineStyle: "mediterranean", cookingMethod: "oven" }),

  r("Coconut Curry Shrimp", "Shrimp simmered in a creamy coconut curry sauce", "seafood", "shrimp", "medium",
    4, 10, 15, 30, 14, 16, 2, 480,
    ing(["large shrimp", "1.5", "lb", "peeled"], ["coconut milk", "1", "can", "full fat"], ["red curry paste", "2", "tbsp"], ["bell pepper", "1", "whole", "sliced"], ["onion", "1", "whole", "diced"], ["garlic", "3", "cloves"], ["fish sauce", "1", "tbsp"], ["basil", "0.25", "cup", "fresh"]),
    ins([1, "Sauté onion and pepper 3 min", 3], [2, "Add garlic and curry paste, cook 1 min", 1], [3, "Pour in coconut milk and fish sauce, simmer 5 min", 5], [4, "Add shrimp, cook 4-5 min until pink", 5], [5, "Top with fresh basil", 1]),
    tags("high-protein", "gluten-free"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Seared Ahi Tuna Steaks", "Restaurant-quality seared tuna with sesame crust", "seafood", "fish", "medium",
    2, 10, 4, 44, 4, 12, 1, 420,
    ing(["ahi tuna steaks", "2", "8oz"], ["sesame seeds", "3", "tbsp"], ["soy sauce", "2", "tbsp"], ["sesame oil", "1", "tbsp"], ["rice vinegar", "1", "tsp"], ["wasabi", "1", "tsp"], ["avocado oil", "1", "tbsp"]),
    ins([1, "Press sesame seeds onto all sides of tuna", 3], [2, "Heat oil in skillet over high heat until smoking", 1], [3, "Sear tuna 1 min per side for rare", 2], [4, "Slice thin, serve with soy-wasabi dip", 2]),
    tags("high-protein", "low-carb"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Shrimp Scampi", "Garlicky shrimp in white wine butter sauce over linguine", "seafood", "shrimp", "easy",
    4, 10, 12, 36, 42, 14, 2, 560,
    ing(["large shrimp", "1.5", "lb", "peeled"], ["linguine", "8", "oz"], ["butter", "3", "tbsp"], ["garlic", "6", "cloves", "minced"], ["white wine", "0.5", "cup"], ["lemon juice", "3", "tbsp"], ["red pepper flakes", "0.25", "tsp"], ["parsley", "0.25", "cup", "chopped"]),
    ins([1, "Cook linguine al dente, reserve 1 cup pasta water", 10], [2, "Sauté garlic in butter 1 min", 1], [3, "Add shrimp, cook 2 min per side", 4], [4, "Pour in wine and lemon juice, simmer 2 min", 2], [5, "Toss with pasta and parsley", 1]),
    tags("high-protein"), { cuisineStyle: "italian", cookingMethod: "stovetop" }),

  r("Fish Tacos with Mango Salsa", "Beer-battered tilapia tacos with fresh mango salsa", "seafood", "fish", "medium",
    4, 15, 10, 28, 32, 12, 4, 380,
    ing(["tilapia fillets", "1", "lb"], ["flour", "0.5", "cup"], ["beer", "0.5", "cup"], ["corn tortillas", "8", "small"], ["mango", "1", "whole", "diced"], ["red onion", "0.25", "cup", "diced"], ["cilantro", "0.25", "cup"], ["lime", "2", "whole"], ["cabbage", "1", "cup", "shredded"]),
    ins([1, "Mix flour, beer, salt to make batter", 3], [2, "Combine mango, onion, cilantro, lime juice for salsa", 5], [3, "Dip fish in batter, fry in oil 3-4 min per side", 8], [4, "Warm tortillas, assemble with cabbage and salsa", 2]),
    tags("high-protein"), { cuisineStyle: "mexican", cookingMethod: "stovetop" }),

  r("Grilled Swordfish Steaks", "Thick-cut swordfish with herb marinade", "seafood", "fish", "medium",
    2, 20, 10, 38, 2, 14, 0, 340,
    ing(["swordfish steaks", "2", "8oz"], ["olive oil", "3", "tbsp"], ["lemon juice", "2", "tbsp"], ["garlic", "3", "cloves", "minced"], ["fresh rosemary", "1", "tbsp", "chopped"], ["dried oregano", "1", "tsp"], ["capers", "1", "tbsp"]),
    ins([1, "Mix oil, lemon, garlic, rosemary, oregano for marinade", 3], [2, "Marinate swordfish 15 min", 15], [3, "Grill over high heat 4-5 min per side", 10], [4, "Top with capers and lemon", 1]),
    tags("high-protein", "low-carb", "keto"), { cuisineStyle: "mediterranean", cookingMethod: "grill" }),

  r("Crab Cakes with Remoulade", "Lump crab cakes pan-fried golden brown", "seafood", "fish", "hard",
    4, 20, 10, 24, 10, 14, 1, 620,
    ing(["lump crab meat", "1", "lb"], ["panko", "0.5", "cup"], ["egg", "1", "large"], ["mayo", "2", "tbsp"], ["dijon mustard", "1", "tsp"], ["old bay seasoning", "1", "tsp"], ["green onion", "2", "stalks", "sliced"], ["lemon", "1", "whole"]),
    ins([1, "Gently fold crab with panko, egg, mayo, mustard, old bay, onion", 8], [2, "Form into 8 patties, chill 10 min", 10], [3, "Pan-fry in oil 3-4 min per side until golden", 8], [4, "Serve with remoulade and lemon", 1]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Miso Glazed Black Cod", "Japanese-style cod with sweet miso glaze", "seafood", "fish", "medium",
    2, 15, 12, 36, 14, 10, 1, 520,
    ing(["black cod fillets", "2", "6oz"], ["white miso paste", "3", "tbsp"], ["mirin", "2", "tbsp"], ["sake", "1", "tbsp"], ["sugar", "1", "tbsp"], ["ginger", "1", "tsp", "grated"]),
    ins([1, "Mix miso, mirin, sake, sugar, ginger", 3], [2, "Marinate cod for at least 10 min", 10], [3, "Broil on high 8-10 min until caramelized", 10], [4, "Serve immediately", 1]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "oven" }),

  r("Garlic Parmesan Tilapia", "Quick baked tilapia with garlic parmesan topping", "seafood", "fish", "easy",
    2, 5, 15, 34, 6, 12, 0, 440,
    ing(["tilapia fillets", "2", "6oz"], ["parmesan", "3", "tbsp", "grated"], ["garlic", "3", "cloves", "minced"], ["butter", "1.5", "tbsp", "melted"], ["Italian seasoning", "1", "tsp"], ["lemon", "1", "whole"]),
    ins([1, "Place tilapia on lined baking sheet", 1], [2, "Mix butter, garlic, parmesan, Italian seasoning", 2], [3, "Spread mixture on fillets", 1], [4, "Bake at 400°F for 12-15 min", 15]),
    tags("high-protein", "low-carb"), { cuisineStyle: "italian", cookingMethod: "oven" }),

  r("Shrimp Fried Rice", "Better-than-takeout shrimp fried rice", "seafood", "shrimp", "easy",
    4, 10, 12, 28, 38, 10, 2, 680,
    ing(["large shrimp", "1", "lb", "peeled"], ["day-old rice", "4", "cups", "cold"], ["eggs", "3", "large", "beaten"], ["soy sauce", "3", "tbsp"], ["sesame oil", "1", "tbsp"], ["frozen peas and carrots", "1", "cup"], ["green onions", "3", "stalks", "sliced"], ["garlic", "3", "cloves"]),
    ins([1, "Scramble eggs in hot wok, set aside", 2], [2, "Sear shrimp 2 min per side, set aside", 4], [3, "Stir-fry garlic, peas, carrots 2 min", 2], [4, "Add rice, soy sauce, toss on high heat 3 min", 3], [5, "Add back eggs and shrimp, drizzle sesame oil", 1]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Tuna Poke Bowl", "Hawaiian-style raw tuna poke over sushi rice", "seafood", "fish", "easy",
    2, 20, 0, 38, 44, 10, 3, 480,
    ing(["sushi-grade ahi tuna", "12", "oz", "cubed"], ["sushi rice", "1.5", "cups", "cooked"], ["soy sauce", "3", "tbsp"], ["sesame oil", "1", "tbsp"], ["rice vinegar", "1", "tsp"], ["avocado", "1", "whole", "sliced"], ["cucumber", "0.5", "cup", "diced"], ["edamame", "0.5", "cup"], ["sesame seeds", "1", "tbsp"], ["nori", "1", "sheet", "sliced"]),
    ins([1, "Toss tuna with soy sauce, sesame oil, vinegar", 5], [2, "Let marinate 10 min", 10], [3, "Divide rice into bowls", 2], [4, "Top with tuna, avocado, cucumber, edamame, sesame, nori", 3]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "no-cook" }),

  r("Cioppino Seafood Stew", "San Francisco-style tomato seafood stew", "seafood", "fish", "hard",
    4, 15, 25, 38, 16, 10, 3, 640,
    ing(["white fish", "0.5", "lb", "cubed"], ["shrimp", "0.5", "lb", "peeled"], ["mussels", "0.5", "lb", "cleaned"], ["crushed tomatoes", "1", "can", "28oz"], ["white wine", "0.5", "cup"], ["onion", "1", "whole", "diced"], ["garlic", "4", "cloves"], ["fennel", "0.5", "bulb", "sliced"], ["fish stock", "1", "cup"], ["red pepper flakes", "0.25", "tsp"]),
    ins([1, "Sauté onion, fennel, garlic 5 min", 5], [2, "Add wine, cook 2 min", 2], [3, "Add tomatoes, stock, pepper flakes, simmer 10 min", 10], [4, "Add fish and mussels, cook 5 min", 5], [5, "Add shrimp, cook 3 min until pink", 3]),
    tags("high-protein", "gluten-free"), { cuisineStyle: "italian", cookingMethod: "stovetop" }),

  // ===== STIR-FRY (10) =====
  r("Classic Chicken Stir Fry", "Tender chicken with crisp vegetables in savory sauce", "stir-fry", "chicken", "easy",
    4, 10, 10, 36, 18, 10, 3, 580,
    ing(["chicken breast", "1.5", "lb", "sliced thin"], ["broccoli", "2", "cups", "florets"], ["bell pepper", "1", "whole", "sliced"], ["soy sauce", "3", "tbsp"], ["oyster sauce", "1", "tbsp"], ["cornstarch", "1", "tbsp"], ["garlic", "3", "cloves"], ["ginger", "1", "tbsp", "grated"], ["vegetable oil", "2", "tbsp"]),
    ins([1, "Toss chicken with cornstarch, 1 tbsp soy sauce", 3], [2, "Stir-fry chicken in hot wok 4 min, set aside", 4], [3, "Stir-fry vegetables 3 min until crisp-tender", 3], [4, "Return chicken, add sauces, toss 1 min", 1]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Beef and Broccoli Stir Fry", "Thinly sliced beef with broccoli in a ginger-soy glaze", "stir-fry", "beef", "easy",
    4, 10, 10, 34, 14, 14, 3, 640,
    ing(["flank steak", "1.5", "lb", "sliced thin against grain"], ["broccoli", "3", "cups", "florets"], ["soy sauce", "3", "tbsp"], ["brown sugar", "1", "tbsp"], ["cornstarch", "1", "tbsp"], ["sesame oil", "1", "tsp"], ["garlic", "3", "cloves"], ["ginger", "1", "tbsp", "grated"]),
    ins([1, "Marinate beef in soy sauce, cornstarch, sesame oil 5 min", 5], [2, "Sear beef in hot wok in batches 2 min, set aside", 4], [3, "Stir-fry broccoli with garlic, ginger 3 min", 3], [4, "Return beef, add brown sugar, toss until glazed", 2]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Kung Pao Chicken", "Spicy Sichuan chicken with peanuts and dried chilis", "stir-fry", "chicken", "medium",
    4, 15, 10, 34, 16, 14, 2, 620,
    ing(["chicken thighs", "1.5", "lb", "cubed"], ["peanuts", "0.5", "cup", "roasted"], ["dried red chilis", "8", "whole"], ["soy sauce", "3", "tbsp"], ["rice vinegar", "2", "tbsp"], ["hoisin sauce", "1", "tbsp"], ["cornstarch", "1", "tbsp"], ["Sichuan peppercorns", "1", "tsp"], ["zucchini", "1", "whole", "cubed"], ["green onions", "3", "stalks"]),
    ins([1, "Coat chicken in cornstarch", 3], [2, "Fry chicken in hot oil 5 min until golden", 5], [3, "Toast chilis and peppercorns 30 sec", 1], [4, "Add zucchini, cook 2 min", 2], [5, "Add sauces, chicken, peanuts, toss 1 min", 1]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Tofu Vegetable Stir Fry", "Crispy tofu with mixed vegetables in teriyaki sauce", "stir-fry", "tofu", "easy",
    4, 15, 12, 22, 20, 14, 4, 480,
    ing(["extra-firm tofu", "14", "oz", "pressed and cubed"], ["snap peas", "1", "cup"], ["carrots", "2", "whole", "julienned"], ["mushrooms", "1", "cup", "sliced"], ["soy sauce", "3", "tbsp"], ["mirin", "2", "tbsp"], ["cornstarch", "2", "tbsp"], ["sesame oil", "1", "tbsp"], ["garlic", "3", "cloves"], ["ginger", "1", "tbsp"]),
    ins([1, "Coat tofu in cornstarch, pan-fry until crispy 6 min", 6], [2, "Remove tofu, stir-fry vegetables 3 min", 3], [3, "Add garlic and ginger, cook 1 min", 1], [4, "Add soy sauce, mirin, return tofu, toss", 2]),
    tags("vegetarian", "vegan", "high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Shrimp Pad Thai Stir Fry", "Rice noodles with shrimp, egg, and tamarind sauce", "stir-fry", "shrimp", "medium",
    4, 15, 10, 30, 40, 10, 2, 560,
    ing(["large shrimp", "1", "lb", "peeled"], ["rice noodles", "8", "oz"], ["eggs", "2", "large"], ["tamarind paste", "2", "tbsp"], ["fish sauce", "2", "tbsp"], ["brown sugar", "1.5", "tbsp"], ["bean sprouts", "1", "cup"], ["peanuts", "0.25", "cup", "crushed"], ["lime", "2", "whole"], ["green onions", "3", "stalks"]),
    ins([1, "Soak rice noodles in hot water 8 min, drain", 8], [2, "Mix tamarind, fish sauce, brown sugar", 2], [3, "Scramble eggs in wok, set aside", 2], [4, "Sear shrimp 2 min per side", 4], [5, "Add noodles, sauce, eggs, toss 2 min, top with peanuts and lime", 2]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Mongolian Beef", "Sweet and savory beef with green onions over rice", "stir-fry", "beef", "medium",
    4, 15, 10, 32, 22, 12, 1, 600,
    ing(["flank steak", "1.5", "lb", "sliced thin"], ["soy sauce", "0.33", "cup"], ["brown sugar", "0.33", "cup"], ["cornstarch", "0.25", "cup"], ["garlic", "4", "cloves", "minced"], ["ginger", "1", "tbsp", "grated"], ["green onions", "6", "stalks", "cut 2-inch"], ["vegetable oil", "3", "tbsp"]),
    ins([1, "Coat beef slices in cornstarch", 3], [2, "Deep-fry beef in batches until crispy, 3 min", 6], [3, "In clean wok, sauté garlic and ginger 30 sec", 1], [4, "Add soy sauce, brown sugar, simmer until thick", 2], [5, "Toss in beef and green onions", 1]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Thai Basil Chicken", "Spicy ground chicken with Thai basil and chili", "stir-fry", "chicken", "easy",
    4, 5, 10, 30, 8, 12, 1, 640,
    ing(["ground chicken", "1.5", "lb"], ["Thai basil", "1", "cup", "leaves"], ["Thai chilis", "3", "whole", "sliced"], ["garlic", "5", "cloves", "minced"], ["soy sauce", "2", "tbsp"], ["oyster sauce", "1", "tbsp"], ["fish sauce", "1", "tbsp"], ["sugar", "1", "tsp"], ["vegetable oil", "2", "tbsp"]),
    ins([1, "Fry garlic and chilis in oil 30 sec", 1], [2, "Add ground chicken, break up, cook 6 min", 6], [3, "Add soy sauce, oyster sauce, fish sauce, sugar", 1], [4, "Toss in basil leaves, stir until wilted", 1]),
    tags("high-protein", "low-carb"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Cashew Chicken Stir Fry", "Chicken thighs with cashews and vegetables in hoisin", "stir-fry", "chicken", "easy",
    4, 10, 10, 34, 16, 16, 2, 520,
    ing(["chicken thighs", "1.5", "lb", "cubed"], ["cashews", "0.5", "cup", "roasted"], ["bell peppers", "2", "whole", "diced"], ["hoisin sauce", "3", "tbsp"], ["soy sauce", "2", "tbsp"], ["rice vinegar", "1", "tbsp"], ["cornstarch", "1", "tbsp"], ["garlic", "3", "cloves"], ["ginger", "1", "tsp"]),
    ins([1, "Toss chicken with cornstarch", 2], [2, "Stir-fry chicken 5 min until golden", 5], [3, "Add peppers, garlic, ginger, cook 2 min", 2], [4, "Add hoisin, soy sauce, vinegar, toss with cashews", 1]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Szechuan Shrimp Stir Fry", "Fiery shrimp with Szechuan peppercorn sauce", "stir-fry", "shrimp", "medium",
    4, 10, 8, 30, 10, 10, 2, 580,
    ing(["large shrimp", "1.5", "lb", "peeled"], ["Szechuan peppercorns", "1", "tbsp"], ["dried chilis", "6", "whole"], ["garlic", "4", "cloves"], ["ginger", "1", "tbsp"], ["soy sauce", "2", "tbsp"], ["chili bean paste", "1", "tbsp"], ["sugar", "1", "tsp"], ["bell pepper", "1", "whole", "diced"], ["green onions", "3", "stalks"]),
    ins([1, "Toast peppercorns and chilis in dry wok 30 sec", 1], [2, "Add oil, sear shrimp 2 min per side", 4], [3, "Add garlic, ginger, chili bean paste, cook 1 min", 1], [4, "Add soy sauce, sugar, pepper, green onions, toss", 1]),
    tags("high-protein", "low-carb"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Sweet Chili Tofu Stir Fry", "Crispy tofu cubes tossed in sweet chili with veggies", "stir-fry", "tofu", "easy",
    4, 15, 10, 20, 24, 12, 3, 380,
    ing(["extra-firm tofu", "14", "oz", "pressed and cubed"], ["sweet chili sauce", "0.25", "cup"], ["soy sauce", "1", "tbsp"], ["cornstarch", "3", "tbsp"], ["broccoli", "2", "cups", "florets"], ["red bell pepper", "1", "whole", "sliced"], ["sesame seeds", "1", "tbsp"], ["vegetable oil", "2", "tbsp"]),
    ins([1, "Coat tofu in cornstarch, fry until golden and crispy 6 min", 6], [2, "Stir-fry broccoli and pepper 3 min", 3], [3, "Return tofu, pour sweet chili and soy sauce over", 1], [4, "Toss until coated, garnish with sesame seeds", 1]),
    tags("vegetarian", "vegan"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  // ===== SOUP (10) =====
  r("Classic Chicken Noodle Soup", "Comforting homemade chicken noodle soup", "soup", "chicken", "easy",
    6, 10, 25, 30, 24, 8, 2, 680,
    ing(["chicken breast", "1.5", "lb"], ["egg noodles", "8", "oz"], ["carrots", "3", "whole", "sliced"], ["celery", "3", "stalks", "sliced"], ["onion", "1", "whole", "diced"], ["chicken broth", "8", "cups"], ["garlic", "3", "cloves"], ["bay leaves", "2", "whole"], ["thyme", "1", "tsp"], ["parsley", "2", "tbsp"]),
    ins([1, "Sauté onion, carrots, celery 5 min", 5], [2, "Add broth, garlic, bay leaves, thyme, bring to boil", 3], [3, "Add chicken, simmer 15 min until cooked through", 15], [4, "Remove chicken, shred, return to pot with noodles", 5], [5, "Cook noodles 6 min, season and serve", 6]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Hearty Beef Chili", "Thick and spicy beef chili with beans", "soup", "beef", "medium",
    6, 10, 30, 32, 24, 12, 6, 720,
    ing(["ground beef", "1.5", "lb", "85% lean"], ["kidney beans", "2", "cans", "drained"], ["diced tomatoes", "1", "can", "28oz"], ["tomato paste", "2", "tbsp"], ["onion", "1", "large", "diced"], ["bell pepper", "1", "whole", "diced"], ["garlic", "4", "cloves"], ["chili powder", "3", "tbsp"], ["cumin", "1", "tbsp"], ["paprika", "1", "tsp"]),
    ins([1, "Brown beef in Dutch oven 6 min, drain excess fat", 6], [2, "Sauté onion and pepper 3 min", 3], [3, "Add garlic, spices, cook 1 min", 1], [4, "Add tomatoes, beans, tomato paste, stir", 2], [5, "Simmer 20 min, season to taste", 20]),
    tags("high-protein", "gluten-free"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Tonkotsu Ramen", "Rich pork bone broth ramen with soft-boiled egg", "soup", "pork", "hard",
    4, 30, 45, 38, 48, 18, 2, 506,
    ing(["ramen noodles", "4", "bundles"], ["pork belly", "8", "oz", "sliced"], ["soft-boiled eggs", "4", "whole", "halved"], ["chicken broth", "6", "cups"], ["soy sauce", "3", "tbsp"], ["miso paste", "2", "tbsp"], ["garlic", "4", "cloves"], ["ginger", "2", "inches"], ["green onions", "4", "stalks"], ["nori", "4", "sheets"], ["sesame oil", "1", "tbsp"]),
    ins([1, "Simmer broth with garlic, ginger 20 min", 20], [2, "Sear pork belly slices until crispy 5 min", 5], [3, "Whisk miso and soy sauce into broth", 2], [4, "Cook ramen noodles 3 min", 3], [5, "Assemble bowls: noodles, broth, pork, egg, nori, green onions", 5]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Minestrone Soup", "Hearty Italian vegetable soup with pasta and beans", "soup", "none", "easy",
    6, 10, 25, 12, 32, 6, 8, 520,
    ing(["cannellini beans", "1", "can", "drained"], ["ditalini pasta", "1", "cup"], ["zucchini", "1", "whole", "diced"], ["carrots", "2", "whole", "diced"], ["celery", "2", "stalks", "diced"], ["diced tomatoes", "1", "can", "14oz"], ["vegetable broth", "6", "cups"], ["garlic", "3", "cloves"], ["Italian seasoning", "1", "tbsp"], ["spinach", "2", "cups"], ["parmesan rind", "1", "piece"]),
    ins([1, "Sauté onion, carrots, celery 5 min", 5], [2, "Add garlic, Italian seasoning, cook 1 min", 1], [3, "Add broth, tomatoes, parmesan rind, simmer 10 min", 10], [4, "Add pasta, zucchini, beans, cook 8 min", 8], [5, "Stir in spinach until wilted", 1]),
    tags("vegetarian"), { cuisineStyle: "italian", cookingMethod: "stovetop" }),

  r("Chicken Pho", "Vietnamese chicken pho with rice noodles and herbs", "soup", "chicken", "medium",
    4, 15, 30, 32, 36, 6, 1, 580,
    ing(["chicken thighs", "1", "lb", "bone-in"], ["rice noodles", "8", "oz"], ["chicken broth", "8", "cups"], ["star anise", "3", "whole"], ["cinnamon stick", "1", "whole"], ["fish sauce", "2", "tbsp"], ["ginger", "3", "inches", "halved"], ["onion", "1", "whole", "halved and charred"], ["bean sprouts", "1", "cup"], ["Thai basil", "0.5", "cup"], ["lime", "2", "whole"], ["sriracha", "2", "tbsp"]),
    ins([1, "Char onion and ginger under broiler 5 min", 5], [2, "Simmer broth with star anise, cinnamon, onion, ginger 20 min", 20], [3, "Add chicken, poach 15 min, shred", 15], [4, "Soak rice noodles 5 min, drain", 5], [5, "Strain broth, assemble bowls with noodles, chicken, herbs", 3]),
    tags("high-protein", "gluten-free"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Creamy Tomato Basil Soup", "Velvety roasted tomato soup with fresh basil", "soup", "none", "easy",
    4, 10, 25, 8, 22, 14, 4, 250,
    ing(["roma tomatoes", "2", "lb", "halved"], ["onion", "1", "whole", "quartered"], ["garlic", "6", "cloves"], ["olive oil", "2", "tbsp"], ["vegetable broth", "2", "cups"], ["heavy cream", "0.5", "cup"], ["fresh basil", "0.5", "cup"], ["balsamic vinegar", "1", "tbsp"], ["sugar", "1", "tsp"]),
    ins([1, "Roast tomatoes, onion, garlic with oil at 400°F for 20 min", 20], [2, "Transfer to pot with broth, simmer 5 min", 5], [3, "Blend until smooth", 2], [4, "Stir in cream, basil, balsamic, season", 2]),
    tags("vegetarian", "gluten-free"), { cuisineStyle: "italian", cookingMethod: "oven" }),

  r("Turkey White Bean Soup", "Light turkey soup with white beans and kale", "soup", "turkey", "easy",
    6, 10, 25, 30, 20, 6, 5, 480,
    ing(["ground turkey", "1.5", "lb"], ["cannellini beans", "2", "cans", "drained"], ["kale", "3", "cups", "chopped"], ["chicken broth", "6", "cups"], ["onion", "1", "whole", "diced"], ["carrots", "2", "whole", "diced"], ["garlic", "4", "cloves"], ["Italian seasoning", "1", "tbsp"], ["lemon juice", "2", "tbsp"]),
    ins([1, "Brown turkey in pot 5 min, breaking apart", 5], [2, "Add onion, carrots, cook 3 min", 3], [3, "Add garlic, Italian seasoning, cook 1 min", 1], [4, "Pour in broth and beans, simmer 15 min", 15], [5, "Add kale, cook 3 min, finish with lemon", 3]),
    tags("high-protein", "gluten-free"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Spicy Thai Coconut Soup", "Tom Kha Gai — creamy coconut chicken soup with galangal", "soup", "chicken", "medium",
    4, 10, 15, 28, 12, 18, 1, 560,
    ing(["chicken breast", "1", "lb", "sliced thin"], ["coconut milk", "2", "cans", "full fat"], ["chicken broth", "2", "cups"], ["mushrooms", "1", "cup", "sliced"], ["lemongrass", "2", "stalks", "smashed"], ["galangal", "4", "slices"], ["fish sauce", "2", "tbsp"], ["lime juice", "3", "tbsp"], ["Thai chilis", "2", "whole"], ["cilantro", "0.25", "cup"]),
    ins([1, "Simmer broth with lemongrass, galangal, chilis 5 min", 5], [2, "Add coconut milk, bring to gentle simmer", 2], [3, "Add chicken and mushrooms, cook 6 min", 6], [4, "Add fish sauce and lime juice", 1], [5, "Garnish with cilantro", 1]),
    tags("high-protein", "gluten-free"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Black Bean Soup", "Smoky Cuban-style black bean soup", "soup", "none", "easy",
    6, 10, 25, 14, 36, 4, 10, 440,
    ing(["black beans", "3", "cans", "drained"], ["onion", "1", "large", "diced"], ["bell pepper", "1", "whole", "diced"], ["garlic", "4", "cloves"], ["cumin", "2", "tsp"], ["smoked paprika", "1", "tsp"], ["vegetable broth", "4", "cups"], ["lime juice", "2", "tbsp"], ["cilantro", "0.25", "cup"], ["sour cream", "4", "tbsp", "for topping"]),
    ins([1, "Sauté onion and pepper 4 min", 4], [2, "Add garlic, cumin, paprika, cook 1 min", 1], [3, "Add beans and broth, simmer 15 min", 15], [4, "Blend half the soup, stir back in for thickness", 3], [5, "Add lime juice, top with cilantro and sour cream", 2]),
    tags("vegetarian", "high-fiber"), { cuisineStyle: "mexican", cookingMethod: "stovetop" }),

  r("Italian Wedding Soup", "Mini meatballs with escarole in clear broth", "soup", "beef", "medium",
    6, 15, 20, 26, 14, 10, 2, 560,
    ing(["ground beef and pork mix", "1", "lb"], ["egg", "1", "large"], ["breadcrumbs", "0.25", "cup"], ["parmesan", "0.25", "cup", "grated"], ["garlic", "3", "cloves", "minced"], ["chicken broth", "8", "cups"], ["acini di pepe pasta", "0.5", "cup"], ["escarole", "4", "cups", "chopped"], ["onion", "0.5", "whole", "minced"], ["Italian seasoning", "1", "tsp"]),
    ins([1, "Mix meat, egg, breadcrumbs, parmesan, garlic, onion, seasoning; form small balls", 10], [2, "Bring broth to boil, drop in meatballs, simmer 8 min", 8], [3, "Add pasta, cook 6 min", 6], [4, "Stir in escarole, cook 2 min until wilted", 2], [5, "Serve with extra parmesan", 1]),
    tags("high-protein"), { cuisineStyle: "italian", cookingMethod: "stovetop" }),

  // ===== SANDWICH (10) =====
  r("Turkey Club Wrap", "Classic turkey club rolled in a large flour tortilla", "sandwich", "turkey", "easy",
    1, 5, 0, 34, 30, 16, 2, 680,
    ing(["large flour tortilla", "1", "whole"], ["deli turkey", "6", "oz"], ["bacon", "3", "strips", "cooked"], ["lettuce", "2", "leaves"], ["tomato", "3", "slices"], ["avocado", "0.25", "whole", "sliced"], ["mayo", "1", "tbsp"], ["mustard", "1", "tsp"]),
    ins([1, "Spread mayo and mustard on tortilla", 1], [2, "Layer turkey, bacon, lettuce, tomato, avocado", 2], [3, "Roll tightly, cut in half diagonally", 2]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("Grilled Chicken Panini", "Pressed chicken sandwich with pesto and mozzarella", "sandwich", "chicken", "easy",
    1, 5, 8, 42, 30, 18, 2, 620,
    ing(["ciabatta bread", "1", "roll", "halved"], ["grilled chicken breast", "6", "oz", "sliced"], ["fresh mozzarella", "2", "oz", "sliced"], ["pesto", "2", "tbsp"], ["roasted red peppers", "0.25", "cup"], ["arugula", "0.5", "cup"], ["olive oil", "1", "tsp"]),
    ins([1, "Spread pesto on both bread halves", 1], [2, "Layer chicken, mozzarella, peppers, arugula", 2], [3, "Brush outside with oil, press in panini press or skillet 4 min per side", 8]),
    tags("high-protein"), { cuisineStyle: "italian", cookingMethod: "stovetop" }),

  r("Philly Cheesesteak Sub", "Thinly sliced beef with peppers, onions, and provolone", "sandwich", "beef", "medium",
    2, 10, 10, 38, 34, 20, 2, 740,
    ing(["ribeye steak", "1", "lb", "sliced paper thin"], ["hoagie rolls", "2", "whole"], ["provolone cheese", "4", "slices"], ["onion", "1", "whole", "sliced"], ["bell pepper", "1", "whole", "sliced"], ["mushrooms", "0.5", "cup", "sliced"], ["Worcestershire sauce", "1", "tbsp"], ["butter", "1", "tbsp"]),
    ins([1, "Sauté onion, pepper, mushrooms in butter 5 min", 5], [2, "Push veggies aside, sear beef 2 min", 2], [3, "Mix with veggies, add Worcestershire", 1], [4, "Top with provolone, cover to melt 1 min", 1], [5, "Stuff into hoagie rolls", 1]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Tuna Salad Sandwich", "Classic tuna salad with celery and dill on whole wheat", "sandwich", "fish", "easy",
    2, 10, 0, 28, 26, 12, 4, 520,
    ing(["canned tuna", "2", "cans", "drained"], ["mayo", "2", "tbsp"], ["dijon mustard", "1", "tsp"], ["celery", "1", "stalk", "diced fine"], ["red onion", "2", "tbsp", "diced fine"], ["dill", "1", "tsp", "dried"], ["lemon juice", "1", "tbsp"], ["whole wheat bread", "4", "slices"], ["lettuce", "2", "leaves"]),
    ins([1, "Mix tuna, mayo, mustard, celery, onion, dill, lemon", 5], [2, "Season with salt and pepper", 1], [3, "Divide between bread slices, add lettuce, close", 2]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("BBQ Pulled Pork Sandwich", "Slow-cooked pulled pork with tangy BBQ sauce", "sandwich", "pork", "medium",
    6, 10, 30, 34, 32, 14, 2, 518,
    ing(["pork shoulder", "2", "lb"], ["BBQ sauce", "1", "cup"], ["apple cider vinegar", "2", "tbsp"], ["brown sugar", "2", "tbsp"], ["smoked paprika", "1", "tbsp"], ["garlic powder", "1", "tsp"], ["onion powder", "1", "tsp"], ["brioche buns", "6", "whole"], ["coleslaw", "1.5", "cups"]),
    ins([1, "Rub pork with spices", 3], [2, "Place in slow cooker with vinegar, cook on high 4 hours or until shreddable (abbreviated for test)", 25], [3, "Shred pork, mix with BBQ sauce", 3], [4, "Pile on buns, top with coleslaw", 2]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "crockpot" }),

  r("Chicken Caesar Wrap", "Grilled chicken with romaine and Caesar dressing in a wrap", "sandwich", "chicken", "easy",
    1, 5, 0, 36, 24, 14, 2, 386,
    ing(["large flour tortilla", "1", "whole"], ["grilled chicken breast", "5", "oz", "sliced"], ["romaine lettuce", "1", "cup", "chopped"], ["parmesan", "2", "tbsp", "shaved"], ["Caesar dressing", "2", "tbsp"], ["croutons", "2", "tbsp", "crushed"]),
    ins([1, "Drizzle dressing over tortilla", 1], [2, "Layer chicken, lettuce, parmesan, croutons", 2], [3, "Roll tightly, cut in half", 2]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("Caprese Grilled Cheese", "Tomato, mozzarella, and basil grilled cheese on sourdough", "sandwich", "none", "easy",
    1, 5, 6, 18, 28, 20, 2, 364,
    ing(["sourdough bread", "2", "slices"], ["fresh mozzarella", "3", "oz", "sliced"], ["tomato", "3", "slices"], ["fresh basil", "4", "leaves"], ["balsamic glaze", "1", "tsp"], ["butter", "1", "tbsp"]),
    ins([1, "Butter outside of bread slices", 1], [2, "Layer mozzarella, tomato, basil between slices", 2], [3, "Grill in skillet 3 min per side until golden", 6], [4, "Drizzle with balsamic glaze", 1]),
    tags("vegetarian"), { cuisineStyle: "italian", cookingMethod: "stovetop" }),

  r("BLT with Avocado", "Classic BLT upgraded with ripe avocado", "sandwich", "pork", "easy",
    1, 5, 5, 18, 26, 22, 5, 580,
    ing(["sourdough bread", "2", "slices", "toasted"], ["thick-cut bacon", "4", "strips"], ["lettuce", "2", "leaves"], ["tomato", "3", "slices"], ["avocado", "0.5", "whole", "sliced"], ["mayo", "1", "tbsp"]),
    ins([1, "Cook bacon until crispy 5 min", 5], [2, "Toast bread", 2], [3, "Spread mayo on bread, layer bacon, lettuce, tomato, avocado", 2], [4, "Close and cut diagonally", 1]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Mediterranean Veggie Wrap", "Hummus wrap with roasted veggies and feta", "sandwich", "none", "easy",
    1, 10, 0, 14, 36, 16, 6, 420,
    ing(["large whole wheat tortilla", "1", "whole"], ["hummus", "3", "tbsp"], ["roasted red peppers", "0.25", "cup"], ["cucumber", "0.25", "cup", "sliced"], ["kalamata olives", "5", "whole", "sliced"], ["feta cheese", "1", "oz", "crumbled"], ["spinach", "0.5", "cup"], ["red onion", "2", "tbsp", "sliced"]),
    ins([1, "Spread hummus across tortilla", 1], [2, "Layer all vegetables and feta", 3], [3, "Roll tightly, cut in half", 2]),
    tags("vegetarian"), { cuisineStyle: "mediterranean", cookingMethod: "no-cook" }),

  r("Spicy Chicken Banh Mi", "Vietnamese baguette with lemongrass chicken and pickled veggies", "sandwich", "chicken", "medium",
    2, 15, 8, 34, 38, 10, 3, 394,
    ing(["chicken thighs", "0.75", "lb", "sliced"], ["baguette", "2", "6-inch", "split"], ["carrots", "1", "whole", "julienned"], ["daikon radish", "0.5", "cup", "julienned"], ["rice vinegar", "3", "tbsp"], ["sugar", "1", "tbsp"], ["lemongrass", "1", "stalk", "minced"], ["fish sauce", "1", "tbsp"], ["sriracha mayo", "2", "tbsp"], ["cilantro", "0.25", "cup"], ["jalapeno", "1", "whole", "sliced"]),
    ins([1, "Quick-pickle carrots and daikon in vinegar and sugar 10 min", 10], [2, "Marinate chicken with lemongrass, fish sauce 5 min", 5], [3, "Sear chicken 3-4 min per side", 8], [4, "Spread sriracha mayo on baguettes, fill with chicken, pickled veggies, cilantro, jalapeno", 3]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  // ===== SNACK (10) =====
  r("Chocolate Peanut Butter Protein Balls", "No-bake energy bites with 12g protein each", "snack", "none", "easy",
    6, 10, 0, 12, 18, 8, 2, 80,
    ing(["oats", "1", "cup"], ["peanut butter", "0.5", "cup"], ["chocolate protein powder", "1", "scoop"], ["honey", "2", "tbsp"], ["dark chocolate chips", "2", "tbsp"], ["chia seeds", "1", "tbsp"]),
    ins([1, "Mix all ingredients in a bowl", 3], [2, "Roll into 12 balls", 5], [3, "Refrigerate 30 min to firm up", 2]),
    tags("high-protein", "vegetarian"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("Greek Yogurt Protein Parfait", "Layered Greek yogurt with berries and granola", "snack", "none", "easy",
    1, 5, 0, 24, 28, 6, 3, 120,
    ing(["Greek yogurt", "1", "cup", "nonfat plain"], ["mixed berries", "0.5", "cup"], ["granola", "0.25", "cup"], ["honey", "1", "tsp"], ["almonds", "1", "tbsp", "sliced"]),
    ins([1, "Layer yogurt, berries, and granola in a glass", 3], [2, "Drizzle with honey, top with almonds", 2]),
    tags("high-protein", "vegetarian"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("Turkey Jerky Snack Bowl", "Turkey jerky with cheese cubes, nuts, and dried fruit", "snack", "turkey", "easy",
    1, 3, 0, 22, 16, 10, 2, 380,
    ing(["turkey jerky", "2", "oz"], ["cheddar cheese cubes", "1", "oz"], ["almonds", "10", "whole"], ["dried cranberries", "1", "tbsp"], ["celery sticks", "2", "stalks"]),
    ins([1, "Arrange all items in a snack bowl or bento box", 3]),
    tags("high-protein", "low-carb"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("Spicy Roasted Chickpeas", "Crunchy oven-roasted chickpeas with cumin and chili", "snack", "none", "easy",
    4, 5, 25, 8, 20, 4, 4, 280,
    ing(["chickpeas", "1", "can", "drained and dried"], ["olive oil", "1", "tbsp"], ["cumin", "1", "tsp"], ["chili powder", "1", "tsp"], ["garlic powder", "0.5", "tsp"], ["salt", "0.5", "tsp"]),
    ins([1, "Toss chickpeas with oil and spices", 3], [2, "Spread on baking sheet in single layer", 2], [3, "Bake at 400°F for 25 min, shaking halfway", 25]),
    tags("vegan", "vegetarian", "gluten-free", "high-fiber"), { cuisineStyle: "mediterranean", cookingMethod: "oven" }),

  r("Cottage Cheese Protein Bowl", "Cottage cheese with cucumber, tomato, and everything seasoning", "snack", "none", "easy",
    1, 3, 0, 24, 8, 4, 1, 340,
    ing(["cottage cheese", "1", "cup", "low-fat"], ["cucumber", "0.25", "cup", "diced"], ["cherry tomatoes", "4", "whole", "halved"], ["everything bagel seasoning", "1", "tsp"], ["olive oil", "0.5", "tsp"]),
    ins([1, "Scoop cottage cheese into bowl", 1], [2, "Top with cucumber, tomatoes, drizzle oil, sprinkle seasoning", 2]),
    tags("high-protein", "low-carb", "vegetarian"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("High Protein Trail Mix", "Custom trail mix with nuts, seeds, and dark chocolate", "snack", "none", "easy",
    8, 5, 0, 8, 14, 12, 2, 40,
    ing(["almonds", "0.5", "cup"], ["pumpkin seeds", "0.25", "cup"], ["walnuts", "0.25", "cup"], ["dark chocolate chips", "0.25", "cup"], ["dried edamame", "0.25", "cup"], ["coconut flakes", "2", "tbsp"]),
    ins([1, "Combine all ingredients in a bowl", 2], [2, "Portion into 8 servings (about 1/4 cup each)", 3]),
    tags("high-protein", "vegetarian", "gluten-free"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("Hummus and Veggie Protein Plate", "Protein-boosted hummus with crunchy vegetables", "snack", "none", "easy",
    2, 5, 0, 12, 22, 10, 5, 320,
    ing(["hummus", "0.5", "cup"], ["carrots", "2", "whole", "sticks"], ["bell pepper", "1", "whole", "sliced"], ["cucumber", "0.5", "whole", "sliced"], ["cherry tomatoes", "6", "whole"], ["hemp seeds", "1", "tbsp"]),
    ins([1, "Scoop hummus into center of plate", 1], [2, "Arrange vegetables around hummus", 3], [3, "Sprinkle hemp seeds on hummus", 1]),
    tags("vegan", "vegetarian", "gluten-free", "high-fiber"), { cuisineStyle: "mediterranean", cookingMethod: "no-cook" }),

  r("Egg White Bites", "Copycat Starbucks egg white bites with peppers", "snack", "eggs", "easy",
    6, 10, 20, 12, 4, 6, 1, 280,
    ing(["egg whites", "8", "large"], ["cottage cheese", "0.5", "cup"], ["red bell pepper", "0.25", "cup", "diced"], ["spinach", "0.25", "cup", "chopped"], ["feta cheese", "2", "tbsp", "crumbled"], ["salt", "0.25", "tsp"]),
    ins([1, "Blend egg whites and cottage cheese until smooth", 2], [2, "Stir in peppers, spinach, feta", 2], [3, "Pour into greased muffin tin", 2], [4, "Bake at 350°F for 18-20 min", 20]),
    tags("high-protein", "low-carb", "gluten-free", "vegetarian"), { cuisineStyle: "american", cookingMethod: "oven" }),

  r("Edamame with Sea Salt", "Steamed edamame pods tossed with flaky sea salt", "snack", "none", "easy",
    2, 2, 5, 14, 8, 6, 4, 180,
    ing(["frozen edamame in pods", "2", "cups"], ["flaky sea salt", "0.5", "tsp"], ["sesame oil", "0.5", "tsp"], ["red pepper flakes", "0.25", "tsp"]),
    ins([1, "Steam or boil edamame 4-5 min", 5], [2, "Drain, toss with sesame oil, salt, pepper flakes", 1]),
    tags("vegan", "vegetarian", "gluten-free", "high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Apple Slices with Almond Butter", "Crisp apple slices with almond butter and granola drizzle", "snack", "none", "easy",
    1, 3, 0, 8, 24, 10, 3, 40,
    ing(["apple", "1", "large", "sliced"], ["almond butter", "2", "tbsp"], ["granola", "1", "tbsp"], ["cinnamon", "0.25", "tsp"]),
    ins([1, "Slice apple and arrange on plate", 2], [2, "Drizzle almond butter, sprinkle granola and cinnamon", 1]),
    tags("vegetarian", "gluten-free"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  // ===== GRILL (10) =====
  r("Perfect Grilled Ribeye", "Restaurant-quality ribeye with garlic herb butter", "grill", "beef", "medium",
    2, 10, 14, 46, 1, 28, 0, 340,
    ing(["ribeye steaks", "2", "12oz"], ["butter", "2", "tbsp", "softened"], ["garlic", "2", "cloves", "minced"], ["fresh rosemary", "1", "tsp", "chopped"], ["fresh thyme", "1", "tsp", "chopped"], ["salt", "1", "tsp", "coarse"], ["black pepper", "1", "tsp"]),
    ins([1, "Mix butter, garlic, rosemary, thyme to make compound butter", 3], [2, "Season steaks generously, let sit at room temp 10 min", 10], [3, "Grill over high heat 4-5 min per side for medium-rare", 10], [4, "Rest 5 min, top with herb butter", 5]),
    tags("high-protein", "low-carb", "keto"), { cuisineStyle: "american", cookingMethod: "grill" }),

  r("Chicken Souvlaki Skewers", "Greek-style marinated chicken on skewers with tzatziki", "grill", "chicken", "easy",
    4, 20, 12, 36, 6, 10, 1, 440,
    ing(["chicken breast", "2", "lb", "cubed"], ["olive oil", "3", "tbsp"], ["lemon juice", "3", "tbsp"], ["garlic", "4", "cloves", "minced"], ["dried oregano", "2", "tsp"], ["red onion", "1", "whole", "chunks"], ["bell peppers", "2", "whole", "chunks"], ["tzatziki", "0.5", "cup"]),
    ins([1, "Marinate chicken in oil, lemon, garlic, oregano 15 min", 15], [2, "Thread chicken and veggies on skewers", 5], [3, "Grill over medium-high 4 min per side", 8], [4, "Serve with tzatziki", 1]),
    tags("high-protein", "low-carb", "gluten-free"), { cuisineStyle: "mediterranean", cookingMethod: "grill" }),

  r("Smoked BBQ Baby Back Ribs", "Fall-off-the-bone ribs with smoky BBQ glaze", "grill", "pork", "hard",
    4, 20, 180, 34, 18, 22, 0, 620,
    ing(["baby back ribs", "2", "racks"], ["BBQ sauce", "1", "cup"], ["brown sugar", "2", "tbsp"], ["smoked paprika", "2", "tbsp"], ["garlic powder", "1", "tbsp"], ["onion powder", "1", "tbsp"], ["chili powder", "1", "tsp"], ["apple cider vinegar", "2", "tbsp"], ["mustard", "1", "tbsp"]),
    ins([1, "Mix dry rub: sugar, paprika, garlic, onion, chili powder", 3], [2, "Rub generously on ribs, wrap in foil", 5], [3, "Grill indirect heat 250°F for 2.5 hours", 150], [4, "Unwrap, brush with BBQ sauce, grill direct 10 min", 10]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "grill" }),

  r("Grilled Shrimp Kabobs", "Lemon garlic shrimp kabobs with zucchini and peppers", "grill", "shrimp", "easy",
    4, 15, 8, 30, 8, 8, 2, 360,
    ing(["jumbo shrimp", "1.5", "lb", "peeled"], ["zucchini", "2", "whole", "chunks"], ["bell peppers", "2", "whole", "chunks"], ["olive oil", "2", "tbsp"], ["lemon juice", "2", "tbsp"], ["garlic", "3", "cloves", "minced"], ["paprika", "1", "tsp"], ["Italian seasoning", "1", "tsp"]),
    ins([1, "Toss shrimp and veggies with oil, lemon, garlic, spices", 5], [2, "Thread onto skewers alternating shrimp and veggies", 5], [3, "Grill over medium-high 3 min per side", 6], [4, "Squeeze extra lemon before serving", 1]),
    tags("high-protein", "low-carb", "gluten-free"), { cuisineStyle: "american", cookingMethod: "grill" }),

  r("Classic Grilled Burgers", "Juicy smash-style burgers with all the fixings", "grill", "beef", "easy",
    4, 10, 10, 34, 28, 22, 2, 580,
    ing(["ground beef", "1.5", "lb", "80/20"], ["brioche buns", "4", "whole"], ["cheddar cheese", "4", "slices"], ["lettuce", "4", "leaves"], ["tomato", "4", "slices"], ["onion", "4", "slices"], ["pickles", "8", "slices"], ["ketchup", "4", "tbsp"], ["mustard", "2", "tbsp"]),
    ins([1, "Form beef into 4 patties, slightly larger than buns, dimple center", 5], [2, "Season with salt and pepper", 1], [3, "Grill 4 min per side for medium, add cheese last minute", 8], [4, "Toast buns on grill 1 min", 1], [5, "Assemble with all fixings", 2]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "grill" }),

  r("Grilled Lemon Herb Chicken Breast", "Perfectly juicy grilled chicken with lemon and herbs", "grill", "chicken", "easy",
    4, 15, 12, 40, 2, 8, 0, 320,
    ing(["chicken breasts", "2", "lb", "butterflied to even thickness"], ["olive oil", "2", "tbsp"], ["lemon juice", "3", "tbsp"], ["lemon zest", "1", "tsp"], ["garlic", "3", "cloves", "minced"], ["fresh thyme", "1", "tbsp"], ["fresh oregano", "1", "tbsp"], ["salt", "1", "tsp"]),
    ins([1, "Marinate chicken in oil, lemon, garlic, herbs 10 min", 10], [2, "Grill over medium-high 5-6 min per side", 12], [3, "Let rest 5 min before slicing", 5]),
    tags("high-protein", "low-carb", "keto", "gluten-free"), { cuisineStyle: "mediterranean", cookingMethod: "grill" }),

  r("Grilled Teriyaki Salmon Fillets", "Sweet teriyaki glazed salmon on the grill", "grill", "fish", "easy",
    2, 10, 10, 40, 12, 14, 0, 480,
    ing(["salmon fillets", "2", "6oz"], ["soy sauce", "3", "tbsp"], ["mirin", "2", "tbsp"], ["honey", "1", "tbsp"], ["sesame oil", "1", "tsp"], ["garlic", "2", "cloves", "minced"], ["ginger", "1", "tsp", "grated"], ["sesame seeds", "1", "tsp"]),
    ins([1, "Whisk soy sauce, mirin, honey, sesame oil, garlic, ginger", 3], [2, "Marinate salmon 5 min", 5], [3, "Grill skin-side down 5 min, flip, baste with glaze, grill 4 min", 9], [4, "Garnish with sesame seeds", 1]),
    tags("high-protein"), { cuisineStyle: "asian", cookingMethod: "grill" }),

  r("Lamb Kofta Kebabs", "Spiced ground lamb kebabs with mint yogurt", "grill", "beef", "medium",
    4, 15, 10, 28, 6, 18, 1, 420,
    ing(["ground lamb", "1.5", "lb"], ["onion", "0.5", "whole", "grated"], ["garlic", "3", "cloves", "minced"], ["cumin", "2", "tsp"], ["coriander", "1", "tsp"], ["cinnamon", "0.5", "tsp"], ["parsley", "0.25", "cup", "chopped"], ["Greek yogurt", "0.5", "cup"], ["fresh mint", "2", "tbsp", "chopped"], ["lemon juice", "1", "tbsp"]),
    ins([1, "Mix lamb, onion, garlic, cumin, coriander, cinnamon, parsley", 5], [2, "Form into oval shapes around skewers", 5], [3, "Grill over medium-high 4-5 min per side", 10], [4, "Mix yogurt, mint, lemon for dipping sauce", 2]),
    tags("high-protein", "low-carb", "gluten-free"), { cuisineStyle: "mediterranean", cookingMethod: "grill" }),

  r("Grilled Portobello Mushroom Burgers", "Juicy grilled portobellos with goat cheese and balsamic", "grill", "none", "easy",
    4, 10, 10, 12, 22, 12, 3, 244,
    ing(["portobello caps", "4", "large", "stems removed"], ["goat cheese", "2", "oz", "crumbled"], ["balsamic vinegar", "2", "tbsp"], ["olive oil", "2", "tbsp"], ["garlic", "2", "cloves", "minced"], ["arugula", "1", "cup"], ["roasted red peppers", "0.25", "cup"], ["whole wheat buns", "4", "whole"]),
    ins([1, "Brush portobellos with oil, vinegar, garlic", 3], [2, "Grill gill-side up 4 min, flip, grill 4 min", 8], [3, "Top with goat cheese last minute to soften", 1], [4, "Serve on buns with arugula and peppers", 2]),
    tags("vegetarian"), { cuisineStyle: "american", cookingMethod: "grill" }),

  r("Hawaiian Chicken Kabobs", "Sweet and savory pineapple chicken kabobs", "grill", "chicken", "easy",
    4, 15, 10, 34, 18, 8, 2, 348,
    ing(["chicken breast", "1.5", "lb", "cubed"], ["pineapple chunks", "1.5", "cups"], ["red onion", "1", "whole", "chunks"], ["bell pepper", "2", "whole", "chunks"], ["soy sauce", "3", "tbsp"], ["pineapple juice", "2", "tbsp"], ["honey", "1", "tbsp"], ["garlic", "2", "cloves", "minced"], ["ginger", "1", "tsp"]),
    ins([1, "Marinate chicken in soy sauce, pineapple juice, honey, garlic, ginger 10 min", 10], [2, "Thread chicken, pineapple, onion, pepper on skewers", 5], [3, "Grill 4 min per side, basting with marinade", 8], [4, "Serve over rice if desired", 1]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "grill" }),

  // ===== MEAL-PREP (10) =====
  r("Chicken Burrito Bowl Meal Prep", "Batch-cooked chicken burrito bowls for the week", "meal-prep", "chicken", "easy",
    5, 15, 20, 40, 38, 12, 6, 480,
    ing(["chicken breast", "2", "lb", "seasoned"], ["rice", "2.5", "cups", "cooked"], ["black beans", "1", "can", "drained"], ["corn", "1", "cup"], ["salsa", "1", "cup"], ["lime", "2", "whole"], ["cumin", "2", "tsp"], ["chili powder", "1", "tsp"], ["cilantro", "0.25", "cup"]),
    ins([1, "Season chicken with cumin, chili powder, cook in skillet 6 min per side", 12], [2, "Slice chicken", 3], [3, "Divide rice, beans, corn, salsa into 5 containers", 5], [4, "Top with chicken, squeeze lime, add cilantro", 2]),
    tags("high-protein", "meal-prep"), { cuisineStyle: "mexican", cookingMethod: "stovetop" }),

  r("Greek Chicken and Quinoa Bowls", "Mediterranean meal prep with grilled chicken and quinoa", "meal-prep", "chicken", "easy",
    5, 15, 20, 38, 32, 14, 4, 430,
    ing(["chicken thighs", "2", "lb"], ["quinoa", "1.5", "cups", "dry"], ["cucumber", "1", "whole", "diced"], ["cherry tomatoes", "1", "cup", "halved"], ["kalamata olives", "0.25", "cup"], ["feta cheese", "4", "oz", "crumbled"], ["red onion", "0.5", "whole", "sliced"], ["lemon juice", "3", "tbsp"], ["olive oil", "2", "tbsp"], ["dried oregano", "2", "tsp"]),
    ins([1, "Cook quinoa per package directions", 15], [2, "Season chicken with oregano, grill or pan-sear 6 min per side", 12], [3, "Slice chicken", 2], [4, "Divide quinoa into 5 containers, top with chicken, veggies, feta", 5]),
    tags("high-protein", "meal-prep"), { cuisineStyle: "mediterranean", cookingMethod: "stovetop" }),

  r("Beef and Broccoli Meal Prep", "Savory beef and broccoli over brown rice", "meal-prep", "beef", "easy",
    5, 10, 15, 36, 34, 14, 3, 434,
    ing(["flank steak", "2", "lb", "sliced thin"], ["broccoli", "4", "cups", "florets"], ["brown rice", "2.5", "cups", "cooked"], ["soy sauce", "0.33", "cup"], ["brown sugar", "2", "tbsp"], ["cornstarch", "1", "tbsp"], ["garlic", "3", "cloves"], ["ginger", "1", "tbsp"], ["sesame oil", "1", "tsp"]),
    ins([1, "Sear beef in hot skillet in batches 2 min", 6], [2, "Steam broccoli until tender-crisp 3 min", 3], [3, "Mix soy sauce, brown sugar, cornstarch, pour over beef and cook 2 min", 2], [4, "Divide rice, beef, broccoli into 5 containers", 4]),
    tags("high-protein", "meal-prep"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Turkey Taco Bowl Prep", "Seasoned ground turkey taco bowls with all the fixings", "meal-prep", "turkey", "easy",
    5, 10, 15, 32, 30, 12, 5, 340,
    ing(["ground turkey", "2", "lb"], ["taco seasoning", "2", "tbsp"], ["rice", "2.5", "cups", "cooked"], ["black beans", "1", "can", "drained"], ["corn", "1", "cup"], ["shredded cheese", "0.5", "cup"], ["salsa", "1", "cup"], ["lettuce", "2", "cups", "shredded"]),
    ins([1, "Brown turkey with taco seasoning 8 min", 8], [2, "Cook rice", 12], [3, "Divide rice, beans, corn into 5 containers", 3], [4, "Top with turkey, cheese, salsa. Pack lettuce separately", 3]),
    tags("high-protein", "meal-prep"), { cuisineStyle: "mexican", cookingMethod: "stovetop" }),

  r("Salmon and Sweet Potato Prep", "Baked salmon with roasted sweet potatoes and green beans", "meal-prep", "fish", "easy",
    4, 10, 25, 38, 30, 14, 4, 418,
    ing(["salmon fillets", "4", "5oz"], ["sweet potatoes", "2", "large", "cubed"], ["green beans", "2", "cups", "trimmed"], ["olive oil", "2", "tbsp"], ["garlic powder", "1", "tsp"], ["paprika", "1", "tsp"], ["lemon", "1", "whole", "sliced"]),
    ins([1, "Toss sweet potatoes with oil, roast at 400°F 15 min", 15], [2, "Add green beans to sheet pan, place salmon alongside", 3], [3, "Top salmon with lemon, bake 12 min more", 12], [4, "Divide into 4 containers", 3]),
    tags("high-protein", "meal-prep", "gluten-free"), { cuisineStyle: "american", cookingMethod: "oven" }),

  r("Egg Fried Rice Meal Prep", "High-protein egg fried rice with vegetables", "meal-prep", "eggs", "easy",
    4, 10, 12, 22, 40, 10, 3, 354,
    ing(["eggs", "6", "large"], ["day-old rice", "4", "cups"], ["frozen peas and carrots", "1.5", "cups"], ["soy sauce", "3", "tbsp"], ["sesame oil", "1", "tbsp"], ["garlic", "3", "cloves"], ["green onions", "4", "stalks"], ["vegetable oil", "1", "tbsp"]),
    ins([1, "Scramble eggs in hot wok, break into pieces, set aside", 3], [2, "Stir-fry garlic and veggies 2 min", 2], [3, "Add rice, soy sauce, stir-fry on high 4 min", 4], [4, "Add back eggs, drizzle sesame oil, top with green onions", 1], [5, "Divide into 4 containers", 2]),
    tags("vegetarian", "meal-prep"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Chicken Sausage and Veggie Sheet Pan Prep", "One-pan chicken sausage with roasted vegetables", "meal-prep", "chicken", "easy",
    4, 10, 25, 30, 18, 14, 4, 398,
    ing(["chicken sausage", "4", "links", "sliced"], ["sweet potatoes", "1", "large", "cubed"], ["broccoli", "2", "cups", "florets"], ["bell peppers", "2", "whole", "chopped"], ["red onion", "1", "whole", "wedged"], ["olive oil", "2", "tbsp"], ["Italian seasoning", "1", "tbsp"], ["garlic powder", "1", "tsp"]),
    ins([1, "Toss all veggies and sausage with oil, seasoning", 5], [2, "Spread on sheet pan in single layer", 3], [3, "Roast at 400°F for 25 min, flipping halfway", 25], [4, "Divide into 4 containers", 3]),
    tags("high-protein", "meal-prep", "gluten-free"), { cuisineStyle: "american", cookingMethod: "oven" }),

  r("Lentil and Brown Rice Meal Prep", "Protein-rich lentils with brown rice and roasted vegetables", "meal-prep", "none", "easy",
    5, 10, 30, 18, 44, 6, 8, 298,
    ing(["green lentils", "1.5", "cups", "dry"], ["brown rice", "1.5", "cups", "dry"], ["carrots", "2", "whole", "diced"], ["onion", "1", "whole", "diced"], ["garlic", "3", "cloves"], ["cumin", "1", "tsp"], ["turmeric", "0.5", "tsp"], ["vegetable broth", "4", "cups"], ["lemon juice", "2", "tbsp"]),
    ins([1, "Cook brown rice per package directions", 20], [2, "Sauté onion and carrots 3 min, add garlic and spices", 4], [3, "Add lentils and broth, simmer 20 min until tender", 20], [4, "Stir in lemon juice", 1], [5, "Divide rice and lentils into 5 containers", 3]),
    tags("vegan", "vegetarian", "high-fiber", "meal-prep"), { cuisineStyle: "mediterranean", cookingMethod: "stovetop" }),

  r("Honey Garlic Chicken Thigh Prep", "Sticky honey garlic chicken thighs with jasmine rice", "meal-prep", "chicken", "easy",
    5, 10, 20, 36, 34, 10, 1, 390,
    ing(["chicken thighs", "2.5", "lb", "boneless skinless"], ["honey", "3", "tbsp"], ["soy sauce", "3", "tbsp"], ["garlic", "5", "cloves", "minced"], ["rice vinegar", "1", "tbsp"], ["sesame oil", "1", "tsp"], ["cornstarch", "1", "tsp"], ["jasmine rice", "2.5", "cups", "cooked"], ["steamed broccoli", "3", "cups"]),
    ins([1, "Sear chicken thighs 5 min per side", 10], [2, "Mix honey, soy sauce, garlic, vinegar, sesame oil, cornstarch", 2], [3, "Pour sauce over chicken, simmer 5 min until glazed", 5], [4, "Cook rice, steam broccoli", 15], [5, "Divide into 5 containers: rice, broccoli, chicken with sauce", 3]),
    tags("high-protein", "meal-prep"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Stuffed Bell Pepper Meal Prep", "Ground turkey and rice stuffed peppers", "meal-prep", "turkey", "medium",
    6, 15, 30, 28, 22, 10, 3, 330,
    ing(["bell peppers", "6", "large", "tops cut, seeded"], ["ground turkey", "1.5", "lb"], ["rice", "1.5", "cups", "cooked"], ["tomato sauce", "1", "cup"], ["onion", "1", "whole", "diced"], ["garlic", "3", "cloves"], ["Italian seasoning", "1", "tsp"], ["mozzarella", "0.5", "cup", "shredded"]),
    ins([1, "Brown turkey with onion, garlic, seasoning 6 min", 6], [2, "Mix with rice and half the tomato sauce", 3], [3, "Stuff peppers, place in baking dish, pour remaining sauce over", 5], [4, "Cover with foil, bake at 375°F 25 min", 25], [5, "Uncover, top with cheese, bake 5 min more", 5]),
    tags("high-protein", "meal-prep", "gluten-free"), { cuisineStyle: "american", cookingMethod: "oven" }),

  // ===== AIR-FRYER (10) =====
  r("Air Fryer Chicken Wings", "Crispy wings with no deep frying needed", "air-fryer", "chicken", "easy",
    4, 5, 25, 32, 2, 18, 0, 302,
    ing(["chicken wings", "2", "lb"], ["baking powder", "1", "tbsp"], ["garlic powder", "1", "tsp"], ["onion powder", "1", "tsp"], ["paprika", "1", "tsp"], ["salt", "1", "tsp"], ["hot sauce", "0.25", "cup", "optional"]),
    ins([1, "Pat wings dry, toss with baking powder and spices", 3], [2, "Arrange in air fryer basket in single layer", 2], [3, "Air fry at 400°F for 12 min, flip, cook 10 more min", 22], [4, "Toss in hot sauce if desired", 1]),
    tags("high-protein", "low-carb", "keto", "gluten-free"), { cuisineStyle: "american", cookingMethod: "air-fryer" }),

  r("Air Fryer Salmon Bites", "Crispy bite-sized salmon pieces with lemon dill", "air-fryer", "fish", "easy",
    2, 10, 10, 38, 6, 12, 0, 288,
    ing(["salmon fillet", "12", "oz", "cubed into 1-inch pieces"], ["olive oil", "1", "tbsp"], ["panko breadcrumbs", "3", "tbsp"], ["garlic powder", "0.5", "tsp"], ["lemon zest", "1", "tsp"], ["dill", "1", "tsp", "dried"], ["salt", "0.5", "tsp"]),
    ins([1, "Toss salmon cubes with oil", 2], [2, "Mix panko, garlic powder, lemon zest, dill, salt", 2], [3, "Coat salmon in panko mixture", 3], [4, "Air fry at 400°F for 8-10 min, shaking halfway", 10]),
    tags("high-protein", "low-carb"), { cuisineStyle: "american", cookingMethod: "air-fryer" }),

  r("Air Fryer Chicken Tenders", "Crunchy chicken tenders with honey mustard", "air-fryer", "chicken", "easy",
    4, 10, 12, 36, 18, 8, 1, 460,
    ing(["chicken tenderloins", "1.5", "lb"], ["panko breadcrumbs", "1", "cup"], ["parmesan", "0.25", "cup", "grated"], ["eggs", "2", "large", "beaten"], ["garlic powder", "1", "tsp"], ["paprika", "1", "tsp"], ["cooking spray", "1", "spray"], ["honey mustard", "0.25", "cup", "for dipping"]),
    ins([1, "Set up breading station: eggs then panko-parmesan-spice mix", 3], [2, "Dip tenders in egg, then breadcrumb mixture", 5], [3, "Spray with cooking spray, place in air fryer", 1], [4, "Air fry at 400°F for 10-12 min, flip halfway", 12]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "air-fryer" }),

  r("Air Fryer Crispy Tofu", "Extra-crispy tofu cubes perfect for bowls and stir fries", "air-fryer", "tofu", "easy",
    4, 10, 15, 16, 8, 10, 1, 280,
    ing(["extra-firm tofu", "14", "oz", "pressed and cubed"], ["cornstarch", "2", "tbsp"], ["soy sauce", "1", "tbsp"], ["sesame oil", "1", "tsp"], ["garlic powder", "0.5", "tsp"], ["onion powder", "0.5", "tsp"]),
    ins([1, "Press tofu 10 min, cube into 1-inch pieces", 10], [2, "Toss with soy sauce and sesame oil", 2], [3, "Coat in cornstarch and spices", 2], [4, "Air fry at 400°F for 12-15 min, shaking every 5 min", 15]),
    tags("vegan", "vegetarian", "gluten-free"), { cuisineStyle: "asian", cookingMethod: "air-fryer" }),

  r("Air Fryer Fish and Chips", "Crispy beer-battered cod with thick-cut fries", "air-fryer", "fish", "medium",
    2, 10, 20, 32, 38, 10, 3, 362,
    ing(["cod fillets", "2", "6oz"], ["russet potatoes", "2", "large", "cut into fries"], ["flour", "0.5", "cup"], ["egg", "1", "large"], ["panko", "0.75", "cup"], ["old bay seasoning", "1", "tsp"], ["olive oil spray", "1", "spray"], ["malt vinegar", "2", "tbsp"]),
    ins([1, "Cut potatoes into fries, toss with oil spray, air fry at 400°F 10 min", 10], [2, "Bread cod: flour, egg, panko with old bay", 5], [3, "Remove fries, add cod, air fry 10 min, flip halfway", 10], [4, "Return fries for last 5 min to crisp", 5]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "air-fryer" }),

  r("Air Fryer Brussels Sprouts", "Caramelized crispy brussels sprouts with balsamic", "air-fryer", "none", "easy",
    4, 5, 12, 4, 10, 6, 4, 110,
    ing(["brussels sprouts", "1", "lb", "halved"], ["olive oil", "1", "tbsp"], ["balsamic vinegar", "1", "tbsp"], ["garlic powder", "0.5", "tsp"], ["salt", "0.5", "tsp"], ["parmesan", "2", "tbsp", "grated"]),
    ins([1, "Toss halved sprouts with oil, garlic powder, salt", 3], [2, "Air fry at 375°F for 10-12 min, shaking halfway", 12], [3, "Drizzle with balsamic, top with parmesan", 1]),
    tags("vegetarian", "low-carb", "gluten-free"), { cuisineStyle: "american", cookingMethod: "air-fryer" }),

  r("Air Fryer Steak Bites", "Juicy garlic butter steak bites in minutes", "air-fryer", "beef", "easy",
    2, 5, 8, 40, 2, 16, 0, 304,
    ing(["sirloin steak", "1", "lb", "cubed 1-inch"], ["butter", "1", "tbsp", "melted"], ["garlic", "3", "cloves", "minced"], ["Worcestershire sauce", "1", "tbsp"], ["salt", "0.5", "tsp"], ["black pepper", "0.5", "tsp"], ["fresh thyme", "1", "tsp"]),
    ins([1, "Toss steak cubes with butter, garlic, Worcestershire, salt, pepper", 3], [2, "Spread in air fryer basket in single layer", 1], [3, "Air fry at 400°F for 6-8 min, shaking once", 8], [4, "Garnish with fresh thyme", 1]),
    tags("high-protein", "low-carb", "keto", "gluten-free"), { cuisineStyle: "american", cookingMethod: "air-fryer" }),

  r("Air Fryer Coconut Shrimp", "Tropical coconut-crusted shrimp with sweet chili dip", "air-fryer", "shrimp", "easy",
    4, 10, 10, 28, 16, 12, 2, 288,
    ing(["large shrimp", "1", "lb", "peeled and deveined"], ["shredded coconut", "0.5", "cup"], ["panko", "0.5", "cup"], ["egg whites", "2", "large"], ["flour", "0.25", "cup"], ["sweet chili sauce", "0.25", "cup", "for dipping"], ["salt", "0.25", "tsp"]),
    ins([1, "Set up breading: flour, egg whites, coconut-panko mix", 3], [2, "Bread shrimp: flour, egg, coconut-panko", 5], [3, "Spray with cooking spray", 1], [4, "Air fry at 400°F for 8-10 min, flip halfway", 10]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "air-fryer" }),

  r("Air Fryer Turkey Meatballs", "Juicy herbed turkey meatballs, perfect for meal prep", "air-fryer", "turkey", "easy",
    4, 10, 12, 30, 8, 10, 1, 278,
    ing(["ground turkey", "1.5", "lb"], ["egg", "1", "large"], ["breadcrumbs", "0.25", "cup"], ["parmesan", "2", "tbsp", "grated"], ["garlic", "2", "cloves", "minced"], ["Italian seasoning", "1", "tsp"], ["onion powder", "0.5", "tsp"], ["salt", "0.5", "tsp"]),
    ins([1, "Mix all ingredients, form into 20 meatballs", 5], [2, "Place in air fryer basket with space between", 2], [3, "Air fry at 375°F for 10-12 min, shaking halfway", 12]),
    tags("high-protein", "meal-prep"), { cuisineStyle: "italian", cookingMethod: "air-fryer" }),

  r("Air Fryer Sweet Potato Fries", "Crispy sweet potato fries with cinnamon or cajun seasoning", "air-fryer", "none", "easy",
    4, 10, 15, 2, 26, 4, 4, 164,
    ing(["sweet potatoes", "2", "large", "cut into thin fries"], ["olive oil", "1", "tbsp"], ["cornstarch", "1", "tbsp"], ["garlic powder", "0.5", "tsp"], ["smoked paprika", "0.5", "tsp"], ["salt", "0.5", "tsp"]),
    ins([1, "Soak fries in cold water 10 min, pat very dry", 10], [2, "Toss with oil and cornstarch, then spices", 3], [3, "Air fry at 380°F for 12-15 min, shaking every 5 min", 15]),
    tags("vegan", "vegetarian", "gluten-free"), { cuisineStyle: "american", cookingMethod: "air-fryer" }),

  // ===== QUICK (8, all under 15 min total) =====
  r("5-Minute Protein Scramble", "Quick high-protein egg scramble with cheese and veggies", "quick", "eggs", "easy",
    1, 2, 5, 30, 4, 18, 1, 340,
    ing(["eggs", "3", "large"], ["egg whites", "2", "large"], ["cheddar cheese", "1", "oz", "shredded"], ["spinach", "0.5", "cup"], ["cherry tomatoes", "4", "whole", "halved"], ["salt", "0.25", "tsp"], ["butter", "1", "tsp"]),
    ins([1, "Whisk eggs and egg whites", 1], [2, "Melt butter in skillet, add spinach 30 sec", 1], [3, "Pour in eggs, scramble with tomatoes 3 min", 3], [4, "Top with cheese, serve immediately", 1]),
    tags("high-protein", "low-carb", "keto", "vegetarian", "gluten-free"), { cuisineStyle: "american", cookingMethod: "stovetop" }),

  r("Quick Tuna Melt", "Open-faced tuna melt ready in 10 minutes", "quick", "fish", "easy",
    1, 5, 5, 32, 22, 14, 2, 362,
    ing(["canned tuna", "1", "can", "drained"], ["mayo", "1", "tbsp"], ["dijon mustard", "1", "tsp"], ["cheddar cheese", "1", "slice"], ["sourdough bread", "1", "slice", "toasted"], ["tomato", "2", "slices"], ["salt", "0.125", "tsp"]),
    ins([1, "Mix tuna, mayo, mustard, salt", 3], [2, "Pile on toasted bread, add tomato and cheese", 1], [3, "Broil 3-4 min until cheese melts", 4]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "oven" }),

  r("Microwave Chicken Quesadilla", "Crispy quesadilla in under 10 minutes", "quick", "chicken", "easy",
    1, 5, 5, 34, 24, 16, 2, 454,
    ing(["flour tortilla", "1", "large"], ["shredded rotisserie chicken", "4", "oz"], ["shredded cheese", "0.25", "cup"], ["salsa", "2", "tbsp"], ["sour cream", "1", "tbsp"]),
    ins([1, "Fill half the tortilla with chicken and cheese", 2], [2, "Fold and microwave 1 min until cheese melts", 1], [3, "Crisp in hot skillet 1 min per side if desired", 2], [4, "Serve with salsa and sour cream", 1]),
    tags("high-protein"), { cuisineStyle: "mexican", cookingMethod: "stovetop" }),

  r("Shrimp and Avocado Bowl", "No-cook shrimp bowl with avocado and lime", "quick", "shrimp", "easy",
    1, 10, 0, 30, 12, 16, 5, 320,
    ing(["cooked shrimp", "6", "oz"], ["avocado", "0.5", "whole", "diced"], ["cherry tomatoes", "6", "whole", "halved"], ["cucumber", "0.25", "cup", "diced"], ["lime juice", "1", "tbsp"], ["cilantro", "1", "tbsp"], ["olive oil", "1", "tsp"], ["everything seasoning", "0.5", "tsp"]),
    ins([1, "Combine shrimp, avocado, tomatoes, cucumber in bowl", 5], [2, "Drizzle with lime and olive oil", 1], [3, "Top with cilantro and seasoning", 1]),
    tags("high-protein", "low-carb", "gluten-free"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("Smoked Salmon Toast", "Everything bagel smoked salmon on cream cheese toast", "quick", "fish", "easy",
    1, 5, 3, 22, 18, 14, 2, 298,
    ing(["whole grain bread", "2", "slices"], ["smoked salmon", "3", "oz"], ["cream cheese", "2", "tbsp"], ["capers", "1", "tsp"], ["red onion", "1", "tbsp", "thinly sliced"], ["everything seasoning", "0.5", "tsp"], ["lemon", "1", "wedge"]),
    ins([1, "Toast bread", 3], [2, "Spread cream cheese on toast", 1], [3, "Layer smoked salmon, capers, red onion, squeeze lemon, sprinkle seasoning", 2]),
    tags("high-protein"), { cuisineStyle: "american", cookingMethod: "no-cook" }),

  r("Instant Ramen Upgrade", "Elevated instant ramen with egg and veggies", "quick", "eggs", "easy",
    1, 3, 8, 16, 42, 10, 2, 322,
    ing(["instant ramen", "1", "pack", "discard half the seasoning"], ["egg", "1", "large"], ["spinach", "0.5", "cup"], ["green onion", "1", "stalk", "sliced"], ["sesame oil", "0.5", "tsp"], ["sriracha", "1", "tsp"], ["frozen corn", "2", "tbsp"]),
    ins([1, "Cook ramen per package, using half the seasoning packet", 5], [2, "Add spinach and corn in last minute", 1], [3, "Crack egg into broth, cover 2 min for soft poach", 2], [4, "Top with green onion, sesame oil, sriracha", 1]),
    tags("quick"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("10-Minute Beef Tacos", "Quick ground beef tacos with fresh toppings", "quick", "beef", "easy",
    2, 3, 8, 28, 20, 14, 3, 330,
    ing(["ground beef", "0.5", "lb", "90% lean"], ["taco seasoning", "1", "tbsp"], ["corn tortillas", "4", "small"], ["shredded cheese", "0.25", "cup"], ["salsa", "0.25", "cup"], ["lettuce", "0.5", "cup", "shredded"], ["sour cream", "2", "tbsp"]),
    ins([1, "Brown beef, add taco seasoning and 2 tbsp water, cook 5 min", 5], [2, "Warm tortillas 30 sec each side", 2], [3, "Fill with beef, cheese, salsa, lettuce, sour cream", 2]),
    tags("high-protein"), { cuisineStyle: "mexican", cookingMethod: "stovetop" }),

  r("Caprese Salad with Chicken", "Quick caprese salad topped with sliced grilled chicken", "quick", "chicken", "easy",
    1, 8, 0, 36, 6, 16, 1, 316,
    ing(["grilled chicken breast", "5", "oz", "sliced"], ["fresh mozzarella", "2", "oz", "sliced"], ["tomato", "1", "large", "sliced"], ["fresh basil", "6", "leaves"], ["olive oil", "1", "tbsp"], ["balsamic glaze", "1", "tsp"], ["salt", "0.25", "tsp"]),
    ins([1, "Arrange tomato and mozzarella slices alternating on plate", 3], [2, "Top with sliced chicken and basil leaves", 2], [3, "Drizzle with olive oil and balsamic glaze, season", 1]),
    tags("high-protein", "low-carb", "gluten-free"), { cuisineStyle: "italian", cookingMethod: "no-cook" }),

  // ===== VEGETARIAN (7) =====
  r("Chickpea Tikka Masala", "Creamy spiced chickpeas in tomato-based masala sauce", "vegetarian", "none", "medium",
    4, 10, 20, 14, 36, 12, 8, 316,
    ing(["chickpeas", "2", "cans", "drained"], ["crushed tomatoes", "1", "can", "14oz"], ["coconut milk", "0.5", "cup"], ["onion", "1", "whole", "diced"], ["garlic", "4", "cloves"], ["ginger", "1", "tbsp", "grated"], ["garam masala", "2", "tsp"], ["turmeric", "1", "tsp"], ["cumin", "1", "tsp"], ["cilantro", "0.25", "cup"]),
    ins([1, "Sauté onion 4 min, add garlic and ginger 1 min", 5], [2, "Add spices, cook 30 sec until fragrant", 1], [3, "Add tomatoes, coconut milk, simmer 10 min", 10], [4, "Add chickpeas, cook 5 min", 5], [5, "Top with cilantro, serve over rice", 1]),
    tags("vegan", "vegetarian", "gluten-free", "high-fiber"), { cuisineStyle: "indian", cookingMethod: "stovetop" }),

  r("Black Bean and Quinoa Stuffed Sweet Potatoes", "Loaded sweet potatoes with seasoned black beans", "vegetarian", "none", "easy",
    4, 10, 30, 16, 48, 6, 10, 310,
    ing(["sweet potatoes", "4", "medium"], ["black beans", "1", "can", "drained"], ["quinoa", "0.5", "cup", "cooked"], ["corn", "0.5", "cup"], ["cumin", "1", "tsp"], ["chili powder", "0.5", "tsp"], ["lime juice", "1", "tbsp"], ["avocado", "1", "whole", "sliced"], ["cilantro", "2", "tbsp"]),
    ins([1, "Bake sweet potatoes at 400°F for 25-30 min until tender", 30], [2, "Heat beans with corn, cumin, chili powder 3 min", 3], [3, "Mix in quinoa and lime juice", 1], [4, "Split potatoes, stuff with bean mixture, top with avocado and cilantro", 3]),
    tags("vegan", "vegetarian", "gluten-free", "high-fiber"), { cuisineStyle: "mexican", cookingMethod: "oven" }),

  r("Eggplant Parmesan", "Breaded and baked eggplant with marinara and melted mozzarella", "vegetarian", "eggs", "medium",
    4, 15, 25, 18, 28, 16, 5, 372,
    ing(["eggplant", "2", "large", "sliced 1/2 inch"], ["marinara sauce", "2", "cups"], ["mozzarella", "1.5", "cups", "shredded"], ["panko breadcrumbs", "1", "cup"], ["parmesan", "0.5", "cup", "grated"], ["eggs", "2", "large", "beaten"], ["flour", "0.5", "cup"], ["basil", "0.25", "cup", "fresh"]),
    ins([1, "Bread eggplant: flour, egg, panko-parmesan", 8], [2, "Bake breaded slices at 400°F for 15 min, flip halfway", 15], [3, "Layer in baking dish: sauce, eggplant, mozzarella, repeat", 3], [4, "Bake 10 min until bubbly", 10], [5, "Top with fresh basil", 1]),
    tags("vegetarian"), { cuisineStyle: "italian", cookingMethod: "oven" }),

  r("Mushroom and Spinach Risotto", "Creamy Arborio rice with mushrooms and parmesan", "vegetarian", "none", "hard",
    4, 10, 25, 12, 38, 10, 2, 338,
    ing(["arborio rice", "1.5", "cups"], ["mushrooms", "8", "oz", "sliced"], ["spinach", "3", "cups"], ["vegetable broth", "5", "cups", "warm"], ["onion", "1", "whole", "diced"], ["garlic", "3", "cloves"], ["white wine", "0.5", "cup"], ["parmesan", "0.5", "cup", "grated"], ["butter", "2", "tbsp"]),
    ins([1, "Sauté mushrooms 5 min, set aside", 5], [2, "Sauté onion 3 min, add garlic, add rice, toast 1 min", 4], [3, "Add wine, stir until absorbed", 2], [4, "Add broth 1 ladle at a time, stirring, 18 min total", 18], [5, "Fold in mushrooms, spinach, butter, parmesan", 2]),
    tags("vegetarian", "gluten-free"), { cuisineStyle: "italian", cookingMethod: "stovetop" }),

  r("Vegetarian Pad Thai", "Rice noodles with tofu, egg, peanuts and tamarind", "vegetarian", "tofu", "medium",
    4, 15, 10, 18, 42, 12, 3, 396,
    ing(["rice noodles", "8", "oz"], ["firm tofu", "8", "oz", "cubed"], ["eggs", "2", "large"], ["tamarind paste", "2", "tbsp"], ["fish sauce", "2", "tbsp", "or soy sauce for vegan"], ["brown sugar", "1.5", "tbsp"], ["bean sprouts", "1", "cup"], ["peanuts", "0.25", "cup", "crushed"], ["lime", "2", "whole"], ["green onions", "3", "stalks"]),
    ins([1, "Soak noodles in hot water 8 min", 8], [2, "Fry tofu until golden 5 min", 5], [3, "Scramble eggs, set aside", 2], [4, "Mix tamarind, fish sauce, sugar for sauce", 1], [5, "Toss noodles, tofu, eggs with sauce, top with peanuts, bean sprouts, lime", 3]),
    tags("vegetarian", "high-protein"), { cuisineStyle: "asian", cookingMethod: "stovetop" }),

  r("Lentil Bolognese", "Hearty plant-based bolognese with green lentils", "vegetarian", "none", "easy",
    6, 10, 25, 16, 36, 4, 8, 256,
    ing(["green lentils", "1.5", "cups", "dry"], ["crushed tomatoes", "1", "can", "28oz"], ["onion", "1", "whole", "diced"], ["carrots", "2", "whole", "diced fine"], ["celery", "2", "stalks", "diced fine"], ["garlic", "4", "cloves"], ["tomato paste", "2", "tbsp"], ["Italian seasoning", "1", "tbsp"], ["spaghetti", "1", "lb"], ["nutritional yeast", "2", "tbsp"]),
    ins([1, "Sauté onion, carrots, celery 5 min", 5], [2, "Add garlic, tomato paste, Italian seasoning 1 min", 1], [3, "Add lentils, tomatoes, 2 cups water, simmer 20 min", 20], [4, "Cook spaghetti, serve sauce over pasta", 10], [5, "Top with nutritional yeast", 1]),
    tags("vegan", "vegetarian", "high-fiber"), { cuisineStyle: "italian", cookingMethod: "stovetop" }),

  r("Spicy Cauliflower Tacos", "Roasted cauliflower with chipotle crema in corn tortillas", "vegetarian", "none", "easy",
    4, 10, 20, 8, 28, 10, 5, 314,
    ing(["cauliflower", "1", "head", "cut into small florets"], ["olive oil", "2", "tbsp"], ["cumin", "1", "tsp"], ["chili powder", "1", "tsp"], ["smoked paprika", "0.5", "tsp"], ["corn tortillas", "8", "small"], ["sour cream", "0.25", "cup"], ["chipotle in adobo", "1", "tsp"], ["lime juice", "1", "tbsp"], ["cabbage", "1", "cup", "shredded"], ["cilantro", "0.25", "cup"]),
    ins([1, "Toss cauliflower with oil, cumin, chili powder, paprika", 3], [2, "Roast at 425°F for 20 min until charred", 20], [3, "Mix sour cream, chipotle, lime for crema", 2], [4, "Warm tortillas, fill with cauliflower, cabbage, crema, cilantro", 3]),
    tags("vegetarian", "gluten-free"), { cuisineStyle: "mexican", cookingMethod: "oven" }),
];

async function main() {
  console.log(`Inserting ${recipes.length} recipes...`);
  let inserted = 0;
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i] as any;
    // Ensure unique slug
    recipe.slug = recipe.slug + '-' + recipe.id.slice(0, 6);
    try {
      await prisma.recipe.create({ data: recipe });
      inserted++;
    } catch (e: any) {
      console.error(`  #${i + 1} "${recipe.title}" FAILED:`, e.message?.slice(0, 150));
    }
  }
  console.log(`Done! Inserted ${inserted}/${recipes.length} recipes.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
