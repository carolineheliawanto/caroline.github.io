'use client';

type Status = 'under' | 'near' | 'over';

function getStatus(eaten: number, target: number): Status {
  if (target <= 0) return 'under';
  const ratio = eaten / target;
  if (ratio > 1) return 'over';
  if (ratio >= 0.9) return 'near';
  return 'under';
}

const STATUS_COLORS: Record<Status, string> = {
  under: '#16a35d', // green
  near: '#d97706', // amber
  over: '#dc2626', // red
};

export function ProgressRing({ eaten, target }: { eaten: number; target: number }) {
  const status = getStatus(eaten, target);
  const remaining = target - eaten;
  const ratio = target > 0 ? Math.min(eaten / target, 1) : 0;

  const size = 220;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={STATUS_COLORS[status]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">
          {Math.abs(Math.round(remaining)).toLocaleString()}
        </span>
        <span className="text-sm text-gray-500">{remaining >= 0 ? 'kcal left' : 'kcal over'}</span>
        <span className="mt-2 text-xs text-gray-400">
          {Math.round(eaten).toLocaleString()} / {Math.round(target).toLocaleString()} kcal
        </span>
      </div>
    </div>
  );
}
