import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Sparkles, Star } from 'lucide-react';
import { fallbackPhoto, optimizeImageUrl, photoSrc } from '../../utils/images';
import { formatBudget, shortLocation } from '../../utils/format';

export const PLACE_FALLBACK_IMAGE = photoSrc('nandi', 800);

export interface PlaceCardData {
  id: number | string;
  slug?: string;
  name: string;
  category: string;
  description: string;
  image_url?: string;
  is_hidden_gem?: boolean;
  distance_km?: number;
  duration?: string;
  best_season?: string;
  budget_tier?: string;
  state?: string;
  rating?: number;
}

interface PlaceCardProps {
  place: PlaceCardData;
  index?: number;
  /** Omit to render without the scroll-reveal entry. */
  visible?: boolean;
  /** Link target; pass null to render a non-interactive preview. */
  to?: string | null;
  /** Override the price line (e.g. a placeholder in a preview). */
  priceLabel?: string;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, index = 0, visible, to, priceLabel }) => {
  const revealClass = visible === undefined ? '' : `reveal ${visible ? 'visible' : ''}`;
  const fallback = fallbackPhoto(place.id);
  const href = to === undefined ? `/places/${place.id || place.slug}` : to;
  const rating = typeof place.rating === 'number' && place.rating > 0 ? place.rating : null;
  const location = shortLocation(place.state);

  const body = (
    <>
      {/* Photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-stone">
        <img
          src={optimizeImageUrl(place.image_url, 800) || fallback}
          alt={place.name}
          referrerPolicy="no-referrer"
          className="place-card-img w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.endsWith(fallback)) img.src = fallback;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night/55 via-transparent to-night/10" />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <span className="badge glass-dark">{place.category}</span>
          {place.is_hidden_gem && (
            <span className="badge bg-accent text-white">
              <Sparkles className="w-3 h-3" /> Hidden gem
            </span>
          )}
        </div>

        {rating && (
          <span className="absolute bottom-3 left-3 badge glass-dark">
            <Star className="w-3 h-3 fill-[#F4C56A] text-[#F4C56A]" /> {rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Story */}
      <div className="flex flex-col flex-1 p-5 pt-4">
        {(location || place.distance_km != null) && (
          <p className="flex items-center gap-1.5 text-label text-muted mb-2 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {location}
              {location && place.distance_km != null ? ' · ' : ''}
              {place.distance_km != null ? `${place.distance_km} km` : ''}
            </span>
          </p>
        )}

        <h3 className="font-display text-[1.4rem] leading-snug tracking-[-0.005em] text-ink font-semibold line-clamp-1 mb-1.5">{place.name}</h3>

        {place.description && <p className="text-sm text-muted line-clamp-2 leading-relaxed">{place.description}</p>}

        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-accent-text">{priceLabel ?? formatBudget(place.budget_tier)}</p>
            <p className="text-xs text-muted truncate">{place.best_season ? `Best in ${place.best_season}` : 'Good all year'}</p>
          </div>
          <span
            aria-hidden
            className="w-10 h-10 shrink-0 rounded-full border border-line-strong flex items-center justify-center text-ink transition-all duration-500 group-hover:bg-ink group-hover:text-sand group-hover:border-ink group-hover:rotate-45"
          >
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </>
  );

  const className = `place-card group relative flex flex-col h-full rounded-[22px] overflow-hidden bg-paper card-shadow ${revealClass}`;
  const style = { transitionDelay: visible === undefined ? undefined : `${index * 70}ms` };

  if (href === null) {
    return (
      <div className={className} style={style}>
        {body}
      </div>
    );
  }

  return (
    <Link to={href} className={className} style={style}>
      {body}
    </Link>
  );
};
