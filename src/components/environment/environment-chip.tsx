'use client';

import { useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import { useEnvironmentStore } from '../../stores/use-environment-store';
import { SettingsModal } from '../layout/settings-modal';
import { cn } from '../../utils/cn';

interface EnvironmentChipProps {
  className?: string;
}

export const EnvironmentChip = ({ className }: EnvironmentChipProps) => {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironmentId,
    getActiveEnvironment,
  } = useEnvironmentStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const active = getActiveEnvironment();
  const varCount = active ? Object.keys(active.variables).length : 0;

  return (
    <>
      <div className={cn('flex items-center shrink-0 gap-1.5', className)}>
        <span className="text-muted hidden sm:inline">Env</span>
        <div className="flex items-center">
          <div className="relative">
            <select
              value={activeEnvironmentId || ''}
              onChange={(e) => setActiveEnvironmentId(e.target.value)}
              className={cn(
                'appearance-none cursor-pointer',
                'pl-2 pr-5 py-0.5 text-xs font-medium',
                'rounded-l-md border border-border border-r-0 bg-bg-secondary text-primary',
                'hover:bg-bg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset'
              )}
              title="Active environment"
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'inline-flex items-center justify-center px-1.5 py-1',
              'rounded-r-md border border-border bg-bg-secondary text-muted',
              'hover:bg-bg hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset',
              'transition-colors'
            )}
            title={`Manage environments · ${varCount} variable${varCount === 1 ? '' : 's'} active`}
            aria-label="Manage environments"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        {varCount > 0 && (
          <span
            className="text-muted tabular-nums"
            title={`${varCount} variable${varCount === 1 ? '' : 's'} active`}
          >
            {varCount}
          </span>
        )}
      </div>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
