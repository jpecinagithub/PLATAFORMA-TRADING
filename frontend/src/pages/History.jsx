import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { fmt } from '../utils/fmt';
import './History.css';

export default function History() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', symbol: '' });

  function load() {
    const params = {};
    if (filter.type) params.type = filter.type;
    if (filter.symbol) params.symbol = filter.symbol;
    api.get('/transactions', { params })
      .then((r) => setTxs(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="dashboard">
      <div className="page-header"><h1>Historial de operaciones</h1></div>

      <div className="history-filters card">
        <input
          type="text"
          placeholder="Filtrar por símbolo..."
          value={filter.symbol}
          onChange={(e) => setFilter({ ...filter, symbol: e.target.value.toUpperCase() })}
          style={{ width: 180 }}
        />
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
          <option value="">Todos</option>
          <option value="BUY">Compras</option>
          <option value="SELL">Ventas</option>
        </select>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="card table-scroll" style={{ padding: 0 }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Símbolo</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                  Sin operaciones
                </td></tr>
              )}
              {txs.map((tx) => (
                <tr key={tx.id}>
                  <td className="tag-muted">{new Date(tx.executed_at).toLocaleString('es-ES')}</td>
                  <td>
                    <span className={`type-badge ${tx.type === 'BUY' ? 'buy' : 'sell'}`}>{tx.type}</span>
                  </td>
                  <td><Link to={`/trading/stock/${tx.symbol}`} className="symbol-link">{tx.symbol}</Link></td>
                  <td>{Number(tx.quantity).toFixed(4)}</td>
                  <td>{fmt(tx.price)}</td>
                  <td className="font-bold">{fmt(tx.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
