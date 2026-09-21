'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MEAL_TYPE_LABELS, type FoodLogDTO, type MealType } from '@/types';
import { LogMealSheet } from '@/components/LogMealSheet';
import type { EditableFoodItem } from '@/components/FoodItemEditor';

export function MealSection({
  mealType,
  logs,
  date,
  remainingCalories,
}: {
  mealType: MealType;
  logs: FoodLogDTO[];
  date: string;
  remainingCalories: number;
}) {
  const router = useRouter();
  const [editingLog, setEditingLog] = useState<FoodLogDTO | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalCalories = logs.reduce(
    (sum, log) => sum + log.items.reduce((s, i) => s + i.calories, 0),
    0
  );

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/food-logs/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{MEAL_TYPE_LABELS[mealType]}</h3>
        <div className="flex items-center gap-3">
          {totalCalories > 0 && (
            <span className="text-sm text-gray-500">{Math.round(totalCalories)} kcal</span>
          )}
          <button
            onClick={() => setAdding(true)}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Add
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => {
            const logCalories = log.items.reduce((s, i) => s + i.calories, 0);
            return (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-2"
              >
                {log.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={log.photoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
                    🍴
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {log.items.map((i) => i.name).join(', ')}
                  </p>
                  <p className="text-xs text-gray-400">{Math.round(logCalories)} kcal</p>
                </div>
                <button
                  onClick={() => setEditingLog(log)}
                  className="shrink-0 px-1 text-xs text-gray-400 hover:text-brand-600"
                  aria-label="Edit entry"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                  className="shrink-0 px-1 text-xs text-gray-400 hover:text-red-600"
                  aria-label="Delete entry"
                >
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <LogMealSheet
          date={date}
          defaultMealType={mealType}
          remainingCalories={remainingCalories}
          onClose={() => setAdding(false)}
        />
      )}

      {editingLog && (
        <LogMealSheet
          date={date}
          defaultMealType={editingLog.mealType}
          remainingCalories={remainingCalories}
          editingLogId={editingLog.id}
          initialPhotoUrl={editingLog.photoUrl}
          initialItems={editingLog.items.map<EditableFoodItem>((i) => ({
            tempId: i.id,
            name: i.name,
            portion: i.portion ?? '',
            calories: i.calories,
            proteinG: i.proteinG,
            carbsG: i.carbsG,
            fatG: i.fatG,
            confidence: i.confidence ?? undefined,
            source: i.source,
          }))}
          onClose={() => setEditingLog(null)}
        />
      )}
    </div>
  );
}
