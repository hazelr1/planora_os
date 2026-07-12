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
      <div className="h-14 w-14 rounded-2xl bg-ink-100 text-ink-400 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-base font-700 text-ink-700">{title}</h3>
      {description && <p className="text-sm text-ink-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
