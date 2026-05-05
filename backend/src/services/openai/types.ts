export interface UserContext {
  preferences?: string;
  inventorySummary?: string;
  healthGoals?: string;
  krogerStore?: string;
  remainingMacros?: { calories: number; protein: number; carbs: number; fat: number };
  todayMeals?: Array<{ id: string; mealType: string; mealName: string; calories: number; protein: number }>;
  householdSize?: number;
}

export interface ChatOrchestrationResult {
  content: string;
  toolCalls: Array<{
    name: string;
    args: Record<string, any>;
    result: any;
  }>;
  metadata: Record<string, any>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}
