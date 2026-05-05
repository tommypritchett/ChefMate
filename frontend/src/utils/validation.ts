// Shared validation helpers used across inventory, shopping, and meal-plan

export function validateQuantity(value: string): string {
  if (!value.trim()) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num <= 0) return 'Quantity must be greater than 0';
  if (num > 10000) return 'Quantity seems too high (max 10000)';
  return '';
}
