import { FileText, Moon, type LucideIcon } from 'lucide-react';
import type { HoursMode } from '../../utils/hours';

interface SwitchRowProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  title: string;
  hint: string;
  icon: LucideIcon;
}

/* One labelled switch row. */
const SwitchRow = ({ checked, onChange, id, title, hint, icon: Icon }: SwitchRowProps) => (
  <label htmlFor={id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 cursor-pointer select-none">
    <span className="flex items-center gap-3">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${checked ? 'bg-[#102A2E] text-[#F2ECE3]' : 'bg-gray-100 text-gray-500'}`}>
        <Icon className="w-4 h-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </span>
    <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
    <span
      aria-hidden
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-[#E0561F] ${checked ? 'bg-[#E0561F]' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </span>
  </label>
);

/* "Open 24/7" and "Check description" switches above the opening/closing time pickers.
   They are mutually exclusive: turning one on turns the other off. With both off, the time pickers show. */
export const HoursModeToggles = ({ mode, onChange, idPrefix = 'hours' }: { mode: HoursMode; onChange: (m: HoursMode) => void; idPrefix?: string }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    <SwitchRow
      id={`${idPrefix}-24-7`}
      title="Open 24/7"
      hint="Never closes"
      icon={Moon}
      checked={mode === '247'}
      onChange={(on) => onChange(on ? '247' : 'times')}
    />
    <SwitchRow
      id={`${idPrefix}-in-description`}
      title="Check description"
      hint="Timings vary, written in the description"
      icon={FileText}
      checked={mode === 'description'}
      onChange={(on) => onChange(on ? 'description' : 'times')}
    />
  </div>
);
