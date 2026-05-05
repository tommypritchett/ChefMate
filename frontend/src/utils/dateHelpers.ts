// Shared date utility functions

/**
 * Get week dates (Sun–Sat) as YYYY-MM-DD strings for a given date string.
 * Used by health-goals for the nutrition calendar.
 */
export function getWeekDateStrings(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayOfWeek = dt.getDay();
  const start = new Date(dt);
  start.setDate(start.getDate() - dayOfWeek);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(dd.getDate() + i);
    const yr = dd.getFullYear();
    const mo = String(dd.getMonth() + 1).padStart(2, '0');
    const day = String(dd.getDate()).padStart(2, '0');
    dates.push(`${yr}-${mo}-${day}`);
  }
  return dates;
}

/**
 * Get week dates (Mon–Sun) as Date objects for a given week offset from today.
 * Used by meal-plan for the weekly planner view.
 */
export function getWeekDateObjects(offset = 0): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
