import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface ToggleGroupProps<T extends string> {
  legend: string;
  options: readonly T[];
  selected: readonly T[];
  onChange: (selected: T[]) => void;
  renderLabel: (option: T) => ReactNode;
}

/** Grupo de "chips" multi-seleção — botões com `aria-pressed`, navegáveis por teclado. */
export function ToggleGroup<T extends string>({ legend, options, selected, onChange, renderLabel }: ToggleGroupProps<T>) {
  const toggle = (option: T) =>
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : options.filter((o) => o === option || selected.includes(o)));

  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(option)}
              className={cn(
                'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors',
                active
                  ? 'border-brand bg-brand/10 text-fg'
                  : 'border-border bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg',
              )}
            >
              {renderLabel(option)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
