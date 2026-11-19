import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = () => {
  const { isAuthenticated, loadingAuth, justLoggedOut } = useAuth();
  const location = useLocation();

  if (loadingAuth) {
    return <LoadingSpinner message="Verificando sesion..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={justLoggedOut ? undefined : { from: location }}
        replace
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
