import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { computeTargetForProfile } from '@/lib/profile-calc';
import { calculateStreak, lastNDays } from '@/lib/day-stats';
import { kgToLb } from '@/lib/calorie-math';
import { WeightChart } from '@/components/WeightChart';
import { WeeklyChart } from '@/components/WeeklyChart';
import { WeightEntryForm } from '@/components/WeightEntryForm';
import { Nav } from '@/components/Nav';

export default async function ProgressPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) redirect('/onboarding');

  const target = computeTargetForProfile(profile);

  const weightEntries = await prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  const today = new Date();
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - 29);
  rangeStart.setHours(0, 0, 0, 0);

  const recentLogs = await prisma.foodLog.findMany({
    where: { userId, date: { gte: rangeStart } },
    include: { items: true },
  });

  const dailyTotals = new Map<string, number>();
  for (const log of recentLogs) {
    const key = log.date.toISOString().slice(0, 10);
    const logCalories = log.items.reduce((s, i) => s + i.calories, 0);
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + logCalories);
  }

  const last7 = lastNDays(7, today);
  const weeklyData = last7.map((date) => ({ date, calories: dailyTotals.get(date) ?? 0 }));
  const daysUnderTarget = weeklyData.filter((d) => d.calories > 0 && d.calories <= target.dailyCalorieTarget).length;
  const daysLogged = weeklyData.filter((d) => d.calories > 0).length;
  const averageIntake = daysLogged > 0 ? weeklyData.reduce((s, d) => s + d.calories, 0) / daysLogged : 0;

  const streak = calculateStreak(dailyTotals, target.dailyCalorieTarget, today);

  const weightData = weightEntries.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    weightKg: profile.units === 'metric' ? e.weightKg : Math.round(kgToLb(e.weightKg) * 10) / 10,
  }));
  const targetWeightDisplay =
    profile.units === 'metric' ? profile.targetWeightKg : Math.round(kgToLb(profile.targetWeightKg) * 10) / 10;

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Progress</h1>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-brand-700">{streak}</p>
            <p className="text-xs text-gray-500">day streak</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{daysUnderTarget}/7</p>
            <p className="text-xs text-gray-500">under target</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{Math.round(averageIntake)}</p>
            <p className="text-xs text-gray-500">avg kcal/day</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">Weight</h2>
          <WeightChart data={weightData} targetWeightKg={targetWeightDisplay} />
          <div className="mt-3">
            <WeightEntryForm units={profile.units as 'metric' | 'imperial'} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">This week</h2>
          <WeeklyChart data={weeklyData} target={target.dailyCalorieTarget} />
        </div>
      </div>
      <Nav />
    </div>
  );
}
