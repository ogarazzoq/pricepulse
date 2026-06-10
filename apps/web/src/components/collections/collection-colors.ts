// Predefined collection colors
export const COLLECTION_COLORS = [
  { name: 'Blue', value: '#3b82f6', light: '#dbeafe' },
  { name: 'Purple', value: '#a855f7', light: '#f3e8ff' },
  { name: 'Pink', value: '#ec4899', light: '#fce7f3' },
  { name: 'Red', value: '#ef4444', light: '#fee2e2' },
  { name: 'Orange', value: '#f97316', light: '#ffedd5' },
  { name: 'Yellow', value: '#eab308', light: '#fef9c3' },
  { name: 'Green', value: '#22c55e', light: '#dcfce7' },
  { name: 'Teal', value: '#14b8a6', light: '#ccfbf1' },
  { name: 'Cyan', value: '#06b6d4', light: '#cffafe' },
  { name: 'Indigo', value: '#6366f1', light: '#e0e7ff' },
  { name: 'Gray', value: '#6b7280', light: '#f3f4f6' },
  { name: 'Slate', value: '#64748b', light: '#f1f5f9' },
] as const;

export type CollectionColor = typeof COLLECTION_COLORS[number];
