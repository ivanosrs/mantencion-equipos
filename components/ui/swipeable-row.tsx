'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const ACTION_WIDTH = 104;
// Movimiento minimo antes de decidir si el gesto es horizontal (swipe) o vertical (scroll).
const AXIS_LOCK_PX = 8;

export type SwipeSide = 'start' | 'end';

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  className: string;
  onSelect: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  /** Accion que aparece a la izquierda al deslizar hacia la derecha. */
  startAction: SwipeAction;
  /** Accion que aparece a la derecha al deslizar hacia la izquierda. */
  endAction: SwipeAction;
  open: SwipeSide | null;
  onOpenChange: (side: SwipeSide | null) => void;
  disabled?: boolean;
  className?: string;
}

interface DragState {
  x: number;
  y: number;
  base: number;
  axis: 'x' | 'y' | null;
}

export function SwipeableRow({
  children,
  startAction,
  endAction,
  open,
  onOpenChange,
  disabled,
  className,
}: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);

  const restX = open === 'start' ? ACTION_WIDTH : open === 'end' ? -ACTION_WIDTH : 0;
  const x = dragX ?? restX;

  // Tocar fuera de la fila abierta la cierra.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) onOpenChange(null);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onOpenChange]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    dragRef.current = { x: e.clientX, y: e.clientY, base: restX, axis: null };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;

    if (drag.axis === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.axis === 'x') e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (drag.axis !== 'x') return;

    setDragX(Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, drag.base + dx)));
  }

  function handlePointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (drag.axis === 'x' && dragX !== null) {
      const threshold = ACTION_WIDTH / 2;
      onOpenChange(dragX > threshold ? 'start' : dragX < -threshold ? 'end' : null);
    } else if (drag.axis === null && open) {
      // Un toque sobre la fila abierta la cierra.
      onOpenChange(null);
    }
    setDragX(null);
  }

  function handlePointerCancel() {
    dragRef.current = null;
    setDragX(null);
  }

  function renderAction(action: SwipeAction, side: SwipeSide) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          onOpenChange(null);
          action.onSelect();
        }}
        style={{ width: ACTION_WIDTH }}
        className={cn(
          'absolute inset-y-0 flex flex-col items-center justify-center gap-1 text-sm font-semibold cursor-pointer disabled:opacity-50',
          side === 'start' ? 'left-0' : 'right-0',
          action.className
        )}
      >
        {action.icon}
        {action.label}
      </button>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden rounded-lg', className)}>
      {x > 0 && renderAction(startAction, 'start')}
      {x < 0 && renderAction(endAction, 'end')}

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ transform: `translateX(${x}px)` }}
        className={cn(
          'relative touch-pan-y select-none',
          dragX === null && 'transition-transform duration-200 ease-out'
        )}
      >
        {children}
      </div>
    </div>
  );
}
