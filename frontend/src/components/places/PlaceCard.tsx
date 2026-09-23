import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Sparkles } from 'lucide-react';

export const PLACE_FALLBACK_IMAGE = '/cinematic/nandi_hills_hero.jpg';

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
}

interface PlaceCardProps {
  place: PlaceCardData;
  index?: number;
  /** Omit to render without the scroll-reveal entry. */
  visible?: boolean;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, index = 0, visible }) => {
  const revealClass = visible === undefined ? '' : `reveal ${visible ? 'visible' : ''}`;

  return (
    <Link
      to={`/places/${place.id || place.slug}`}
      className={`place-card group block rounded-[20px] overflow-hidden bg-[#141820] card-shadow ${revealClass}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={place.image_url || PLACE_FALLBACK_IMAGE}
          alt={place.name}
          referrerPolicy="no-referrer"
          className="place-card-img w-full h-full object-cover brightness-90 group-hover:brightness-100"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACE_FALLBACK_IMAGE; }}
        />
        <div className="absolute inset-0 img-gradient-bottom" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {place.is_hidden_gem && (
            <span className="badge badge-amber">
              <Sparkles className="w-2.5 h-2.5" /> Hidden Gem
            </span>
          )}
          <span className="badge glass text-white/80">{place.category}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="text-heading text-white text-lg mb-1 group-hover:text-[#F59E0B] transition-colors duration-200 line-clamp-1">
          {place.name}
        </h3>

        <div className="flex items-center gap-3 text-label text-[#64748B] mb-3">
          {place.distance_km != null && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#F59E0B]" />
              {place.distance_km} KM
            </span>
          )}
          {place.distance_km != null && place.duration && <span className="w-px h-3 bg-[#334155]" />}
          {place.duration && <span>{place.duration}</span>}
        </div>

        <p className="text-sm text-[#64748B] line-clamp-2 leading-relaxed mb-4">
          {place.description}
        </p>

        <div className="flex items-center justify-between text-xs border-t border-[rgba(255,255,255,0.06)] pt-4">
          <span className="text-[#F59E0B] font-semibold font-mono">
            {place.budget_tier ? `~₹${place.budget_tier}` : 'Free'}
          </span>
          <span className="text-[#475569]">{place.best_season || 'All seasons'}</span>
        </div>
      </div>
    </Link>
  );
};
