import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

/* ── One required question, revealed with a soft rise ── */
export const Question = ({
  index,
  title,
  hint,
  done,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  done: boolean;
  children: React.ReactNode;
}) => (
  <div className="relative pl-12 sm:pl-14">
    <span
      className={cn(
        'absolute left-0 top-0.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500',
        done ? 'bg-ink text-sand' : 'bg-accent-soft text-accent-text'
      )}
      aria-hidden
    >
      {done ? <Check className="w-4 h-4" /> : String(index).padStart(2, '0')}
    </span>
    <h3 className="font-display text-[1.45rem] sm:text-[1.65rem] leading-tight text-ink mb-1">{title}</h3>
    {hint && <p className="text-sm text-muted mb-4">{hint}</p>}
    {!hint && <div className="h-3" />}
    {children}
  </div>
);
