import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Market from './pages/Market';
import StockDetail from './pages/StockDetail';
import History from './pages/History';
import Watchlist from './pages/Watchlist';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  return user ? children : <Navigate to="/trading/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  return user ? <Navigate to="/trading/dashboard" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/trading/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/trading/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/trading" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/trading/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="market" element={<Market />} />
            <Route path="stock/:symbol" element={<StockDetail />} />
            <Route path="history" element={<History />} />
            <Route path="watchlist" element={<Watchlist />} />
          </Route>
          <Route path="*" element={<Navigate to="/trading/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
