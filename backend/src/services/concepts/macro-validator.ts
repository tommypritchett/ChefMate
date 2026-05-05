export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

const GENERAL_LIMITS = {
  minCalories: 100,
  maxCalories: 1500,
  minProtein: 0,
  minCarbs: 0,
  minFat: 0,
};

const VARIANT_RULES: Record<string, (n: NutritionData) => string[]> = {
  keto: (n) => {
    const warnings: string[] = [];
    if (n.carbs > 20) warnings.push(`Keto variant has ${n.carbs}g carbs (max 20g)`);
    if (n.fat < 15) warnings.push(`Keto variant has only ${n.fat}g fat (should be higher)`);
    return warnings;
  },
  'high-protein': (n) => {
    const warnings: string[] = [];
    if (n.protein < 35) warnings.push(`High-protein variant has only ${n.protein}g protein (min 35g)`);
    return warnings;
  },
  'low-carb': (n) => {
    const warnings: string[] = [];
    if (n.carbs > 30) warnings.push(`Low-carb variant has ${n.carbs}g carbs (max 30g)`);
    return warnings;
  },
  vegan: (n) => {
    const warnings: string[] = [];
    if (n.protein < 10) warnings.push(`Vegan variant has only ${n.protein}g protein (aim for 10g+)`);
    return warnings;
  },
};

export function validateMacros(
  nutrition: NutritionData,
  variantType: string,
): ValidationResult {
  const warnings: string[] = [];

  // General bounds
  if (nutrition.calories < GENERAL_LIMITS.minCalories) {
    warnings.push(`Calories too low: ${nutrition.calories} (min ${GENERAL_LIMITS.minCalories})`);
  }
  if (nutrition.calories > GENERAL_LIMITS.maxCalories) {
    warnings.push(`Calories too high: ${nutrition.calories} (max ${GENERAL_LIMITS.maxCalories})`);
  }
  if (nutrition.protein < GENERAL_LIMITS.minProtein) {
    warnings.push(`Protein cannot be negative: ${nutrition.protein}`);
  }
  if (nutrition.carbs < GENERAL_LIMITS.minCarbs) {
    warnings.push(`Carbs cannot be negative: ${nutrition.carbs}`);
  }
  if (nutrition.fat < GENERAL_LIMITS.minFat) {
    warnings.push(`Fat cannot be negative: ${nutrition.fat}`);
  }

  // Variant-specific rules
  const variantCheck = VARIANT_RULES[variantType];
  if (variantCheck) {
    warnings.push(...variantCheck(nutrition));
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
