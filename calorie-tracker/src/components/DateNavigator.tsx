'use client';

import { useRouter } from 'next/navigation';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function DateNavigator({ date }: { date: string }) {
  const router = useRouter();
  const isToday = date === new Date().toISOString().slice(0, 10);

  function go(newDate: string) {
    router.push(`/today?date=${newDate}`);
  }

  return (
    <div className="flex items-center justify-between px-1">
      <button
        onClick={() => go(addDays(date, -1))}
        aria-label="Previous day"
        className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
      >
        ←
      </button>
      <span className="text-base font-semibold text-gray-900">{formatDate(date)}</span>
      <button
        onClick={() => go(addDays(date, 1))}
        aria-label="Next day"
        disabled={isToday}
        className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
      >
        →
      </button>
    </div>
  );
}
