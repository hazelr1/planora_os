import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 sm:py-16 px-4 text-center animate-fade-in">
      <div className="h-14 w-14 rounded-2xl bg-brand-500/10 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-base font-700 text-ink-800">{title}</h3>
      {description && <p className="text-sm text-ink-600 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
