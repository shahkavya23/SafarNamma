import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PHOTO_CREDITS } from '../../utils/images';
import { Reveal } from '../motion/Reveal';
import { scrollToTop } from '../../hooks/useLenis';

const DISCOVER = ['Nature', 'Monuments', 'Cafes & Restaurants', 'Games & Adventure', 'Religious Places'];

export const Footer = () => {
  const year = new Date().getFullYear();
  const { pathname } = useLocation();

  return (
    <footer className="band-night relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-page pt-24 pb-10">
        {/* Sign-off */}
        <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 pb-16 border-b border-white/10">
          <div>
            <p className="section-label mb-5">Weekend starts here</p>
            <h2 className="font-display text-sand text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.03em] max-w-3xl">
              See you on the <span className="italic text-[#F4B08A]">road.</span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/explore"
              onClick={() => {
                if (pathname !== '/explore') return;
                scrollToTop();
                // Already on Explore: land the visitor in the search box
                requestAnimationFrame(() => document.getElementById('explore-search')?.focus({ preventScroll: true }));
              }}
              className="btn-primary"
            >
              Find a place <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link to="/groups" onClick={() => pathname === '/groups' && scrollToTop()} className="btn-ghost">
              Join a trip
            </Link>
          </div>
        </Reveal>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 py-14">
          <div className="col-span-2 md:col-span-5">
            <Link to="/" className="inline-block mb-5" aria-label="SafarNamma home">
              <img src="/images/logo-360.webp" alt="SafarNamma" width={360} height={240} className="h-16 w-auto object-contain" loading="lazy" />
            </Link>
            <p className="text-[#AEB8B4] text-sm leading-relaxed max-w-sm">
              Hidden viewpoints, waterfalls and chai stops within a day's drive of Bengaluru, shared by travellers and checked by us before they go live.
            </p>
          </div>

          <nav className="md:col-span-3" aria-label="Discover">
            <h3 className="text-label text-[#7E8B87] mb-5">Discover</h3>
            <ul className="space-y-3">
              {DISCOVER.map((cat) => (
                <li key={cat}>
                  <Link to={`/explore?category=${encodeURIComponent(cat)}`} className="text-[#D8DEDA] hover:text-white text-sm transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="md:col-span-2" aria-label="Community">
            <h3 className="text-label text-[#7E8B87] mb-5">Community</h3>
            <ul className="space-y-3">
              <li><Link to="/groups" className="text-[#D8DEDA] hover:text-white text-sm transition-colors">Travel groups</Link></li>
              <li><Link to="/submit" className="text-[#D8DEDA] hover:text-white text-sm transition-colors">Submit a place</Link></li>
              <li><Link to="/profile" className="text-[#D8DEDA] hover:text-white text-sm transition-colors">Your profile</Link></li>
            </ul>
          </nav>

          <div className="md:col-span-2">
            <h3 className="text-label text-[#7E8B87] mb-5">Photography</h3>
            <ul className="space-y-2">
              {PHOTO_CREDITS.map((c) => (
                <li key={c.url} className="text-xs text-[#AEB8B4] leading-relaxed">
                  {c.place} by{' '}
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-[#D8DEDA] hover:text-white underline decoration-white/20 underline-offset-2">
                    {c.name}
                  </a>
                </li>
              ))}
              <li className="text-xs text-[#7E8B87]">via Unsplash</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-[#7E8B87]">
          <p>© {year} SafarNamma. Made in Bengaluru for weekend wanderers.</p>
          <p className="font-mono tracking-wider">12.9716° N · 77.5946° E</p>
        </div>
      </div>
    </footer>
  );
};
