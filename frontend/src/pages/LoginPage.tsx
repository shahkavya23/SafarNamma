import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, Loader2, WifiOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth, isAdminEmail } from '../context/AuthContext';
import { authApi } from '../api/client';
import { DotMatrixBackground } from '../components/ui/dot-matrix-background';

/* How long we wait, mid sign-in, before admitting the connection looks slow. */
const SLOW_CONNECTION_HINT_MS = 4000;

// Google's button takes a fixed pixel width: fill the card, but fit a 360px phone
const googleWidth = () => Math.min(320, Math.max(200, window.innerWidth - 96));

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const slowTimerRef = useRef<number | null>(null);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => () => {
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
  }, []);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setIsSlow(false);

    let decodedToken: any;
    try {
      decodedToken = jwtDecode(credentialResponse.credential);
    } catch {
      setError('Google sign-in failed. Please try again.');
      return;
    }
    const userEmail: string = (decodedToken.email || '').toLowerCase();

    setIsSigningIn(true);
    slowTimerRef.current = window.setTimeout(() => setIsSlow(true), SLOW_CONNECTION_HINT_MS);

    try {
      // The backend verifies the Google token and issues our session token
      const session = await authApi.loginWithGoogle(credentialResponse.credential);
      const assignedRole = session.is_admin && isAdminEmail(userEmail) ? ('admin' as const) : ('user' as const);

      const user = {
        id: decodedToken.sub,
        email: userEmail,
        name: decodedToken.name,
        avatar_url: decodedToken.picture || undefined,
        role: assignedRole,
        created_at: new Date().toISOString(),
      };

      await login(user, session.token);
      // Keep the loader up through the route change so there's no gap before Home paints.
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to process Google login.');
      setIsSigningIn(false);
      setIsSlow(false);
    } finally {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    }
  };

  return (
    <section className="relative flex-grow flex items-center justify-center min-h-[100svh] overflow-hidden bg-night text-sand px-4 pt-28 pb-16">
      {/* Twinkling dot field, with a night vignette so the card sits in a pool of dark */}
      <DotMatrixBackground className="absolute inset-0" />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, rgba(14,31,34,0.85) 0%, rgba(14,31,34,0.55) 45%, rgba(14,31,34,0) 100%)' }}
      />

      <div className="relative z-10 w-full max-w-[400px] rounded-[24px] border border-white/10 bg-night-soft p-6 sm:p-8 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col items-center text-center">
        {isSigningIn && (
          <div
            className="absolute inset-0 z-10 bg-night-soft/95 backdrop-blur-sm flex flex-col items-center justify-center text-center px-8"
            role="status"
            aria-live="polite"
          >
            <span className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mb-5">
              {isSlow ? <WifiOff className="w-6 h-6 text-accent" /> : <Loader2 className="w-6 h-6 text-accent animate-spin" />}
            </span>
            <p className="text-display text-lg text-sand">
              {isSlow ? 'Still connecting…' : 'Signing you in…'}
            </p>
            <p className="text-sm text-sand/70 mt-1.5 max-w-[26ch]">
              {isSlow ? "Your connection looks slow right now. Hang tight, we haven't given up." : 'Just a moment while we verify your account.'}
            </p>
          </div>
        )}

        <span className="rounded-2xl bg-paper px-4 py-2.5 mb-4 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]">
          <img src="/safarnamma-logo.png" alt="SafarNamma" className="h-11 w-auto" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-marigold/30 bg-marigold/10 text-marigold px-3 py-1 text-xs font-bold mb-3">
          <Compass className="w-3.5 h-3.5" /> Explorer Portal
        </span>
        <h1 className="text-display text-sand text-[1.75rem] leading-tight">Sign In</h1>
        <p className="mt-2 text-sm leading-relaxed text-sand/70">
          Sign in with any Google account to explore places. Trips are for SST students, so use your @sst.scaler.com email to join or host one.
        </p>

        <div className="h-px w-full bg-white/10 my-6" />

        {error && (
          <div role="alert" className="w-full mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3.5 text-sm text-red-200 text-left">
            {error}
          </div>
        )}

        <div className={`flex justify-center w-full ${isSigningIn ? 'pointer-events-none opacity-40' : ''}`}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Sign-In failed')}
            useOneTap
            theme="filled_black"
            shape="pill"
            text="continue_with"
            size="large"
            width={googleWidth()}
          />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-sand/55">
          By continuing, you agree to SafarNamma's Traveler Community Guidelines.
        </p>
      </div>
    </section>
  );
};
