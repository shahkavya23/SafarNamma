import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireStudent?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false, requireStudent = false }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isAdmin, isStudent, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    // Redirect to login page but save the location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // User is logged in but not an admin
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-500 mb-8">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (requireStudent && !isStudent) {
    // Signed in with a non-SST account: trips stay locked
    const switchAccount = () => {
      logout();
      navigate('/login', { state: { from: location } });
    };
    return (
      <div className="flex flex-col items-center justify-center py-28 px-4 text-center">
        <span className="w-16 h-16 rounded-full bg-sage-soft text-sage-text flex items-center justify-center mb-6">
          <Lock className="w-7 h-7" />
        </span>
        <h1 className="font-display text-3xl text-ink mb-3">Trips are for SST students</h1>
        <p className="text-muted max-w-md mb-8">
          Only @sst.scaler.com accounts can view trip details, join or host trips. You're signed in as{' '}
          <span className="font-semibold text-ink break-all">{user?.email}</span>.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/groups" className="btn-ghost">Back to trips</Link>
          <button type="button" onClick={switchAccount} className="btn-primary">Switch account</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
