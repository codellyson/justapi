"use client";

import { useEnvironmentStore } from "../../stores/use-environment-store";
import { PopoverSection } from "./popover-section";

export const PopoverEnv = () => {
  const environments = useEnvironmentStore((s) => s.environments);
  const activeId = useEnvironmentStore((s) => s.activeEnvironmentId);
  const setActiveId = useEnvironmentStore((s) => s.setActiveEnvironmentId);

  return (
    <PopoverSection popoverKey="env" label="Environment">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-3">
          {environments.map((env) => (
            <label
              key={env.id}
              className="flex items-center gap-1.5 text-[12px] cursor-pointer"
            >
              <input
                type="radio"
                name="env"
                checked={activeId === env.id}
                onChange={() => setActiveId(env.id)}
                className="accent-[rgb(var(--accent))]"
              />
              {env.name}
            </label>
          ))}
        </div>
        <p className="text-[10px] text-muted font-mono">
          Manage variables with <span className="text-secondary">/env</span>
        </p>
      </div>
    </PopoverSection>
  );
};
