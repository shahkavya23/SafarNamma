import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, MapPin, Search } from 'lucide-react';
import type { Place } from '../../types';
import { fallbackPhoto, optimizeImageUrl } from '../../utils/images';
import { cn } from '../../utils/cn';

const thumb = (p: Place) => optimizeImageUrl(p.image_url, 160) || fallbackPhoto(p.id);

/* Searchable place picker: shows the chosen place as a card, opens (in place, pushing content down) into a filterable list with thumbnails. */
export const PlacePicker = ({ id, places, value, onChange }: { id: string; places: Place[]; value: string; onChange: (id: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = places.find((p) => String(p.id) === value);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) => [p.name, p.category, p.state].some((s) => s?.toLowerCase().includes(q)));
  }, [places, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus({ preventScroll: true });
    // The list opens in place, so bring all of it above the sheet's sticky footer once it has expanded
    const t = window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 220);
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (p: Place) => {
    onChange(String(p.id));
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => {
          if (!open) setActive(Math.max(0, results.findIndex((p) => String(p.id) === value)));
          setOpen(!open);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn('field !p-2.5 !pr-4 flex items-center gap-3 text-left', open && '!border-ink')}
      >
        {selected ? (
          <>
            <img src={thumb(selected)} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 bg-stone" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink truncate">{selected.name}</span>
              <span className="block text-xs text-muted truncate">
                {selected.category}
                {selected.state && ` · ${selected.state}`}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="w-12 h-12 rounded-xl bg-stone flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-muted" />
            </span>
            <span className="flex-1 text-muted font-normal">Choose a place</span>
          </>
        )}
        <ChevronDown className={cn('w-4 h-4 text-ink shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 rounded-2xl bg-paper border border-line-strong shadow-lg overflow-hidden scroll-mb-28"
          >
            <div className="p-2 border-b border-line">
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Search by name, type or state"
                  className="field !py-2.5 !pl-9 !rounded-xl"
                  aria-label="Search places"
                />
              </div>
            </div>
            <ul ref={listRef} role="listbox" className="max-h-72 overflow-y-auto p-1.5" data-lenis-prevent>
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No places match “{query}”.</li>}
              {results.map((p, i) => {
                const isSel = String(p.id) === value;
                return (
                  <li
                    key={p.id}
                    data-idx={i}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(p)}
                    className={cn('flex items-center gap-3 p-2 rounded-xl cursor-pointer', i === active && 'bg-stone/70')}
                  >
                    <img src={thumb(p)} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-stone" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink truncate">{p.name}</span>
                      <span className="block text-xs text-muted truncate">
                        {p.category}
                        {p.state && ` · ${p.state}`}
                      </span>
                    </span>
                    {isSel && <Check className="w-4 h-4 text-accent-text shrink-0" />}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
