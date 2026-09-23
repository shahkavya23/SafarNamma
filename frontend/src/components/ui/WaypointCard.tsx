import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface WaypointCardProps {
  /** Whether the card is visible */
  isVisible: boolean;
  /** Waypoint title */
  title: string;
  /** Short description */
  description: string;
  /** Micro-tags e.g. ["#HiddenGems", "#FilterCoffee"] */
  tags?: string[];
  /** CTA link URL */
  ctaLink?: string;
  /** CTA label */
  ctaLabel?: string;
  /** Slide direction */
  slideFrom?: 'left' | 'right';
  /** Dark mode (for night scenes) */
  dark?: boolean;
}

/**
 * Frosted-glass slide-in card for waypoint stops along the journey.
 * Slides in from left or right when the scroll reaches the waypoint.
 */
export const WaypointCard: React.FC<WaypointCardProps> = ({
  isVisible,
  title,
  description,
  tags = [],
  ctaLink = '/explore',
  ctaLabel = 'Explore This Area',
  slideFrom = 'left',
  dark = false,
}) => {
  return (
    <div
      className={`
        fixed top-1/2 -translate-y-1/2 z-30 max-w-sm w-full px-4
        transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${slideFrom === 'left' ? 'left-6' : 'right-6'}
        ${isVisible 
          ? 'opacity-100 translate-x-0' 
          : slideFrom === 'left'
            ? 'opacity-0 -translate-x-16 pointer-events-none'
            : 'opacity-0 translate-x-16 pointer-events-none'
        }
      `}
    >
      <div className={`
        rounded-2xl p-6 shadow-2xl border
        ${dark 
          ? 'glass-dark border-white/10' 
          : 'glass-light border-white/40'
        }
      `}>
        {/* Title */}
        <h3 className={`text-xl font-serif font-bold mb-2 ${dark ? 'text-white' : 'text-[#0F172A]'}`}>
          {title}
        </h3>

        {/* Description */}
        <p className={`text-sm leading-relaxed mb-4 ${dark ? 'text-white/70' : 'text-[#475569]'}`}>
          {description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  dark
                    ? 'bg-white/10 text-[#F59E0B]'
                    : 'bg-[#0D5C63]/10 text-[#0D5C63]'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link
          to={ctaLink}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#F59E0B] hover:text-[#EA580C] transition-colors group"
        >
          {ctaLabel}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};
