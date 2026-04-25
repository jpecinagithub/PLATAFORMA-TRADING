import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createChart, ColorType } from 'lightweight-charts';
import api from '../services/api';
import './StockDetail.css';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(n);
}

const RESOLUTIONS = [
  { label: '1D',  value: '5',  days: 1   },
  { label: '5D',  value: '15', days: 5   },
  { label: '1M',  value: 'D',  days: 30  },
  { label: '3M',  value: 'D',  days: 90  },
  { label: '6M',  value: 'D',  days: 180 },
  { label: '1A',  value: 'W',  days: 365 },
];

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [quote, setQuote] = useState(null);
  const [profile, setProfile] = useState(null);
  const [news, setNews] = useState([]);
  const [resolution, setResolution] = useState(RESOLUTIONS[0]);
  const [tradeType, setTradeType] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  const [tradeMsg, setTradeMsg] = useState(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartError, setChartError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/stocks/quote/${symbol}`),
      api.get(`/stocks/profile/${symbol}`),
      api.get(`/stocks/news/${symbol}`),
      api.get('/watchlist'),
    ]).then(([q, p, n, w]) => {
      setQuote(q.data);
      setProfile(p.data);
      setNews(n.data);
      setInWatchlist(w.data.some((i) => i.symbol === symbol.toUpperCase()));
    });
  }, [symbol]);

  useEffect(() => {
    if (!chartRef.current) return;

    setChartError('');
    setLoadingChart(true);

    const el = chartRef.current;
    const width = el.offsetWidth || el.parentElement?.offsetWidth || 600;

    const chart = createChart(el, {
      width,
      height: 350,
      layout: { background: { type: ColorType.Solid, color: '#161b22' }, textColor: '#8b949e' },
      grid: { vertLines: { color: '#30363d' }, horzLines: { color: '#30363d' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#30363d' },
      rightPriceScale: { borderColor: '#30363d' },
    });
    chartInstance.current = chart;

    const series = chart.addCandlestickSeries({
      upColor: '#3fb950', downColor: '#f85149',
      borderUpColor: '#3fb950', borderDownColor: '#f85149',
      wickUpColor: '#3fb950', wickDownColor: '#f85149',
    });

    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth;
      if (w > 0) chart.applyOptions({ width: w });
    });
    ro.observe(el.parentElement || el);

    const to = Math.floor(Date.now() / 1000);
    const from = to - resolution.days * 24 * 60 * 60;

    api.get(`/stocks/candles/${symbol}`, { params: { resolution: resolution.value, from, to } })
      .then(({ data }) => {
        if (data.s === 'ok' && data.t?.length > 0) {
          const candles = data.t.map((t, i) => ({
            time: t,
            open: data.o[i], high: data.h[i],
            low: data.l[i], close: data.c[i],
          }));
          series.setData(candles);
          chart.timeScale().fitContent();
        } else {
          setChartError('Sin datos para este período. Prueba otro rango.');
        }
      })
      .catch(() => setChartError('Error cargando datos del gráfico.'))
      .finally(() => setLoadingChart(false));

    return () => { ro.disconnect(); chart.remove(); };
  }, [symbol, resolution]);

  async function handleTrade(e) {
    e.preventDefault();
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      setTradeMsg({ type: 'error', text: 'Cantidad inválida' });
      return;
    }
    setTradeLoading(true);
    setTradeMsg(null);
    try {
      const endpoint = tradeType === 'BUY' ? '/portfolio/buy' : '/portfolio/sell';
      const { data } = await api.post(endpoint, { symbol: symbol.toUpperCase(), quantity: Number(quantity) });
      setTradeMsg({ type: 'success', text: `${tradeType === 'BUY' ? 'Compra' : 'Venta'} ejecutada: ${data.quantity} x ${fmt(data.price)} = ${fmt(data.total)}` });
      setQuantity('');
      const q = await api.get(`/stocks/quote/${symbol}`);
      setQuote(q.data);
    } catch (err) {
      setTradeMsg({ type: 'error', text: err.response?.data?.error || 'Error en la operación' });
    } finally {
      setTradeLoading(false);
    }
  }

  async function toggleWatchlist() {
    if (inWatchlist) {
      await api.delete(`/watchlist/${symbol}`);
      setInWatchlist(false);
    } else {
      await api.post('/watchlist', { symbol });
      setInWatchlist(true);
    }
  }

  const change = quote?.d || 0;
  const changePct = quote?.dp || 0;
  const estTotal = quote?.c && quantity ? fmt(quote.c * Number(quantity)) : '—';

  return (
    <div className="stock-detail">
      <button className="btn-ghost back-btn" onClick={() => navigate(-1)}>← Volver</button>

      <div className="stock-header">
        <div>
          <div className="stock-symbol">{symbol.toUpperCase()}</div>
          <div className="stock-company">{profile?.name || '—'}</div>
          <div className="stock-meta tag-muted">{profile?.exchange} · {profile?.finnhubIndustry}</div>
        </div>
        <div className="stock-price-block">
          <div className="stock-price">{quote ? fmt(quote.c) : '—'}</div>
          <div className={`stock-change ${change >= 0 ? 'tag-green' : 'tag-red'}`}>
            {change >= 0 ? '+' : ''}{change?.toFixed(2)} ({changePct >= 0 ? '+' : ''}{changePct?.toFixed(2)}%)
          </div>
          <button
            className={inWatchlist ? 'btn-ghost watchlist-btn active' : 'btn-ghost watchlist-btn'}
            onClick={toggleWatchlist}
          >
            {inWatchlist ? '★ En watchlist' : '☆ Añadir'}
          </button>
        </div>
      </div>

      <div className="chart-trade-grid">
        <div>
          <div className="resolution-tabs" style={{ marginBottom: 12 }}>
            {RESOLUTIONS.map((r) => (
              <button
                key={r.label}
                className={resolution.value === r.value && resolution.days === r.days ? 'res-btn active' : 'res-btn'}
                onClick={() => setResolution(r)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            {loadingChart && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#161b22', zIndex:10, fontSize:13, color:'var(--text-muted)' }}>
                Cargando gráfico...
              </div>
            )}
            {chartError && !loadingChart && (
              <div style={{ height:350, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13 }}>
                {chartError}
              </div>
            )}
            <div ref={chartRef} style={{ width: '100%', height: 350 }} />
          </div>
        </div>

        <div className="trade-panel card">
          <h3>Operar</h3>
          <div className="trade-tabs">
            <button className={tradeType === 'BUY' ? 'trade-tab buy active' : 'trade-tab buy'} onClick={() => setTradeType('BUY')}>Comprar</button>
            <button className={tradeType === 'SELL' ? 'trade-tab sell active' : 'trade-tab sell'} onClick={() => setTradeType('SELL')}>Vender</button>
          </div>
          {tradeMsg && (
            <div className={tradeMsg.type === 'error' ? 'error-msg' : 'success-msg'}>
              {tradeMsg.text}
            </div>
          )}
          <form onSubmit={handleTrade} className="trade-form">
            <div className="field">
              <label>Precio actual</label>
              <input type="text" readOnly value={quote ? fmt(quote.c) : '—'} />
            </div>
            <div className="field">
              <label>Cantidad</label>
              <input
                type="number" min="0.0001" step="0.0001"
                placeholder="Ej: 10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="trade-total">
              <span>Total estimado</span>
              <span className="font-bold">{estTotal}</span>
            </div>
            <button
              className={tradeType === 'BUY' ? 'btn-primary trade-btn' : 'btn-danger trade-btn'}
              disabled={tradeLoading}
            >
              {tradeLoading ? '...' : (tradeType === 'BUY' ? 'Comprar' : 'Vender')}
            </button>
          </form>
        </div>
      </div>

      <div className="stock-stats card">
        <h3>Datos de mercado</h3>
        <div className="stats-rows">
          {[
            ['Apertura', fmt(quote?.o)],
            ['Máx. día', fmt(quote?.h)],
            ['Mín. día', fmt(quote?.l)],
            ['Cierre anterior', fmt(quote?.pc)],
            ['Market cap', profile?.marketCapitalization ? `$${(profile.marketCapitalization/1000).toFixed(1)}B` : '—'],
            ['P/E ratio', profile?.pe || '—'],
          ].map(([k, v]) => (
            <div className="stat-row" key={k}>
              <span className="tag-muted">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {news.length > 0 && (
        <div className="news-section">
          <h2>Noticias recientes</h2>
          <div className="news-list">
            {news.map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="news-item card">
                <div className="news-headline">{n.headline}</div>
                <div className="news-meta tag-muted">{n.source} · {new Date(n.datetime * 1000).toLocaleDateString('es-ES')}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
