export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ItemSource = 'ai' | 'manual';
export type Confidence = 'low' | 'medium' | 'high';

export interface FoodItemDTO {
  id: string;
  name: string;
  portion: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: Confidence | null;
  source: ItemSource;
}

export interface FoodLogDTO {
  id: string;
  date: string;
  mealType: MealType;
  photoUrl: string | null;
  notes: string | null;
  items: FoodItemDTO[];
}

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
