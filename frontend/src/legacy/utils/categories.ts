import {
  Clapperboard,
  Coffee,
  Flower2,
  Landmark,
  Library,
  Mountain,
  ShoppingBag,
  Sparkles,
  Store,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

/** One icon per place category, shared by the Explore filters and the Submit form. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Religious Places': Flower2,
  Mall: ShoppingBag,
  Entertainment: Clapperboard,
  Monuments: Landmark,
  Museums: Library,
  'Cafes & Restaurants': Coffee,
  Nature: Trees,
  'Games & Adventure': Mountain,
  'Street Shopping': Store,
  'Food Places': UtensilsCrossed,
};

export const categoryIcon = (category: string): LucideIcon => CATEGORY_ICONS[category] ?? Sparkles;
