// Barrel re-export — all OpenAI service logic lives in ./openai/
export { chatOrchestrate, chatOrchestrateStream } from './openai/orchestrate';
export { generateRecipe, chatWithAssistant, generateInventoryBasedSuggestions, detectFoodItems } from './openai/legacy';
