import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const NAV = [
  { to: '/trading/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/trading/market',    label: 'Mercado',   icon: '◈' },
  { to: '/trading/portfolio', label: 'Portfolio', icon: '◉' },
  { to: '/trading/watchlist', label: 'Watchlist', icon: '★' },
  { to: '/trading/history',   label: 'Historial', icon: '≡' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/trading/login');
  }

  return (
    <div className="layout">
      {/* Sidebar desktop */}
      <aside className="sidebar">
        <div className="sidebar-brand">TradingApp</div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.username}</div>
          <button className="btn-ghost" onClick={handleLogout}>Salir</button>
        </div>
      </aside>

      {/* Logout móvil */}
      <button className="btn-ghost mobile-logout" onClick={handleLogout} style={{ fontSize: 12, padding: '5px 10px' }}>
        Salir
      </button>

      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom nav móvil */}
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => isActive ? 'bottom-nav-item active' : 'bottom-nav-item'}
          >
            <span className="bottom-nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
