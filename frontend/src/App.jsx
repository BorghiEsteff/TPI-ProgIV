import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppNavbar from './components/layout/AppNavbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import CatalogPage from './pages/CatalogPage';
import LoginPage from './pages/LoginPage';
import MediaDetailPage from './pages/MediaDetailPage';
import MyTrackingPage from './pages/MyTrackingPage';
import RegisterPage from './pages/RegisterPage';
import WatchRoomPage from './pages/WatchRoomPage';

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
                <Route path="/watch-rooms/:mediaId" element={<WatchRoomPage />} />
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
