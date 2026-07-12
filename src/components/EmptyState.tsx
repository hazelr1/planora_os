import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 text-ink-500 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-base font-700 text-ink-800">{title}</h3>
      {description && <p className="text-sm text-ink-600 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
