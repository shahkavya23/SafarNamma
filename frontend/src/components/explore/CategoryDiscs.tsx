import { useMemo, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Place } from '../../types';
import { optimizeImageUrl, photoSrc } from '../../utils/images';
import { ALL_KEY, themeFor } from '../../utils/categoryThemes';
import DiscCascadeCarousel, { type DiscCascadeItem, type DiscCredit } from '../ui/disc-cascade-carousel';

type Disc = { key: string; label: string; count: number; photo: string; top?: Place };

// Best-rated places with a photo come first, so each disc is printed with its strongest picture
const byRating = (list: Place[]) => list.filter((p) => p.image_url).sort((a, b) => (b.rating || 0) - (a.rating || 0));

const buildDiscs = (places: Place[]): Disc[] => {
  const groups = new Map<string, Place[]>();
  places.forEach((p) => p.category && groups.set(p.category, [...(groups.get(p.category) || []), p]));

  const disc = (key: string, label: string, list: Place[]): Disc => {
    const top = byRating(list)[0];
    const theme = themeFor(key);
    return {
      key,
      label,
      count: list.length,
      // The front disc is up to 420px wide, so ~1000px+ keeps it crisp on high-density screens
      photo: (!theme.ownPhoto && optimizeImageUrl(top?.image_url, 1200)) || photoSrc(theme.photo, 1600),
      top,
    };
  };

  return [
    disc(ALL_KEY, 'All places', places),
    ...[...groups].sort((a, b) => b[1].length - a[1].length).map(([name, list]) => disc(name, name, list)),
  ];
};

const toItem = (d: Disc): DiscCascadeItem => {
  const credits: DiscCredit[] = [{ label: 'Places', value: String(d.count) }];
  if (d.top) credits.push({ label: 'Top pick', value: d.top.name });
  if (d.top?.rating) credits.push({ label: 'Best rated', value: `${d.top.rating.toFixed(1)} ★` });
  return {
    title: d.label,
    src: d.photo,
    alt: '',
    credits,
    fine: `${d.count} ${d.count === 1 ? 'place' : 'places'}  ·  around Bengaluru`,
  };
};

// The carousel reads shadcn-style tokens for its focus rings and Index menu; point them at the page theme
const TOKENS = {
  '--color-background': 'var(--color-paper)',
  '--color-foreground': 'var(--color-ink)',
  '--color-primary': 'var(--color-accent)',
} as CSSProperties;

/* The Explore landing: one printed disc per category plus "All". The disc in front drives the page theme;
   choosing it (or the button below) opens its places. */
export const CategoryDiscs = ({
  places,
  active,
  onActive,
  onSelect,
}: {
  places: Place[];
  active: string;
  onActive: (key: string) => void;
  onSelect: (key: string) => void;
}) => {
  const discs = useMemo(() => buildDiscs(places), [places]);
  const items = useMemo(() => discs.map(toItem), [discs]);
  const index = Math.max(0, discs.findIndex((d) => d.key === active));
  const current = discs[index];

  return (
    <div style={TOKENS}>
      <DiscCascadeCarousel
        items={items}
        index={index}
        defaultIndex={0}
        onIndexChange={(i) => onActive(discs[i].key)}
        onSelect={(_, i) => onSelect(discs[i].key)}
        height="clamp(520px, 74vh, 760px)"
        background="transparent"
        frame={false}
        reviews={false}
        indexLabel="All categories"
        hint="Drag, swipe or use ← →"
        color="var(--color-ink)"
        serif="var(--font-display)"
        sans="inherit"
        ariaLabel="Place categories"
      />
      {current && (
        <div className="flex justify-center -mt-2">
          <button type="button" onClick={() => onSelect(current.key)} className="btn-accent inline-flex items-center gap-2">
            Explore {current.key === ALL_KEY ? 'all places' : current.label} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
