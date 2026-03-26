/**
 * Safe JSON parsing utilities
 */

/**
 * Safely parses JSON with error handling
 * @param jsonString - The JSON string to parse
 * @param defaultValue - Value to return if parsing fails
 * @param fieldName - Name of the field for logging purposes
 * @returns Parsed object or default value
 */
export function safeJsonParse<T = any>(
  jsonString: string | null | undefined,
  defaultValue: T,
  fieldName: string = 'JSON'
): T {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error(`Failed to parse ${fieldName}:`, error);
    return defaultValue;
  }
}

/**
 * Safely parses JSON and throws an error if parsing fails
 * Use this when you need to know that parsing failed
 */
export function safeJsonParseStrict<T = any>(
  jsonString: string | null | undefined,
  fieldName: string = 'JSON'
): T {
  if (!jsonString) {
    throw new Error(`${fieldName} is null or undefined`);
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error(`Failed to parse ${fieldName}:`, error);
    throw new Error(`Invalid ${fieldName} format`);
  }
}

/**
 * Safely stringifies JSON
 */
export function safeJsonStringify(value: any, defaultValue: string = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Failed to stringify JSON:', error);
    return defaultValue;
  }
}
