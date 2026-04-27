import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { fmt, fmtPct } from '../utils/fmt';
import './Dashboard.css';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color || ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portfolio')
      .then((r) => setPortfolio(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const totalPnl = portfolio?.holdings?.reduce((s, h) => s + h.pnl, 0) || 0;
  const totalCost = portfolio?.holdings?.reduce((s, h) => s + h.cost_basis, 0) || 0;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Bienvenido, {user?.username}</h1>
        <p className="tag-muted">Tu portfolio en tiempo real</p>
      </div>

      <div className="stats-grid">
        <StatCard label="Valor total" value={fmt(portfolio?.total_value || 0)} />
        <StatCard label="Efectivo disponible" value={fmt(portfolio?.cash_balance || 0)} />
        <StatCard label="Invertido" value={fmt(portfolio?.invested_value || 0)} />
        <StatCard
          label="P&L total"
          value={fmt(totalPnl)}
          sub={fmtPct(totalPnlPct)}
          color={totalPnl >= 0 ? 'tag-green' : 'tag-red'}
        />
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Posiciones abiertas</h2>
          <Link to="/trading/portfolio">Ver todo</Link>
        </div>
        {portfolio?.holdings?.length === 0 ? (
          <div className="empty-state card">
            <p>No tienes posiciones abiertas.</p>
            <Link to="/trading/market" className="btn-primary" style={{ display:'inline-block', marginTop:12, padding:'8px 16px', borderRadius:8 }}>
              Explorar mercado
            </Link>
          </div>
        ) : (
          <div className="holdings-table card table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Símbolo</th>
                  <th>Cantidad</th>
                  <th>Precio actual</th>
                  <th>Valor</th>
                  <th>P&L</th>
                  <th>P&L %</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.holdings?.slice(0, 5).map((h) => (
                  <tr key={h.symbol}>
                    <td><Link to={`/trading/stock/${h.symbol}`} className="symbol-link">{h.symbol}</Link></td>
                    <td>{Number(h.quantity).toFixed(2)}</td>
                    <td>{fmt(h.current_price)}</td>
                    <td>{fmt(h.current_value)}</td>
                    <td className={h.pnl >= 0 ? 'tag-green' : 'tag-red'}>{fmt(h.pnl)}</td>
                    <td className={h.pnl_percent >= 0 ? 'tag-green' : 'tag-red'}>{fmtPct(h.pnl_percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
