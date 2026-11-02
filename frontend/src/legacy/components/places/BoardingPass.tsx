import React from 'react';
import { Users } from 'lucide-react';

const STOP_WORDS = new Set(['of', 'the', 'and', 'at', 'in', 'on', 'to', 'a']);

/** "National Gallery of Modern Art (NGMA)" → NGMA, "Lalbagh Botanical Garden" → LBG, "Skandagiri" → SKA */
export const placeCode = (name: string) => {
  const acronym = name.match(/\(([A-Za-z]{2,5})\)/);
  if (acronym) return acronym[1].toUpperCase();
  const words = name
    .replace(/\(.*?\)/g, '')
    .replace(/[^A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return 'DST';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 4).map((w) => w[0]).join('').toUpperCase();
};

// Deterministic "barcode" so each place gets its own pattern
const barcode = (seed: number) => Array.from({ length: 40 }, (_, i) => 1 + ((seed * 31 + i * 17 + ((i * i) % 7)) % 3));

interface Field {
  label: string;
  value: string;
}

interface BoardingPassProps {
  placeId: number;
  placeName: string;
  fields: Field[];
  footerFields?: Field[];
  onFindConvoy: () => void;
}

const FieldCell: React.FC<Field> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted mb-1">{label}</p>
    <p className="text-sm font-semibold text-ink leading-snug break-words">{value}</p>
  </div>
);

/* A paper weekend pass: Bengaluru → the place, key facts, and a tear-off stub to find a trip. */
export const BoardingPass: React.FC<BoardingPassProps> = ({ placeId, placeName, fields, footerFields = [], onFindConvoy }) => {
  const code = placeCode(placeName);

  return (
    <div className="spotlight relative rounded-[26px] bg-paper border border-line card-shadow-hover overflow-hidden">
      {/* ── Ticket ── */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent-text">Weekend pass</span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted">No. {String(placeId).padStart(4, '0')}</span>
        </div>

        <div className="flex items-end justify-between gap-3 mb-7">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted mb-1">From</p>
            <p className="font-display text-[2.4rem] leading-none text-ink">BLR</p>
            <p className="text-xs text-muted mt-1.5">Bengaluru</p>
          </div>

          <div className="flex-1 flex items-center gap-1.5 pb-7 min-w-[2.5rem]" aria-hidden>
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="flex-1 border-t-2 border-dotted border-line-strong" />
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent rotate-90" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" />
            </svg>
          </div>

          <div className="text-right min-w-0">
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted mb-1">To</p>
            <p className="font-display text-[2.4rem] leading-none text-accent">{code}</p>
            <p className="text-xs text-muted mt-1.5 truncate max-w-[9rem] ml-auto" title={placeName}>
              {placeName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {[...fields, ...footerFields].map((f) => (
            <FieldCell key={f.label} {...f} />
          ))}
        </div>
      </div>

      {/* ── Perforation ── */}
      <div className="relative h-0" aria-hidden>
        <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-sand border border-line" />
        <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-sand border border-line" />
        <span className="absolute left-5 right-5 top-0 border-t-2 border-dashed border-line-strong" />
      </div>

      {/* ── Stub ── */}
      <div className="p-6 pt-7 bg-stone/40">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-sage-text mb-2">Boarding · Travel groups</p>
        <p className="text-sm text-body leading-relaxed mb-5">Don't go alone. See who's heading to {code} and ride together.</p>
        <button onClick={onFindConvoy} className="btn-primary w-full">
          <Users className="w-4 h-4" /> Find people going
        </button>
        <div className="flex items-end justify-center gap-[2px] h-9 mt-6 opacity-50" aria-hidden>
          {barcode(placeId).map((w, i) => (
            <span key={i} className="h-full bg-ink" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
};
