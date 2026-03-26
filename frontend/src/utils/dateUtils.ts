/**
 * Formats a Date object to YYYY-MM-DD string using LOCAL date components.
 *
 * IMPORTANT: Do NOT use date.toISOString().split('T')[0] as it uses UTC,
 * which causes the wrong date for users in timezones ahead of UTC.
 *
 * @example
 * // User in Tokyo (UTC+9) at midnight March 26
 * const date = new Date('2026-03-26T00:00:00+09:00'); // Midnight local time
 *
 * // WRONG (uses UTC):
 * date.toISOString().split('T')[0]; // "2026-03-25" ❌ (previous day in UTC)
 *
 * // CORRECT (uses local):
 * formatLocalDate(date); // "2026-03-26" ✅ (correct local date)
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date as YYYY-MM-DD string in user's LOCAL timezone.
 */
export function getTodayLocal(): string {
  return formatLocalDate(new Date());
}
