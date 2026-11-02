import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useInteractiveEffects } from '../../hooks/useInteractiveEffects';
import { useLenis } from '../../hooks/useLenis';
import { TripOpeningOverlay } from '../groups/TripOpeningOverlay';
import { isFullBleed } from '../../utils/routes';

export const Layout = () => {
  const { pathname } = useLocation();
  useInteractiveEffects();
  useLenis();

  return (
    <div className="flex flex-col min-h-screen bg-sand">
      <Navbar />
      <main className={`flex-grow flex flex-col ${isFullBleed(pathname) ? '' : 'pt-28'}`}>
        {/* Pages load on demand; the navbar and footer stay put while one arrives */}
        <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <TripOpeningOverlay />
    </div>
  );
};
