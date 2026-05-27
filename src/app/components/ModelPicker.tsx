'use client';

import { AVAILABLE_MODELS, type ModelId } from '@/lib/models';

type Props = {
  value: ModelId;
  onChange: (id: ModelId) => void;
  disabled?: boolean;
};

export function ModelPicker({ value, onChange, disabled }: Props) {
  const selected = AVAILABLE_MODELS.find((m) => m.id === value) ?? AVAILABLE_MODELS[1];
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">Model</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as ModelId)}
        className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
        title={selected.description}
      >
        {AVAILABLE_MODELS.map((m) => (
          <option key={m.id} value={m.id} title={m.description}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
