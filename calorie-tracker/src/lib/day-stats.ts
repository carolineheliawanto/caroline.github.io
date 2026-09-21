export interface DailyTotal {
  date: string; // yyyy-mm-dd
  calories: number;
}

/** Consecutive days ending today (going backward) where the day was logged and stayed at/under target. */
export function calculateStreak(dailyTotals: Map<string, number>, target: number, today: Date): number {
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    const total = dailyTotals.get(key);
    if (total === undefined || total > target) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function lastNDays(n: number, today: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
