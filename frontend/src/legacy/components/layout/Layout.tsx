import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useInteractiveEffects } from '../../hooks/useInteractiveEffects';
import { useLenis } from '../../hooks/useLenis';
import { isFullBleed } from '../../utils/routes';

export const Layout = () => {
  const { pathname } = useLocation();
  useInteractiveEffects();
  useLenis();

  return (
    <div className="flex flex-col min-h-screen bg-sand">
      <Navbar />
      <main className={`flex-grow flex flex-col ${isFullBleed(pathname) ? '' : 'pt-28'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
