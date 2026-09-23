import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Compass } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth, isAdminEmail } from '../context/AuthContext';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decodedToken: any = jwtDecode(credentialResponse.credential);
      const userEmail = decodedToken.email;

      if (!userEmail.endsWith('@sst.scaler.com')) {
        setError('Access denied. Please use your @sst.scaler.com email address.');
        return;
      }

      const assignedRole = isAdminEmail(userEmail) ? ('admin' as const) : ('user' as const);

      const user = {
        id: decodedToken.sub,
        email: userEmail,
        name: decodedToken.name,
        avatar_url: decodedToken.picture || undefined,
        role: assignedRole,
        created_at: new Date().toISOString(),
      };

      await login(user, credentialResponse.credential);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Failed to process Google login.');
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-[#FDFBF7] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
        <div className="text-center">
          <img
            src="/safarnamma-logo.png"
            alt="SafarNamma"
            className="h-20 mx-auto mb-4 drop-shadow-sm"
          />
          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-[#F59E0B] px-3 py-1 rounded-full text-xs font-bold mb-3">
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

          <div className="flex justify-center pt-2">
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
