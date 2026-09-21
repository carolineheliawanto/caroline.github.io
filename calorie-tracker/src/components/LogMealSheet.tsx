'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressImageFile, compressThumbnail } from '@/lib/image';
import { FoodItemEditor, type EditableFoodItem } from '@/components/FoodItemEditor';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '@/types';

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `item-${Date.now()}-${idCounter}`;
}

function emptyItem(source: 'ai' | 'manual' = 'manual'): EditableFoodItem {
  return {
    tempId: nextId(),
    name: '',
    portion: '',
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    source,
  };
}

type Step = 'choose' | 'analyzing' | 'review';

export interface LogMealSheetProps {
  date: string;
  defaultMealType: MealType;
  remainingCalories: number;
  onClose: () => void;
  editingLogId?: string;
  initialItems?: EditableFoodItem[];
  initialPhotoUrl?: string | null;
}

export function LogMealSheet({
  date,
  defaultMealType,
  remainingCalories,
  onClose,
  editingLogId,
  initialItems,
  initialPhotoUrl,
}: LogMealSheetProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [step, setStep] = useState<Step>(initialItems ? 'review' : 'choose');
  const [items, setItems] = useState<EditableFoodItem[]>(initialItems ?? []);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(initialPhotoUrl ?? null);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalCalories = items.reduce((sum, i) => sum + (Number.isFinite(i.calories) ? i.calories : 0), 0);
  const wouldExceed = remainingCalories - totalCalories < 0;

  async function handlePhotoSelected(file: File) {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('That image is too large. Please choose a smaller photo.');
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      setPhotoDataUrl(compressed.dataUrl);
      setStep('analyzing');

      const res = await fetch('/api/food-logs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressed.base64, mediaType: compressed.mediaType }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not analyze the photo. You can still add items manually below.');
        setItems([emptyItem('manual')]);
        setStep('review');
        return;
      }

      const result = await res.json();
      const aiItems: EditableFoodItem[] = (result.items ?? []).map((it: {
        name: string;
        portion: string;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        confidence: 'low' | 'medium' | 'high';
      }) => ({
        tempId: nextId(),
        name: it.name,
        portion: it.portion,
        calories: it.calories,
        proteinG: it.protein_g,
        carbsG: it.carbs_g,
        fatG: it.fat_g,
        confidence: it.confidence,
        source: 'ai' as const,
      }));

      if (aiItems.length === 0) {
        setAnalysisNote(
          result.notes || "We couldn't identify any food in this photo. You can add items manually below."
        );
        setItems([emptyItem('manual')]);
      } else {
        setAnalysisNote(result.notes || null);
        setItems(aiItems);
      }
      setStep('review');
    } catch {
      setError('Network error while analyzing the photo. You can add items manually below.');
      setItems([emptyItem('manual')]);
      setStep('review');
    }
  }

  function startManualEntry() {
    setItems([emptyItem('manual')]);
    setPhotoDataUrl(null);
    setStep('review');
  }

  function updateItem(tempId: string, updated: EditableFoodItem) {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? updated : i)));
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  }

  async function handleSave() {
    setError(null);
    const validItems = items.filter((i) => i.name.trim().length > 0);
    if (validItems.length === 0) {
      setError('Add at least one food item with a name.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        mealType,
        items: validItems.map((i) => ({
          name: i.name.trim(),
          portion: i.portion || undefined,
          calories: i.calories || 0,
          proteinG: i.proteinG || 0,
          carbsG: i.carbsG || 0,
          fatG: i.fatG || 0,
          confidence: i.confidence,
          source: i.source,
        })),
      };

      const url = editingLogId ? `/api/food-logs/${editingLogId}` : '/api/food-logs';
      const method = editingLogId ? 'PUT' : 'POST';
      const thumbnail = photoDataUrl ? await compressThumbnail(photoDataUrl) : null;
      const body = editingLogId ? payload : { ...payload, date, photoUrl: thumbnail };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not save. Please try again.');
        setSaving(false);
        return;
      }

      setSaving(false);
      onClose();
      router.refresh();
    } catch {
      setError('Network error while saving. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            {editingLogId ? 'Edit entry' : 'Log a meal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Meal type selector, always visible */}
          <div className="mb-4 flex gap-1.5">
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                type="button"
                onClick={() => setMealType(mt)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${
                  mealType === mt ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'
                }`}
              >
                {MEAL_TYPE_LABELS[mt]}
              </button>
            ))}
          </div>

          {step === 'choose' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelected(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 py-8 text-brand-700"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium">Take or upload a photo</span>
                <span className="text-xs text-brand-500">AI will estimate calories & macros</span>
              </button>

              <button
                type="button"
                onClick={startManualEntry}
                className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Enter manually instead
              </button>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center gap-3 py-10">
              {photoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoDataUrl} alt="Selected meal" className="h-32 w-32 rounded-xl object-cover" />
              )}
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Analyzing your photo… this can take a few seconds</p>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-3">
              {photoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoDataUrl} alt="Selected meal" className="h-28 w-full rounded-xl object-cover" />
              )}

              {analysisNote && (
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">{analysisNote}</p>
              )}

              {items.map((item) => (
                <FoodItemEditor
                  key={item.tempId}
                  item={item}
                  onChange={(updated) => updateItem(item.tempId, updated)}
                  onRemove={() => removeItem(item.tempId)}
                />
              ))}

              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, emptyItem('manual')])}
                className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                + Add item
              </button>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold text-gray-900">{Math.round(totalCalories)} kcal</span>
              </div>

              {wouldExceed && (
                <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  This entry would put you {Math.round(totalCalories - remainingCalories)} kcal over your
                  daily target.
                </p>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
