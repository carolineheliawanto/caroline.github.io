'use client';

import { useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculateCalorieTarget,
  kgToLb,
  lbToKg,
  cmToFeetInches,
  feetInchesToCm,
  type ActivityLevel,
  type Gender,
} from '@/lib/calorie-math';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Lightly active', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderately active', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very active', description: 'Physical job or 2x/day training' },
];

const PACE_OPTIONS_KG = [0.25, 0.5, 0.75];

export interface ProfileFormValues {
  gender: Gender;
  birthDate: string; // yyyy-mm-dd
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  goalPaceKg: number;
  units: 'metric' | 'imperial';
}

export function ProfileForm({
  initial,
  mode,
}: {
  initial?: Partial<ProfileFormValues>;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [units, setUnits] = useState<'metric' | 'imperial'>(initial?.units ?? 'metric');
  const [gender, setGender] = useState<Gender>(initial?.gender ?? 'female');
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '');
  const [heightCm, setHeightCm] = useState(initial?.heightCm ?? 165);
  const [currentWeightKg, setCurrentWeightKg] = useState(initial?.currentWeightKg ?? 65);
  const [targetWeightKg, setTargetWeightKg] = useState(initial?.targetWeightKg ?? 60);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initial?.activityLevel ?? 'moderate');
  const [goalPaceKg, setGoalPaceKg] = useState(initial?.goalPaceKg ?? 0.5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Imperial display helpers
  const heightFeetInches = cmToFeetInches(heightCm);
  const currentWeightLb = kgToLb(currentWeightKg);
  const targetWeightLb = kgToLb(targetWeightKg);

  const preview = useMemo(() => {
    if (!birthDate) return null;
    const bd = new Date(birthDate);
    if (Number.isNaN(bd.getTime())) return null;
    if (heightCm <= 0 || currentWeightKg <= 0 || targetWeightKg <= 0) return null;
    return calculateCalorieTarget({
      gender,
      birthDate: bd,
      heightCm,
      currentWeightKg,
      targetWeightKg,
      activityLevel,
      goalPaceKg,
    });
  }, [gender, birthDate, heightCm, currentWeightKg, targetWeightKg, activityLevel, goalPaceKg]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!birthDate) {
      setError('Please enter your date of birth');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/profile', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender,
          birthDate,
          heightCm,
          currentWeightKg,
          targetWeightKg,
          activityLevel,
          goalPaceKg,
          units,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not save profile');
        setSubmitting(false);
        return;
      }
      router.push('/today');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {/* Units toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Units</span>
        <div className="flex overflow-hidden rounded-lg border border-gray-300">
          {(['metric', 'imperial'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnits(u)}
              className={`px-3 py-1.5 text-sm ${
                units === u ? 'bg-brand-600 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {u === 'metric' ? 'Metric (kg/cm)' : 'Imperial (lb/ft)'}
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Gender</label>
        <div className="flex gap-2">
          {(['female', 'male'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`flex-1 rounded-lg border py-2.5 text-sm capitalize ${
                gender === g
                  ? 'border-brand-600 bg-brand-50 font-medium text-brand-700'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">Used only for BMR calculation accuracy.</p>
      </div>

      {/* Birth date */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Date of birth</label>
        <input
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
        />
      </div>

      {/* Height */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Height</label>
        {units === 'metric' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              required
              min={50}
              max={250}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            />
            <span className="text-sm text-gray-500">cm</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={8}
              value={heightFeetInches.feet}
              onChange={(e) => setHeightCm(feetInchesToCm(Number(e.target.value), heightFeetInches.inches))}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            />
            <span className="text-sm text-gray-500">ft</span>
            <input
              type="number"
              min={0}
              max={11}
              value={heightFeetInches.inches}
              onChange={(e) => setHeightCm(feetInchesToCm(heightFeetInches.feet, Number(e.target.value)))}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            />
            <span className="text-sm text-gray-500">in</span>
          </div>
        )}
      </div>

      {/* Current weight */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Current weight</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            required
            step={0.1}
            min={20}
            value={units === 'metric' ? currentWeightKg : Math.round(currentWeightLb * 10) / 10}
            onChange={(e) =>
              setCurrentWeightKg(units === 'metric' ? Number(e.target.value) : lbToKg(Number(e.target.value)))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
          />
          <span className="text-sm text-gray-500">{units === 'metric' ? 'kg' : 'lb'}</span>
        </div>
      </div>

      {/* Target weight */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Target weight</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            required
            step={0.1}
            min={20}
            value={units === 'metric' ? targetWeightKg : Math.round(targetWeightLb * 10) / 10}
            onChange={(e) =>
              setTargetWeightKg(units === 'metric' ? Number(e.target.value) : lbToKg(Number(e.target.value)))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
          />
          <span className="text-sm text-gray-500">{units === 'metric' ? 'kg' : 'lb'}</span>
        </div>
        {preview?.targetBmiWarning && (
          <p className="mt-1 text-xs text-amber-600">
            Heads up: your target weight gives a BMI under 18.5. Consider discussing this goal with a
            healthcare provider.
          </p>
        )}
      </div>

      {/* Activity level */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Activity level</label>
        <div className="space-y-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setActivityLevel(opt.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left ${
                activityLevel === opt.value
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-800">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Goal pace */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Goal pace</label>
        <div className="flex gap-2">
          {PACE_OPTIONS_KG.map((pace) => (
            <button
              type="button"
              key={pace}
              onClick={() => setGoalPaceKg(pace)}
              className={`flex-1 rounded-lg border py-2.5 text-sm ${
                goalPaceKg === pace
                  ? 'border-brand-600 bg-brand-50 font-medium text-brand-700'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              {units === 'metric' ? `${pace} kg/wk` : `${(kgToLb(pace)).toFixed(1)} lb/wk`}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Pace is automatically capped at 1% of your body weight per week for safety.
        </p>
      </div>

      {/* Live preview */}
      {preview && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-brand-800">Your calculated targets</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">BMR</dt>
              <dd className="font-medium text-gray-900">{preview.bmr} kcal</dd>
            </div>
            <div>
              <dt className="text-gray-500">TDEE</dt>
              <dd className="font-medium text-gray-900">{preview.tdee} kcal</dd>
            </div>
            <div>
              <dt className="text-gray-500">Daily target</dt>
              <dd className="text-base font-bold text-brand-700">{preview.dailyCalorieTarget} kcal</dd>
            </div>
            <div>
              <dt className="text-gray-500">Est. date to reach goal</dt>
              <dd className="font-medium text-gray-900">
                {preview.estimatedDate
                  ? preview.estimatedDate.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Current BMI</dt>
              <dd className="font-medium text-gray-900">{preview.currentBmi}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Target BMI</dt>
              <dd className="font-medium text-gray-900">{preview.targetBmi}</dd>
            </div>
          </dl>
          <div className="mt-3 border-t border-brand-200 pt-3 text-sm">
            <span className="text-gray-500">Suggested macros: </span>
            <span className="font-medium text-gray-900">
              {preview.macros.proteinG}g protein · {preview.macros.carbsG}g carbs · {preview.macros.fatG}g fat
            </span>
          </div>
          {preview.guardrailMessage && (
            <p className="mt-3 rounded-lg bg-amber-100 p-2 text-xs text-amber-800">{preview.guardrailMessage}</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            These estimates are approximate and not medical advice.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-xl bg-brand-600 py-4 font-medium text-white shadow-lg transition hover:bg-brand-700 disabled:opacity-60 sm:static sm:rounded-lg"
      >
        {submitting ? 'Saving…' : mode === 'create' ? 'Save & continue' : 'Save changes'}
      </button>
    </form>
  );
}
