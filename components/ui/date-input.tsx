'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { formatDateShort, maskDateShort, parseDateShort } from '@/lib/date';

interface DateInputProps {
  /** 'YYYY-MM-DD', o '' si la fecha esta incompleta o es invalida */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
}

/**
 * Campo de fecha que se escribe y se ve como DD/MM/AA sin importar el idioma del
 * navegador (el `<input type="date">` nativo no permite fijar el formato). El
 * calendario nativo queda disponible desde el boton. El valor siempre es ISO.
 */
export function DateInput({ value, onChange, id, required }: DateInputProps) {
  const textRef = React.useRef<HTMLInputElement>(null);
  const pickerRef = React.useRef<HTMLInputElement>(null);

  const [text, setText] = React.useState(() => (value ? formatDateShort(value) : ''));
  const [prevValue, setPrevValue] = React.useState(value);

  // Si el padre cambia la fecha desde afuera, el texto la sigue.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== (parseDateShort(text) ?? '')) {
      setText(value ? formatDateShort(value) : '');
    }
  }

  // `required` del navegador solo mira que haya texto: validamos que sea una fecha real.
  React.useEffect(() => {
    const isValid = parseDateShort(text) !== null || (!required && text === '');

    textRef.current?.setCustomValidity(isValid ? '' : 'Ingresa una fecha válida (DD/MM/AA)');
  }, [text, required]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskDateShort(e.target.value);

    setText(masked);
    onChange(parseDateShort(masked) ?? '');
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value;

    setText(iso ? formatDateShort(iso) : '');
    onChange(iso);
  }

  function openPicker() {
    const picker = pickerRef.current;

    if (!picker) return;

    try {
      picker.showPicker();
    } catch {
      picker.click();
    }
  }

  return (
    <div className="relative">
      <Input
        ref={textRef}
        id={id}
        value={text}
        onChange={handleTextChange}
        placeholder="DD/MM/AA"
        inputMode="numeric"
        autoComplete="off"
        maxLength={8}
        required={required}
        className="pr-10"
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Abrir calendario"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={handlePickerChange}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0 opacity-0"
      />
    </div>
  );
}
