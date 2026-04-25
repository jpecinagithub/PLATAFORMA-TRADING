import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Dashboard.css';
import './Portfolio.css';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(n);
}
function fmtPct(n) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portfolio').then((r) => setPortfolio(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const totalPnl = portfolio?.holdings?.reduce((s, h) => s + h.pnl, 0) || 0;
  const totalCost = portfolio?.holdings?.reduce((s, h) => s + h.cost_basis, 0) || 0;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Portfolio</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-label">Valor total</div>
          <div className="stat-value">{fmt(portfolio?.total_value || 0)}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-label">Efectivo</div>
          <div className="stat-value">{fmt(portfolio?.cash_balance || 0)}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-label">Invertido</div>
          <div className="stat-value">{fmt(portfolio?.invested_value || 0)}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-label">P&L total</div>
          <div className={`stat-value ${totalPnl >= 0 ? 'tag-green' : 'tag-red'}`}>{fmt(totalPnl)}</div>
          <div className="stat-sub">{fmtPct(totalPnlPct)}</div>
        </div>
      </div>

      <div className="card table-scroll" style={{ padding: 0 }}>
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Símbolo</th>
              <th>Cantidad</th>
              <th>Precio medio</th>
              <th>Precio actual</th>
              <th>Valor</th>
              <th>P&L</th>
              <th>P&L %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {portfolio?.holdings?.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                Sin posiciones. <Link to="/trading/market">Ir al mercado</Link>
              </td></tr>
            )}
            {portfolio?.holdings?.map((h) => (
              <tr key={h.symbol}>
                <td><Link to={`/trading/stock/${h.symbol}`} className="symbol-link">{h.symbol}</Link></td>
                <td>{Number(h.quantity).toFixed(4)}</td>
                <td>{fmt(h.avg_cost_price)}</td>
                <td>{fmt(h.current_price)}</td>
                <td>{fmt(h.current_value)}</td>
                <td className={h.pnl >= 0 ? 'tag-green' : 'tag-red'}>{fmt(h.pnl)}</td>
                <td className={h.pnl_percent >= 0 ? 'tag-green' : 'tag-red'}>{fmtPct(h.pnl_percent)}</td>
                <td><Link to={`/trading/stock/${h.symbol}`} className="btn-ghost" style={{ padding:'4px 10px', fontSize:12, borderRadius:6 }}>Operar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
