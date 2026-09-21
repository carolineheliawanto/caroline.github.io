// Pure calorie / BMR / TDEE math. No side effects, no framework imports.

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const KCAL_PER_KG = 7700;

export const MIN_CALORIES = {
  male: 1500,
  female: 1200,
} as const;

// Cap weight-loss/gain pace at 1% of body weight per week.
export const MAX_PACE_PERCENT_OF_BODYWEIGHT = 0.01;

export interface Macros {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface CalorieTargetInput {
  gender: Gender;
  birthDate: Date;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  /** Desired weekly pace in kg/week, always a positive number. Direction is inferred from current vs target weight. */
  goalPaceKg: number;
  /** Reference date to compute age against; defaults to now. */
  now?: Date;
}

export interface CalorieTargetResult {
  age: number;
  bmr: number;
  tdee: number;
  /** The pace actually used after safety capping, kg/week. Always >= 0. */
  appliedPaceKg: number;
  /** True if the requested pace had to be reduced to respect guardrails. */
  paceWasCapped: boolean;
  /** "loss" | "gain" | "maintain" */
  direction: 'loss' | 'gain' | 'maintain';
  dailyCalorieTarget: number;
  /** True if dailyCalorieTarget was raised to respect the minimum-calorie floor. */
  targetWasFloored: boolean;
  macros: Macros;
  currentBmi: number;
  targetBmi: number;
  targetBmiWarning: boolean;
  estimatedWeeksToGoal: number | null;
  estimatedDate: Date | null;
  guardrailMessage: string | null;
}

export function calculateAge(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/** Mifflin-St Jeor equation. */
export function calculateBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function calculateMacros(dailyCalorieTarget: number): Macros {
  // 30% protein, 40% carbs, 30% fat by default.
  const proteinCalories = dailyCalorieTarget * 0.3;
  const carbsCalories = dailyCalorieTarget * 0.4;
  const fatCalories = dailyCalorieTarget * 0.3;
  return {
    proteinG: Math.round(proteinCalories / 4),
    carbsG: Math.round(carbsCalories / 4),
    fatG: Math.round(fatCalories / 9),
  };
}

/**
 * Full calorie target calculation with safety guardrails:
 * - Weekly pace is capped at 1% of current bodyweight per week.
 * - Daily target never drops below 1500 kcal (men) / 1200 kcal (women); if the
 *   requested pace would require it, the target is floored and the effective
 *   pace/timeline is recalculated from the floored target.
 */
export function calculateCalorieTarget(input: CalorieTargetInput): CalorieTargetResult {
  const now = input.now ?? new Date();
  const age = calculateAge(input.birthDate, now);
  const bmr = calculateBMR(input.gender, input.currentWeightKg, input.heightCm, age);
  const tdee = calculateTDEE(bmr, input.activityLevel);

  const weightDeltaKg = input.targetWeightKg - input.currentWeightKg;
  const direction: 'loss' | 'gain' | 'maintain' =
    Math.abs(weightDeltaKg) < 0.05 ? 'maintain' : weightDeltaKg < 0 ? 'loss' : 'gain';

  const maxPaceKg = input.currentWeightKg * MAX_PACE_PERCENT_OF_BODYWEIGHT;
  const requestedPaceKg = Math.max(0, input.goalPaceKg);
  let appliedPaceKg = direction === 'maintain' ? 0 : Math.min(requestedPaceKg, maxPaceKg);
  const paceWasCapped = direction !== 'maintain' && requestedPaceKg > maxPaceKg;

  const dailyDeltaFromPace = (appliedPaceKg * KCAL_PER_KG) / 7;
  let dailyCalorieTarget =
    direction === 'loss'
      ? tdee - dailyDeltaFromPace
      : direction === 'gain'
      ? tdee + dailyDeltaFromPace
      : tdee;

  const minCalories = MIN_CALORIES[input.gender];
  let targetWasFloored = false;
  let guardrailMessage: string | null = null;

  if (direction === 'loss' && dailyCalorieTarget < minCalories) {
    dailyCalorieTarget = minCalories;
    targetWasFloored = true;
    // Recompute the effective pace implied by the floored target so the
    // estimated timeline stays consistent with what we actually show.
    const effectiveDailyDeficit = tdee - dailyCalorieTarget;
    appliedPaceKg = Math.max(0, (effectiveDailyDeficit * 7) / KCAL_PER_KG);
  } else if (paceWasCapped) {
    guardrailMessage = `Your requested pace exceeds the safe maximum of 1% of body weight per week (${maxPaceKg.toFixed(
      2
    )} kg/week). We've capped it to keep this sustainable.`;
  }

  if (targetWasFloored) {
    guardrailMessage = `To keep your intake safe, your daily target is capped at ${minCalories} kcal. Your timeline has been adjusted accordingly.`;
  }

  dailyCalorieTarget = Math.round(dailyCalorieTarget);

  const macros = calculateMacros(dailyCalorieTarget);
  const currentBmi = calculateBMI(input.currentWeightKg, input.heightCm);
  const targetBmi = calculateBMI(input.targetWeightKg, input.heightCm);
  const targetBmiWarning = targetBmi < 18.5;

  let estimatedWeeksToGoal: number | null = null;
  let estimatedDate: Date | null = null;
  if (direction !== 'maintain' && appliedPaceKg > 0) {
    estimatedWeeksToGoal = Math.abs(weightDeltaKg) / appliedPaceKg;
    estimatedDate = new Date(now);
    estimatedDate.setDate(estimatedDate.getDate() + Math.round(estimatedWeeksToGoal * 7));
  }

  return {
    age,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    appliedPaceKg,
    paceWasCapped,
    direction,
    dailyCalorieTarget,
    targetWasFloored,
    macros,
    currentBmi: Math.round(currentBmi * 10) / 10,
    targetBmi: Math.round(targetBmi * 10) / 10,
    targetBmiWarning,
    estimatedWeeksToGoal,
    estimatedDate,
    guardrailMessage,
  };
}

// --- Unit conversions ---

export function kgToLb(kg: number): number {
  return kg * 2.20462262;
}

export function lbToKg(lb: number): number {
  return lb / 2.20462262;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}
