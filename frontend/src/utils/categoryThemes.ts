import type { CSSProperties } from 'react';
import type { PhotoKey } from './images';

/* A look per place category. The Explore page sets these as the theme's CSS variables, so every
   bg-sand / text-ink / btn-accent on it re-skins at once. Text colours are chosen for 4.5:1 or better
   against their own background. */
export interface CategoryTheme {
  /** Finishes "Find your next …" */
  word: string;
  sand: string;
  paper: string;
  stone: string;
  ink: string;
  body: string;
  muted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  /** Headline font family (loaded in index.html) */
  display: string;
  dark?: boolean;
  /** Stand-in photo when the category has no place photo yet */
  photo: PhotoKey;
  /** Always show `photo`, even when the category's places have photos of their own */
  ownPhoto?: boolean;
}

const FRAUNCES = "'Fraunces', Georgia, serif";
const CINZEL = "'Cinzel', Georgia, serif";
const DM_SERIF = "'DM Serif Display', Georgia, serif";
const CAPRASIMO = "'Caprasimo', Georgia, serif";
const UNBOUNDED = "'Unbounded', system-ui, sans-serif";

export const ALL_KEY = 'all';

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  // The site's own Hampi sandstone
  [ALL_KEY]: {
    word: 'weekend', sand: '#F2ECE3', paper: '#FBF8F3', stone: '#E7DED1', ink: '#102A2E', body: '#3E4F4F', muted: '#5E6A68',
    accent: '#E0561F', accentText: '#B8461A', accentSoft: '#F7DCCB', display: FRAUNCES, photo: 'chikmagalurHills',
  },
  Nature: {
    word: 'trail', sand: '#E4ECE3', paper: '#F4F8F2', stone: '#D3DFD1', ink: '#0F2A1C', body: '#2F4A3B', muted: '#4D6457',
    accent: '#2F7D4F', accentText: '#24653F', accentSoft: '#CFE5D6', display: FRAUNCES, photo: 'nandi',
  },
  'Religious Places': {
    word: 'temple visit', sand: '#F7EAD9', paper: '#FFF8EE', stone: '#EEDBC2', ink: '#3A1606', body: '#5A3418', muted: '#75512F',
    accent: '#E2720B', accentText: '#A54A05', accentSoft: '#FBD9B3', display: CINZEL, photo: 'hampi',
  },
  Monuments: {
    word: 'history hunt', sand: '#EDE3D6', paper: '#F8F2EA', stone: '#DFD0BC', ink: '#2B1D12', body: '#4D3A2A', muted: '#6B5643',
    accent: '#B4532A', accentText: '#8E3F1E', accentSoft: '#F0D2C0', display: CINZEL, photo: 'hampi',
  },
  Museums: {
    word: 'museum day', sand: '#F1F1EE', paper: '#FFFFFF', stone: '#E2E2DC', ink: '#121417', body: '#34383E', muted: '#5A5F66',
    accent: '#1F4E8C', accentText: '#1F4E8C', accentSoft: '#D8E3F2', display: DM_SERIF, photo: 'ghatsRoad',
  },
  'Cafes & Restaurants': {
    word: 'café', sand: '#F1E6DA', paper: '#FBF5EE', stone: '#E4D3C1', ink: '#2E1B10', body: '#4F3626', muted: '#6E5443',
    accent: '#B26B2E', accentText: '#8A4E1C', accentSoft: '#F1D9C2', display: CAPRASIMO, photo: 'friends',
  },
  'Food Places': {
    word: 'food crawl', sand: '#FBEDE4', paper: '#FFF8F3', stone: '#F3D9C9', ink: '#34100A', body: '#5A2A1E', muted: '#7A4A3C',
    accent: '#E2401B', accentText: '#B3300F', accentSoft: '#FAD1C2', display: CAPRASIMO, photo: 'friends',
  },
  'Street Shopping': {
    word: 'bazaar run', sand: '#FDF0E1', paper: '#FFF9F1', stone: '#F5DCC0', ink: '#2A0F2B', body: '#4D2A4E', muted: '#6E4A6E',
    accent: '#D6127A', accentText: '#B00E63', accentSoft: '#FBD0E5', display: CAPRASIMO, photo: 'commercialStreet', ownPhoto: true,
  },
  Mall: {
    word: 'mall day', sand: '#14121F', paper: '#1E1B2E', stone: '#2A2640', ink: '#F4F1FF', body: '#D6D0EE', muted: '#A9A2C8',
    accent: '#A855F7', accentText: '#C084FC', accentSoft: '#3B2A5C', display: UNBOUNDED, dark: true, photo: 'ghatsSummit',
  },
  Entertainment: {
    word: 'night out', sand: '#180E12', paper: '#24151B', stone: '#351F28', ink: '#FFEFF2', body: '#EBCFD6', muted: '#BF9AA5',
    accent: '#F43F5E', accentText: '#FB7185', accentSoft: '#4A1D2A', display: UNBOUNDED, dark: true, photo: 'ubCityNight', ownPhoto: true,
  },
  'Games & Adventure': {
    word: 'adrenaline rush', sand: '#0D1C17', paper: '#142821', stone: '#1E3A30', ink: '#EEFFF5', body: '#C9E8D6', muted: '#94BBA6',
    accent: '#84CC16', accentText: '#A3E635', accentSoft: '#23401F', display: UNBOUNDED, dark: true, photo: 'skandagiri',
  },
};

export const themeFor = (category?: string | null) => CATEGORY_THEMES[category || ALL_KEY] ?? CATEGORY_THEMES[ALL_KEY];

/** The theme as the CSS variables the site's utilities read (bg-sand, text-ink, btn-accent, borders…). */
export const themeStyle = (t: CategoryTheme): CSSProperties =>
  ({
    '--color-sand': t.sand,
    '--color-paper': t.paper,
    '--color-stone': t.stone,
    '--color-ink': t.ink,
    '--color-body': t.body,
    '--color-muted': t.muted,
    '--color-accent': t.accent,
    '--color-accent-text': t.accentText,
    '--color-accent-soft': t.accentSoft,
    '--color-line': `color-mix(in srgb, ${t.ink} 12%, transparent)`,
    '--color-line-strong': `color-mix(in srgb, ${t.ink} 24%, transparent)`,
    '--font-display': t.display,
    colorScheme: t.dark ? 'dark' : 'light',
  }) as CSSProperties;
