export function MacroBar({
  label,
  eaten,
  target,
  colorClass,
}: {
  label: string;
  eaten: number;
  target: number;
  colorClass: string;
}) {
  const ratio = target > 0 ? Math.min(eaten / target, 1) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">
          {Math.round(eaten)}g / {Math.round(target)}g
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${ratio * 100}%`, transition: 'width 0.4s ease' }}
        />
      </div>
    </div>
  );
}
