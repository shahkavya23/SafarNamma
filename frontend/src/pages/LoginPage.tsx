import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Compass, Loader2, WifiOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth, isAdminEmail } from '../context/AuthContext';
import { authApi } from '../api/client';

/* How long we wait, mid sign-in, before admitting the connection looks slow. */
const SLOW_CONNECTION_HINT_MS = 4000;

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
    setIsSigningIn(true);
    slowTimerRef.current = window.setTimeout(() => setIsSlow(true), SLOW_CONNECTION_HINT_MS);

    try {
      const decodedToken: any = jwtDecode(credentialResponse.credential);
      const userEmail = decodedToken.email;

      if (!userEmail.endsWith('@sst.scaler.com')) {
        setError('Access denied. Please use your @sst.scaler.com email address.');
        return;
      }

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
    } finally {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-[#FDFBF7] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
        {isSigningIn && (
          <div
            className="absolute inset-0 z-10 bg-white/92 backdrop-blur-sm flex flex-col items-center justify-center text-center px-8"
            role="status"
            aria-live="polite"
          >
            <span className="w-14 h-14 rounded-full bg-[#1a4731]/10 flex items-center justify-center mb-5">
              {isSlow ? <WifiOff className="w-6 h-6 text-[#1a4731]" /> : <Loader2 className="w-6 h-6 text-[#1a4731] animate-spin" />}
            </span>
            <p className="font-serif text-lg font-bold text-[#071E22]">
              {isSlow ? 'Still connecting…' : 'Signing you in…'}
            </p>
            <p className="text-sm text-gray-500 mt-1.5 max-w-[26ch]">
              {isSlow ? "Your connection looks slow right now. Hang tight, we haven't given up." : 'Just a moment while we verify your account.'}
            </p>
          </div>
        )}

        <div className="text-center">
          <img
            src="/safarnamma-logo.png"
            alt="SafarNamma"
            className="h-20 mx-auto mb-4 drop-shadow-sm"
          />
          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-[#F2A541] px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Compass className="w-3.5 h-3.5" /> Explorer Portal
          </div>
          <h2 className="text-3xl font-serif font-bold text-[#071E22]">Student Sign In</h2>
          <p className="mt-2 text-sm text-gray-500">
            Sign in with your SST Scaler student email to access expeditions and custom routes.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className={`flex justify-center pt-2 ${isSigningIn ? 'pointer-events-none opacity-40' : ''}`}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Sign-In failed')}
              useOneTap
            />
          </div>

          <div className="pt-4 text-center">
            <p className="text-xs text-gray-400">
              By continuing, you agree to SafarNamma's Traveler Community Guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
