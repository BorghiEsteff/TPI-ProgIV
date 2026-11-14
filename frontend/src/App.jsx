import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppNavbar from './components/layout/AppNavbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import RoleGuard from './components/layout/RoleGuard';
import { AuthProvider } from './context/AuthContext';
import AdminMediaEditPage from './pages/AdminMediaEditPage';
import AdminSubmissionsPage from './pages/AdminSubmissionsPage';
import CatalogPage from './pages/CatalogPage';
import LoginPage from './pages/LoginPage';
import MediaDetailPage from './pages/MediaDetailPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import MyTrackingPage from './pages/MyTrackingPage';
import NewEntryPage from './pages/NewEntryPage';
import RecommendationsPage from './pages/RecommendationsPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="d-flex flex-column min-vh-100 bg-light">
          <AppNavbar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<CatalogPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/media/:id" element={<MediaDetailPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/my-tracking" element={<MyTrackingPage />} />
                <Route path="/my-cinetrack" element={<MyTrackingPage />} />
                <Route path="/new-entry" element={<NewEntryPage />} />
                <Route path="/my-submissions" element={<MySubmissionsPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
                <Route
                  path="/admin/submissions"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']} fallback="message">
                      <AdminSubmissionsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/admin/media/:id"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']} fallback="message">
                      <AdminMediaEditPage />
                    </RoleGuard>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
