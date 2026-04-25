const axios = require('axios');

const INTERVAL_MAP = { '5': '5m', '15': '15m', '60': '60m', D: '1d', W: '1wk', M: '1mo' };

async function candles(symbol, resolution, fromTs, toTs) {
  const interval = INTERVAL_MAP[resolution] || '1d';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const { data } = await axios.get(url, {
    params: {
      period1: fromTs,
      period2: toTs,
      interval,
      includePrePost: false,
      events: 'div,splits',
    },
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
    timeout: 15000,
  });

  const result = data?.chart?.result?.[0];
  if (!result) return { s: 'no_data' };

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};

  if (timestamps.length === 0) return { s: 'no_data' };

  const valid = timestamps.reduce((acc, t, i) => {
    if (quote.open?.[i] != null && quote.close?.[i] != null) {
      acc.t.push(t);
      acc.o.push(quote.open[i]);
      acc.h.push(quote.high[i]);
      acc.l.push(quote.low[i]);
      acc.c.push(quote.close[i]);
      acc.v.push(quote.volume?.[i] || 0);
    }
    return acc;
  }, { t: [], o: [], h: [], l: [], c: [], v: [] });

  if (valid.t.length === 0) return { s: 'no_data' };

  return { s: 'ok', ...valid };
}

module.exports = { candles };
