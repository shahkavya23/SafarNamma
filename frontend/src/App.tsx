import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { PresenceProvider } from './context/PresenceContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { PlaceDetailsPage } from './pages/PlaceDetailsPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailsPage } from './pages/GroupDetailsPage';
import { TripStoryPage } from './pages/TripStoryPage';
import { SubmitPlacePage } from './pages/SubmitPlacePage';
import { EditPlacePage } from './pages/EditPlacePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UserProfilePage } from './pages/UserProfilePage';
import {AdminDashboard} from './pages/AdminDashboard'

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <PresenceProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            
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
              <ProtectedRoute>
                <GroupDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="groups/:id/story" element={
              <ProtectedRoute>
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
