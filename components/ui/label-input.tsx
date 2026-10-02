'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Adaptado de "Label input" de bencho.dev: el contorno es un SVG que se abre
// bajo la etiqueta cuando esta sube al borde superior.
const HEIGHT = 52;
const LABEL_SCALE = 0.78;
const STROKE_INSET = 0.75;

interface LabelInputProps {
  label: string;
  type?: 'email' | 'password' | 'text';
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  autoComplete?: string;
  corner?: number;
}

export function LabelInput({
  label,
  type = 'text',
  value,
  onChange,
  id,
  name,
  required,
  autoComplete,
  corner = 8,
}: LabelInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isPassword = type === 'password';

  const boxRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLLabelElement>(null);
  const [width, setWidth] = useState(0);
  const [labelWidth, setLabelWidth] = useState(40);
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [flips, setFlips] = useState(0);

  useLayoutEffect(() => {
    if (labelRef.current) setLabelWidth(labelRef.current.offsetWidth);
  }, [label]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const filled = value.length > 0;
  const up = focused || filled;

  const r = Math.min(Math.max(corner, 0), HEIGHT / 2);
  const labelX = Math.max(14, r + 4);
  const gapStart = Math.max(r * 0.6, labelX - 5);
  const gapEnd = labelX + labelWidth * LABEL_SCALE + 5;
  const gapMid = (gapStart + gapEnd) / 2;
  const arc = r - STROKE_INSET;
  const right = width - STROKE_INSET;
  const bottom = HEIGHT - STROKE_INSET;
  const half = width / 2;
  const top = STROKE_INSET;

  const rightPath =
    r > 0
      ? `M${gapEnd},${top} L${width - r},${top} A${arc},${arc} 0 0 1 ${right},${r} L${right},${HEIGHT - r} A${arc},${arc} 0 0 1 ${width - r},${bottom} L${half},${bottom}`
      : `M${gapEnd},${top} L${right},${top} L${right},${bottom} L${half},${bottom}`;
  const leftPath =
    r > 0
      ? `M${gapStart},${top} L${r},${top} A${arc},${arc} 0 0 0 ${top},${r} L${top},${HEIGHT - r} A${arc},${arc} 0 0 0 ${r},${bottom} L${half},${bottom}`
      : `M${gapStart},${top} L${top},${top} L${top},${bottom} L${half},${bottom}`;

  return (
    <div className="lbi" data-up={up} data-focus={focused} data-filled={filled}>
      <div
        ref={boxRef}
        className="lbi-box"
        style={
          { height: HEIGHT, borderRadius: r, '--lbi-x': `${labelX}px` } as React.CSSProperties
        }
      >
        {width > 0 && (
          <svg
            className="lbi-ring"
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            aria-hidden="true"
          >
            <path d={rightPath} />
            <path d={leftPath} />
            <path className="lbi-gap" d={`M${gapMid},${top} L${gapStart},${top}`} pathLength={1} />
            <path className="lbi-gap" d={`M${gapMid},${top} L${gapEnd},${top}`} pathLength={1} />
          </svg>
        )}
        <label ref={labelRef} className="lbi-label" htmlFor={inputId}>
          {[...label].map((char, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}>
              {char}
            </span>
          ))}
        </label>
        <input
          id={inputId}
          name={name}
          className="lbi-field"
          data-flip={flips % 2}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoComplete={autoComplete}
          spellCheck={false}
          style={{ paddingRight: isPassword ? 48 : labelX }}
        />
        {isPassword && (
          <button
            className="lbi-eye"
            type="button"
            tabIndex={-1}
            data-show={showPassword}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowPassword((prev) => !prev);
              setFlips((n) => n + 1);
            }}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
            <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
