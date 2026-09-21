export interface EditableFoodItem {
  tempId: string;
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence?: 'low' | 'medium' | 'high';
  source: 'ai' | 'manual';
}

const CONFIDENCE_STYLES: Record<string, string> = {
  low: 'bg-amber-100 text-amber-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-green-100 text-green-700',
};

export function FoodItemEditor({
  item,
  onChange,
  onRemove,
}: {
  item: EditableFoodItem;
  onChange: (item: EditableFoodItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <input
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          placeholder="Food name"
          className="flex-1 border-b border-transparent bg-transparent text-sm font-medium text-gray-900 focus:border-brand-500"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="shrink-0 text-gray-400 hover:text-red-600"
        >
          ✕
        </button>
      </div>

      <input
        value={item.portion}
        onChange={(e) => onChange({ ...item, portion: e.target.value })}
        placeholder="Portion (e.g. 1 bowl, 200g)"
        className="mb-2 w-full border-b border-gray-200 bg-transparent text-xs text-gray-500 focus:border-brand-500"
      />

      <div className="grid grid-cols-4 gap-2 text-xs">
        <label className="flex flex-col gap-0.5">
          <span className="text-gray-400">kcal</span>
          <input
            type="number"
            min={0}
            value={item.calories}
            onChange={(e) => onChange({ ...item, calories: Number(e.target.value) })}
            className="rounded border border-gray-200 px-1.5 py-1"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-gray-400">protein</span>
          <input
            type="number"
            min={0}
            value={item.proteinG}
            onChange={(e) => onChange({ ...item, proteinG: Number(e.target.value) })}
            className="rounded border border-gray-200 px-1.5 py-1"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-gray-400">carbs</span>
          <input
            type="number"
            min={0}
            value={item.carbsG}
            onChange={(e) => onChange({ ...item, carbsG: Number(e.target.value) })}
            className="rounded border border-gray-200 px-1.5 py-1"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-gray-400">fat</span>
          <input
            type="number"
            min={0}
            value={item.fatG}
            onChange={(e) => onChange({ ...item, fatG: Number(e.target.value) })}
            className="rounded border border-gray-200 px-1.5 py-1"
          />
        </label>
      </div>

      {item.confidence && (
        <span
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${CONFIDENCE_STYLES[item.confidence]}`}
        >
          {item.confidence} confidence
        </span>
      )}
    </div>
  );
}
