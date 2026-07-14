interface Stat {
  value: string;
  label: string;
}

interface StatTrioProps {
  stats: [Stat, Stat, Stat];
  className?: string;
  /** Use light/translucent text — for placement directly over a photo. */
  onDark?: boolean;
}

export default function StatTrio({ stats, className = '', onDark = false }: StatTrioProps) {
  return (
    <div className={`flex items-center gap-6 sm:gap-9 ${className}`}>
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-6 sm:gap-9">
          {i > 0 && (
            <span
              className={`h-8 w-px shrink-0 ${onDark ? 'bg-white/20' : 'bg-glass/10'}`}
              aria-hidden="true"
            />
          )}
          <div>
            <p className={`font-display text-2xl font-700 sm:text-3xl ${onDark ? 'text-white' : 'text-ink-900'}`}>
              {s.value}
            </p>
            <p className={`mt-0.5 text-xs font-medium ${onDark ? 'text-white/65' : 'text-ink-600'}`}>
              {s.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
