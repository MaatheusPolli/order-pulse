import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useDebounce } from '../hooks/useDebounce';

interface DebouncedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onCommit: (value: string) => void;
  delay?: number;
}

/**
 * Input com estado local que só "commita" após uma pausa na digitação.
 * Mudanças externas (ex.: "limpar filtros") sobrescrevem o valor local.
 */
export function DebouncedInput({ value, onCommit, delay = 350, ...props }: DebouncedInputProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebounce(draft, delay);
  const lastCommitted = useRef(value);
  // Ref evita re-commit do valor antigo quando o pai recria o callback (ex.: após "limpar filtros").
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    lastCommitted.current = value;
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (debounced === lastCommitted.current) return;
    lastCommitted.current = debounced;
    onCommitRef.current(debounced);
  }, [debounced]);

  return <input {...props} value={draft} onChange={(event) => setDraft(event.target.value)} />;
}
