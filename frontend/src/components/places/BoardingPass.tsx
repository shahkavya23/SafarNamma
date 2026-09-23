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
const barcode = (seed: number) =>
  Array.from({ length: 34 }, (_, i) => 1 + ((seed * 31 + i * 17 + ((i * i) % 7)) % 3));

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
    <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#64748B] mb-1">{label}</p>
    <p className="font-mono text-sm font-medium text-white truncate" title={value}>{value}</p>
  </div>
);

export const BoardingPass: React.FC<BoardingPassProps> = ({ placeId, placeName, fields, footerFields = [], onFindConvoy }) => {
  const code = placeCode(placeName);

  return (
    <div className="relative flex flex-col sm:flex-row rounded-[20px] overflow-hidden bg-[#141820] border border-[rgba(255,255,255,0.08)] card-shadow">
      {/* ── Main ticket ── */}
      <div className="flex-1 min-w-0 p-6">
        <div className="flex items-center justify-between mb-5">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#F59E0B]">Weekend Pass</span>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#64748B]">
            No. {String(placeId).padStart(4, '0')}
          </span>
        </div>

        {/* Route */}
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#64748B] mb-1">From</p>
            <p className="text-display text-white leading-none" style={{ fontSize: '2.25rem' }}>BLR</p>
            <p className="text-xs text-[#64748B] mt-1">Bengaluru</p>
          </div>

          <div className="flex-1 flex items-center gap-2 pb-6 min-w-[3rem]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span className="flex-1 border-t border-dashed border-[#334155]" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#F59E0B]" />
          </div>

          <div className="text-right min-w-0">
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#64748B] mb-1">To</p>
            <p className="text-display text-[#F59E0B] leading-none" style={{ fontSize: '2.25rem' }}>{code}</p>
            <p className="text-xs text-[#64748B] mt-1 truncate max-w-[10rem] ml-auto" title={placeName}>{placeName}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 pt-5 border-t border-dashed border-[#334155]">
          {fields.map((f) => <FieldCell key={f.label} {...f} />)}
        </div>

        {footerFields.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {footerFields.map((f) => <FieldCell key={f.label} {...f} />)}
          </div>
        )}
      </div>

      {/* ── Tear-off stub ── */}
      <div className="relative sm:w-52 shrink-0 p-6 flex flex-col justify-between gap-5 border-t sm:border-t-0 sm:border-l border-dashed border-[#334155] bg-[#0D9488]/[0.06]">
        {/* Perforation notches */}
        <span className="hidden sm:block absolute -left-3 -top-3 w-6 h-6 rounded-full bg-[#0C0E10]" />
        <span className="hidden sm:block absolute -left-3 -bottom-3 w-6 h-6 rounded-full bg-[#0C0E10]" />
        <span className="sm:hidden absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[#0C0E10]" />
        <span className="sm:hidden absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#0C0E10]" />

        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#14B8A6] mb-2">Boarding · Basecamp</p>
          <p className="text-sm text-[#CBD5E1] leading-snug">Don't go alone. Join a convoy to {code}.</p>
        </div>

        <button onClick={onFindConvoy} className="btn-teal w-full justify-center">
          <Users className="w-4 h-4" />
          Find a Convoy
        </button>

        <div className="flex items-end gap-[2px] h-8 opacity-40" aria-hidden>
          {barcode(placeId).map((w, i) => (
            <span key={i} className="h-full bg-[#CBD5E1]" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
};
