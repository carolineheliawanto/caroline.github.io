import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { computeTargetForProfile } from '@/lib/profile-calc';
import { ProgressRing } from '@/components/ProgressRing';
import { MacroBar } from '@/components/MacroBar';
import { MealSection } from '@/components/MealSection';
import { DateNavigator } from '@/components/DateNavigator';
import { Nav } from '@/components/Nav';
import { MEAL_TYPES, type FoodLogDTO } from '@/types';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) redirect('/onboarding');

  const date = searchParams.date ?? todayStr();
  const start = new Date(date + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const logs = await prisma.foodLog.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });

  const logsDTO: FoodLogDTO[] = logs.map((log) => ({
    id: log.id,
    date: log.date.toISOString(),
    mealType: log.mealType as FoodLogDTO['mealType'],
    photoUrl: log.photoUrl,
    notes: log.notes,
    items: log.items.map((i) => ({
      id: i.id,
      name: i.name,
      portion: i.portion,
      calories: i.calories,
      proteinG: i.proteinG,
      carbsG: i.carbsG,
      fatG: i.fatG,
      confidence: i.confidence as FoodLogDTO['items'][number]['confidence'],
      source: i.source as FoodLogDTO['items'][number]['source'],
    })),
  }));

  const target = computeTargetForProfile(profile);

  const eatenCalories = logsDTO.reduce(
    (sum, log) => sum + log.items.reduce((s, i) => s + i.calories, 0),
    0
  );
  const eatenProtein = logsDTO.reduce(
    (sum, log) => sum + log.items.reduce((s, i) => s + i.proteinG, 0),
    0
  );
  const eatenCarbs = logsDTO.reduce(
    (sum, log) => sum + log.items.reduce((s, i) => s + i.carbsG, 0),
    0
  );
  const eatenFat = logsDTO.reduce((sum, log) => sum + log.items.reduce((s, i) => s + i.fatG, 0), 0);

  const remainingCalories = target.dailyCalorieTarget - eatenCalories;
  const isOver = remainingCalories < 0;

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-md px-4 py-4">
        <DateNavigator date={date} />

        <div className="my-6">
          <ProgressRing eaten={eatenCalories} target={target.dailyCalorieTarget} />
        </div>

        {isOver && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            You&apos;re {Math.round(Math.abs(remainingCalories))} kcal over your daily target.
          </div>
        )}

        <div className="mb-6 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <MacroBar
            label="Protein"
            eaten={eatenProtein}
            target={target.macros.proteinG}
            colorClass="bg-blue-500"
          />
          <MacroBar
            label="Carbs"
            eaten={eatenCarbs}
            target={target.macros.carbsG}
            colorClass="bg-amber-500"
          />
          <MacroBar label="Fat" eaten={eatenFat} target={target.macros.fatG} colorClass="bg-pink-500" />
        </div>

        <div className="space-y-4">
          {MEAL_TYPES.map((mealType) => (
            <MealSection
              key={mealType}
              mealType={mealType}
              date={date}
              remainingCalories={remainingCalories}
              logs={logsDTO.filter((l) => l.mealType === mealType)}
            />
          ))}
        </div>
      </div>
      <Nav />
    </div>
  );
}
