import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Navigation, Sparkles, Star } from 'lucide-react';
import type { Place } from '../../types';
import { fallbackPhoto, optimizeImageUrl } from '../../utils/images';
import { formatBudget, shortLocation } from '../../utils/format';

/** The trip's place as a wide card: photo beside the story, with links to the place page and to maps. */
export const DestinationFeature = ({ place }: { place: Place }) => {
  const fallback = fallbackPhoto(place.id);
  const rating = typeof place.rating === 'number' && place.rating > 0 ? place.rating : null;
  const location = shortLocation(place.state);
  const href = `/places/${place.id}`;

  return (
    <article className="place-card group relative grid sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] rounded-[22px] overflow-hidden bg-paper card-shadow">
      <Link to={href} className="relative block aspect-[4/3] sm:aspect-auto sm:min-h-[260px] overflow-hidden bg-stone" aria-label={`See ${place.name}`}>
        <img
          src={optimizeImageUrl(place.image_url, 900) || fallback}
          alt={place.name}
          referrerPolicy="no-referrer"
          className="place-card-img absolute inset-0 w-full h-full object-cover"
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
      </Link>

      <div className="flex flex-col p-6 sm:p-7 min-w-0">
        {location && (
          <p className="flex items-center gap-1.5 text-label text-muted mb-2 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}
        <h3 className="font-display text-2xl sm:text-[1.75rem] leading-snug text-ink font-semibold">{place.name}</h3>
        {place.description && <p className="text-sm text-muted line-clamp-3 leading-relaxed mt-2">{place.description}</p>}

        <dl className="flex flex-wrap gap-x-8 gap-y-2 mt-5">
          <div>
            <dt className="text-label text-muted">Entry</dt>
            <dd className="text-sm font-bold text-accent-text mt-0.5">{formatBudget(place.budget_tier)}</dd>
          </div>
          <div>
            <dt className="text-label text-muted">Best time</dt>
            <dd className="text-sm font-semibold text-ink mt-0.5">{place.best_season || 'Good all year'}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2.5 mt-auto pt-6">
          <Link to={href} className="btn-primary !py-2.5 !px-5 !text-sm">
            See the place <ArrowRight className="w-4 h-4" />
          </Link>
          {place.map_link && (
            <a href={place.map_link} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2.5 !px-5 !text-sm">
              <Navigation className="w-4 h-4" /> Open in Maps
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
