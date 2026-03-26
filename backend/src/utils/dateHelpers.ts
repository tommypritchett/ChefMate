/**
 * Date/Timezone Utilities
 *
 * All dates are stored in UTC in the database.
 * These helpers ensure consistent date handling across the application.
 */

/**
 * Converts a date string (YYYY-MM-DD) to UTC midnight
 * This ensures dates are stored consistently regardless of user timezone
 */
export function toUTCMidnight(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Converts a Date object to UTC midnight
 */
export function setUTCMidnight(date: Date): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Gets today's date at UTC midnight
 */
export function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Formats a Date to YYYY-MM-DD in UTC
 */
export function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date parameter from request (handles both Date objects and strings)
 * Returns UTC midnight
 */
export function parseDateParam(dateParam: string | Date | undefined): Date | null {
  if (!dateParam) return null;

  if (dateParam instanceof Date) {
    return setUTCMidnight(dateParam);
  }

  if (typeof dateParam === 'string') {
    // Handle ISO string format (e.g., "2024-03-25T00:00:00.000Z")
    if (dateParam.includes('T')) {
      const date = new Date(dateParam);
      return setUTCMidnight(date);
    }

    // Handle simple date format (e.g., "2024-03-25")
    return toUTCMidnight(dateParam);
  }

  return null;
}

/**
 * Calculates expiry date from storage location and category
 */
export function calculateExpiryDate(
  storageLocation: string,
  category?: string,
  purchasedAt?: Date
): Date {
  const baseDate = purchasedAt || new Date();
  const days = getShelfLifeDays(storageLocation, category);

  const expiryDate = new Date(baseDate);
  expiryDate.setUTCDate(expiryDate.getUTCDate() + days);
  return setUTCMidnight(expiryDate);
}

/**
 * Gets shelf life in days based on storage location and category
 */
function getShelfLifeDays(storageLocation: string, category?: string): number {
  const loc = storageLocation.toLowerCase();

  if (loc === 'freezer') return 120; // 4 months

  // Category-specific expiry for fridge/pantry
  const CATEGORY_EXPIRY_DAYS: Record<string, number> = {
    produce: 7,
    meat: 3,
    dairy: 7,
    seafood: 2,
    'deli-meat': 5,
    bread: 5,
    condiments: 90,
    pantry: 365,
  };

  if (category && CATEGORY_EXPIRY_DAYS[category.toLowerCase()]) {
    return CATEGORY_EXPIRY_DAYS[category.toLowerCase()];
  }

  // Default for pantry/fridge
  return loc === 'pantry' ? 90 : 7;
}
