import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Market.css';

const POPULAR = ['AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','JPM','V','JNJ'];

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(n);
}

export default function Market() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [searching, setSearching] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.get('/stocks/search', { params: { q: query } });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function loadPopularQuotes() {
    setLoadingQuotes(true);
    const entries = await Promise.all(
      POPULAR.map(async (sym) => {
        try {
          const { data } = await api.get(`/stocks/quote/${sym}`);
          return [sym, data];
        } catch { return [sym, null]; }
      })
    );
    setQuotes(Object.fromEntries(entries));
    setLoadingQuotes(false);
  }

  useState(() => { loadPopularQuotes(); }, []);

  return (
    <div className="dashboard">
      <div className="page-header"><h1>Mercado</h1></div>

      <form onSubmit={handleSearch} className="search-bar card">
        <input
          type="text"
          placeholder="Buscar acción por nombre o símbolo... (ej. Apple, AAPL)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button className="btn-primary" disabled={searching}>
          {searching ? '...' : 'Buscar'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header"><h2>Resultados</h2></div>
          <div className="card" style={{ padding: 0 }}>
            <table className="market-table">
              <thead><tr><th>Símbolo</th><th>Empresa</th><th>Tipo</th><th></th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.symbol}>
                    <td className="symbol-link-cell"><Link to={`/trading/stock/${r.symbol}`}>{r.symbol}</Link></td>
                    <td>{r.description}</td>
                    <td className="tag-muted">{r.type}</td>
                    <td><Link to={`/trading/stock/${r.symbol}`} className="btn-primary" style={{ padding:'4px 12px', fontSize:12, borderRadius:6 }}>Ver</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Acciones populares</h2>
          <button className="btn-ghost" onClick={loadPopularQuotes} style={{ fontSize:12 }}>Actualizar</button>
        </div>
        {loadingQuotes ? <div className="spinner" /> : (
          <div className="popular-grid">
            {POPULAR.map((sym) => {
              const q = quotes[sym];
              const change = q?.d || 0;
              const changePct = q?.dp || 0;
              return (
                <Link key={sym} to={`/trading/stock/${sym}`} className="popular-card card">
                  <div className="popular-symbol">{sym}</div>
                  <div className="popular-price">{q ? fmt(q.c) : '—'}</div>
                  <div className={`popular-change ${change >= 0 ? 'tag-green' : 'tag-red'}`}>
                    {q ? `${change >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
