'use client';

import { cn } from '../../utils/cn';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  badge?: number | string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string>({
  items,
  active,
  onChange,
  className,
  size = 'md',
}: TabsProps<T>) {
  const padding = size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5';
  return (
    <div className={cn('flex border-b border-border', className)}>
      {items.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'text-sm font-medium transition-colors border-b-2 -mb-px inline-flex items-center gap-1.5',
            padding,
            active === tab.id
              ? 'border-accent text-primary'
              : 'border-transparent text-secondary hover:text-primary hover:bg-bg-secondary/60'
          )}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge !== 0 && (
            <span
              className={cn(
                'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center tabular-nums',
                active === tab.id
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-secondary'
              )}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
