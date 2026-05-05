import { searchRecipes, getRecipeDetail, createCustomRecipe } from './recipe-tools';
import { getInventory, parseNaturalInventoryInput, bulkAddInventory } from './inventory-tools';
import { suggestMeals, getMealPlan, createMealPlan, addMealToPlan, scheduleMealPrep } from './meal-plan-tools';
import { getTodayMeals, logMeal, updateMealTool, deleteMealTool, getNutritionSummary } from './meal-log-tools';
import {
  generateShoppingList,
  manageShoppingList,
  compareRecipeIngredients,
  addMissingToShoppingList,
  generateSmartShoppingList,
  estimateRecipeCost,
  getSaleItems,
  krogerProductSearch,
} from './shopping-tools';

export { toolDefinitions } from './tool-definitions';

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  userId: string,
  clientDate?: string
): Promise<{ result: any; metadata?: Record<string, any> }> {
  switch (toolName) {
    case 'search_recipes':
      return searchRecipes(args, userId);
    case 'get_inventory':
      return getInventory(args, userId);
    case 'suggest_meals':
      return suggestMeals(args, userId);
    case 'get_meal_plan':
      return getMealPlan(args, userId);
    case 'create_meal_plan':
      return createMealPlan(args, userId);
    case 'add_meal_to_plan':
      return addMealToPlan(args, userId);
    case 'generate_shopping_list':
      return generateShoppingList(args, userId);
    case 'manage_shopping_list':
      return manageShoppingList(args, userId);
    case 'get_today_meals':
      return getTodayMeals(userId);
    case 'log_meal':
      return logMeal(args, userId);
    case 'update_meal':
      return updateMealTool(args, userId);
    case 'delete_meal':
      return deleteMealTool(args, userId);
    case 'get_recipe_detail':
      return getRecipeDetail(args, userId);
    case 'compare_recipe_ingredients':
      return compareRecipeIngredients(args, userId);
    case 'add_missing_to_shopping_list':
      return addMissingToShoppingList(args, userId);
    case 'generate_smart_shopping_list':
      return generateSmartShoppingList(args, userId);
    case 'parse_natural_inventory_input':
      return parseNaturalInventoryInput(args, userId);
    case 'bulk_add_inventory':
      return bulkAddInventory(args, userId);
    case 'estimate_recipe_cost':
      return estimateRecipeCost(args, userId);
    case 'get_sale_items':
      return getSaleItems(args, userId);
    case 'get_nutrition_summary':
      return getNutritionSummary(args, userId, clientDate);
    case 'kroger_product_search':
      return krogerProductSearch(args, userId);
    case 'create_custom_recipe':
      return createCustomRecipe(args, userId);
    case 'schedule_meal_prep':
      return scheduleMealPrep(args, userId);
    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}
