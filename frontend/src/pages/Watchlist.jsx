import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Watchlist.css';

import { fmt } from '../utils/fmt';

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/watchlist').then((r) => setItems(r.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api.post('/watchlist', { symbol: newSymbol.toUpperCase() });
      setNewSymbol('');
      setLoading(true);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al añadir');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(symbol) {
    await api.delete(`/watchlist/${symbol}`);
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
  }

  return (
    <div className="dashboard">
      <div className="page-header"><h1>Watchlist</h1></div>

      <form onSubmit={handleAdd} className="watchlist-add card">
        <input
          type="text"
          placeholder="Añadir símbolo (ej. AAPL)"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
          style={{ width: 200 }}
        />
        <button className="btn-primary" disabled={adding}>{adding ? '...' : 'Añadir'}</button>
        {error && <span className="tag-red" style={{ fontSize:13 }}>{error}</span>}
      </form>

      {loading ? <div className="spinner" /> : (
        <div className="card table-scroll" style={{ padding: 0 }}>
          <table className="watchlist-table">
            <thead>
              <tr>
                <th>Símbolo</th>
                <th>Precio</th>
                <th>Cambio</th>
                <th>Cambio %</th>
                <th>Añadido</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                  Watchlist vacía. Busca acciones en el <Link to="/trading/market">Mercado</Link>.
                </td></tr>
              )}
              {items.map((item) => (
                <tr key={item.symbol}>
                  <td><Link to={`/trading/stock/${item.symbol}`} className="symbol-link">{item.symbol}</Link></td>
                  <td>{fmt(item.current_price)}</td>
                  <td className={item.change >= 0 ? 'tag-green' : 'tag-red'}>
                    {item.change != null ? (item.change >= 0 ? '+' : '') + item.change.toFixed(2) : '—'}
                  </td>
                  <td className={item.change_percent >= 0 ? 'tag-green' : 'tag-red'}>
                    {item.change_percent != null ? (item.change_percent >= 0 ? '+' : '') + item.change_percent.toFixed(2) + '%' : '—'}
                  </td>
                  <td className="tag-muted">{new Date(item.added_at).toLocaleDateString('es-ES')}</td>
                  <td>
                    <button className="btn-ghost" style={{ padding:'4px 10px', fontSize:12 }} onClick={() => handleRemove(item.symbol)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
