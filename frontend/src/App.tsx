import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { PresenceProvider } from './context/PresenceContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { SampleTripSheet } from './components/groups/SampleTripSheet';
import { lazyPage } from './utils/lazyPage';
import { ITINERARIES_ADMIN_ONLY } from './utils/features';

// Every page but the landing one loads on first visit, so the home page doesn't wait on the whole app
const ExplorePage = lazyPage(() => import('./pages/ExplorePage'), 'ExplorePage');
const ItinerariesPage = lazyPage(() => import('./pages/ItinerariesPage'), 'ItinerariesPage');
const ItineraryDetailsPage = lazyPage(() => import('./pages/ItineraryDetailsPage'), 'ItineraryDetailsPage');
const PlaceDetailsPage = lazyPage(() => import('./pages/PlaceDetailsPage'), 'PlaceDetailsPage');
const GroupsPage = lazyPage(() => import('./pages/GroupsPage'), 'GroupsPage');
const GroupDetailsPage = lazyPage(() => import('./pages/GroupDetailsPage'), 'GroupDetailsPage');
const TripStoryPage = lazyPage(() => import('./pages/TripStoryPage'), 'TripStoryPage');
const SubmitPlacePage = lazyPage(() => import('./pages/SubmitPlacePage'), 'SubmitPlacePage');
const EditPlacePage = lazyPage(() => import('./pages/EditPlacePage'), 'EditPlacePage');
const LoginPage = lazyPage(() => import('./pages/LoginPage'), 'LoginPage');
const RegisterPage = lazyPage(() => import('./pages/RegisterPage'), 'RegisterPage');
const UserProfilePage = lazyPage(() => import('./pages/UserProfilePage'), 'UserProfilePage');
const AdminDashboard = lazyPage(() => import('./pages/AdminDashboard'), 'AdminDashboard');

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <PresenceProvider>
        <BrowserRouter>
          {/* Opens from any sample trip card on the home board or Groups page */}
          <SampleTripSheet />
          <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="itineraries" element={
              <ProtectedRoute requireAdmin={ITINERARIES_ADMIN_ONLY}>
                <ItinerariesPage />
              </ProtectedRoute>
            } />
            <Route path="itineraries/:id" element={
              <ProtectedRoute requireAdmin={ITINERARIES_ADMIN_ONLY}>
                <ItineraryDetailsPage />
              </ProtectedRoute>
            } />
            
            <Route path="places/:slug" element={
              <ProtectedRoute>
                <PlaceDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="groups" element={
              <ProtectedRoute>
                <GroupsPage />
              </ProtectedRoute>
            } />
            <Route path="groups/:id" element={
              <ProtectedRoute requireStudent>
                <GroupDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="groups/:id/story" element={
              <ProtectedRoute requireStudent>
                <TripStoryPage />
              </ProtectedRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="submit" element={
              <ProtectedRoute>
                <SubmitPlacePage />
              </ProtectedRoute>
            } />
            <Route path="edit/:id" element={
              <ProtectedRoute requireAdmin={true}>
                <EditPlacePage />
              </ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            } />
            
            {/* Auth Routes */}
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />

            {/*Admin Route*/}
            <Route path="admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
        </BrowserRouter>
        </PresenceProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}

export default App;
