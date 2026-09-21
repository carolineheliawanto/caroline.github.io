import type { Profile } from '@prisma/client';
import { calculateCalorieTarget, type CalorieTargetResult, type ActivityLevel, type Gender } from '@/lib/calorie-math';

export function computeTargetForProfile(
  profile: Profile,
  currentWeightOverrideKg?: number
): CalorieTargetResult {
  return calculateCalorieTarget({
    gender: profile.gender as Gender,
    birthDate: profile.birthDate,
    heightCm: profile.heightCm,
    currentWeightKg: currentWeightOverrideKg ?? profile.currentWeightKg,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel as ActivityLevel,
    goalPaceKg: profile.goalPaceKg,
  });
}
