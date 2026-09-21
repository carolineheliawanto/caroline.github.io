'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { lbToKg } from '@/lib/calorie-math';

export function WeightEntryForm({ units }: { units: 'metric' | 'imperial' }) {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(weight);
    if (!value || value <= 0) {
      setError('Enter a valid weight');
      return;
    }
    const weightKg = units === 'metric' ? value : lbToKg(value);

    setSaving(true);
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, weightKg }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not save weight entry');
        setSaving(false);
        return;
      }
      setWeight('');
      setOpen(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-brand-200 bg-brand-50 py-2.5 text-sm font-medium text-brand-700"
      >
        + Log weight
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-gray-200 p-3">
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm"
        />
        <input
          type="number"
          step={0.1}
          placeholder={units === 'metric' ? 'kg' : 'lb'}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-gray-300 px-3 text-sm text-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
