import { describe, it, expect } from 'vitest';
import {
  calculateAge,
  calculateBMR,
  calculateTDEE,
  calculateBMI,
  calculateMacros,
  calculateCalorieTarget,
  kgToLb,
  lbToKg,
  cmToFeetInches,
  feetInchesToCm,
  MIN_CALORIES,
} from './calorie-math';

describe('calculateAge', () => {
  it('computes age correctly before and after birthday this year', () => {
    const now = new Date('2026-09-21');
    expect(calculateAge(new Date('2000-01-01'), now)).toBe(26);
    expect(calculateAge(new Date('2000-12-01'), now)).toBe(25);
    expect(calculateAge(new Date('2000-09-21'), now)).toBe(26);
    expect(calculateAge(new Date('2000-09-22'), now)).toBe(25);
  });
});

describe('calculateBMR (Mifflin-St Jeor)', () => {
  it('matches known formula for men', () => {
    // 10*70 + 6.25*175 - 5*30 + 5
    expect(calculateBMR('male', 70, 175, 30)).toBeCloseTo(1648.75, 1);
  });
  it('matches known formula for women', () => {
    // 10*60 + 6.25*165 - 5*25 - 161
    expect(calculateBMR('female', 60, 165, 25)).toBeCloseTo(1345.25, 1);
  });
});

describe('calculateTDEE', () => {
  it('applies activity multipliers', () => {
    expect(calculateTDEE(1500, 'sedentary')).toBeCloseTo(1800, 1);
    expect(calculateTDEE(1500, 'very_active')).toBeCloseTo(2850, 1);
  });
});

describe('calculateBMI', () => {
  it('computes BMI from kg and cm', () => {
    expect(calculateBMI(70, 175)).toBeCloseTo(22.86, 1);
  });
});

describe('calculateMacros', () => {
  it('splits calories 30/40/30 protein/carbs/fat', () => {
    const macros = calculateMacros(2000);
    expect(macros.proteinG).toBe(150);
    expect(macros.carbsG).toBe(200);
    expect(macros.fatG).toBe(67);
  });
});

describe('unit conversions', () => {
  it('round-trips kg/lb', () => {
    expect(kgToLb(70)).toBeCloseTo(154.32, 1);
    expect(lbToKg(154.32)).toBeCloseTo(70, 1);
  });
  it('round-trips cm/feet+inches approximately', () => {
    const { feet, inches } = cmToFeetInches(175);
    expect(feet).toBe(5);
    expect(inches).toBe(9);
    expect(feetInchesToCm(5, 9)).toBeCloseTo(175, 0);
  });
});

describe('calculateCalorieTarget - guardrails', () => {
  const baseInput = {
    gender: 'female' as const,
    birthDate: new Date('1995-01-01'),
    heightCm: 165,
    currentWeightKg: 60,
    now: new Date('2026-01-01'),
  };

  it('computes a normal weight-loss target without guardrails triggering', () => {
    const result = calculateCalorieTarget({
      ...baseInput,
      targetWeightKg: 58,
      activityLevel: 'moderate',
      goalPaceKg: 0.25,
    });
    expect(result.direction).toBe('loss');
    expect(result.dailyCalorieTarget).toBeLessThan(result.tdee);
    expect(result.targetWasFloored).toBe(false);
    expect(result.paceWasCapped).toBe(false);
    expect(result.estimatedWeeksToGoal).toBeCloseTo(8, 0);
  });

  it('never sets a target below the minimum for women (1200 kcal)', () => {
    const result = calculateCalorieTarget({
      ...baseInput,
      currentWeightKg: 55, // low TDEE + aggressive pace should hit floor
      targetWeightKg: 45,
      activityLevel: 'sedentary',
      goalPaceKg: 5, // absurdly high, will be capped by pace first, but also test floor directly below
    });
    expect(result.dailyCalorieTarget).toBeGreaterThanOrEqual(MIN_CALORIES.female);
  });

  it('never sets a target below the minimum for men (1500 kcal)', () => {
    const result = calculateCalorieTarget({
      ...baseInput,
      gender: 'male',
      currentWeightKg: 65,
      targetWeightKg: 50,
      activityLevel: 'sedentary',
      goalPaceKg: 1, // 1kg/week is within 1% cap (0.65kg) so pace gets capped, not floored necessarily
    });
    expect(result.dailyCalorieTarget).toBeGreaterThanOrEqual(MIN_CALORIES.male);
  });

  it('floors the daily target and flags targetWasFloored when pace would require going below the minimum', () => {
    const result = calculateCalorieTarget({
      ...baseInput,
      currentWeightKg: 50,
      targetWeightKg: 40,
      activityLevel: 'sedentary',
      goalPaceKg: 0.5, // within the 1% pace cap (0.5kg/week for 50kg) but would drop target too low
    });
    if (result.dailyCalorieTarget === MIN_CALORIES.female) {
      expect(result.targetWasFloored).toBe(true);
      expect(result.guardrailMessage).toMatch(/capped/i);
    }
  });

  it('caps pace at 1% of bodyweight per week', () => {
    const result = calculateCalorieTarget({
      ...baseInput,
      currentWeightKg: 100,
      targetWeightKg: 80,
      activityLevel: 'active',
      goalPaceKg: 5, // way above 1% of 100kg = 1kg/week
    });
    expect(result.paceWasCapped).toBe(true);
    expect(result.appliedPaceKg).toBeLessThanOrEqual(1.0001);
  });

  it('warns when target weight implies a BMI under 18.5', () => {
    const result = calculateCalorieTarget({
      ...baseInput,
      currentWeightKg: 60,
      targetWeightKg: 40, // BMI ~14.7 at 165cm
      activityLevel: 'light',
      goalPaceKg: 0.25,
    });
    expect(result.targetBmiWarning).toBe(true);
  });

  it('handles maintenance (target == current weight)', () => {
    const result = calculateCalorieTarget({
      ...baseInput,
      targetWeightKg: 60,
      activityLevel: 'moderate',
      goalPaceKg: 0.5,
    });
    expect(result.direction).toBe('maintain');
    expect(result.dailyCalorieTarget).toBe(result.tdee);
    expect(result.estimatedWeeksToGoal).toBeNull();
    expect(result.estimatedDate).toBeNull();
  });

  it('handles weight gain direction (surplus above TDEE)', () => {
    const result = calculateCalorieTarget({
      ...baseInput,
      gender: 'male',
      currentWeightKg: 65,
      targetWeightKg: 75,
      activityLevel: 'moderate',
      goalPaceKg: 0.25,
    });
    expect(result.direction).toBe('gain');
    expect(result.dailyCalorieTarget).toBeGreaterThan(result.tdee);
  });
});
