const express = require('express');
const verifyToken = require('../middleware/auth');
const finnhub = require('../services/finnhub');
const yahoo = require('../services/yahoo');

const router = express.Router();

router.get('/search', verifyToken, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter required' });
  try {
    const data = await finnhub.searchSymbol(q);
    const results = (data.result || [])
      .filter(r => r.type === 'Common Stock')
      .slice(0, 10);
    res.json(results);
  } catch {
    res.status(502).json({ error: 'Failed to search symbols' });
  }
});

router.get('/quote/:symbol', verifyToken, async (req, res) => {
  try {
    const data = await finnhub.quote(req.params.symbol.toUpperCase());
    res.json(data);
  } catch {
    res.status(502).json({ error: 'Failed to fetch quote' });
  }
});

router.get('/profile/:symbol', verifyToken, async (req, res) => {
  try {
    const data = await finnhub.companyProfile(req.params.symbol.toUpperCase());
    res.json(data);
  } catch {
    res.status(502).json({ error: 'Failed to fetch company profile' });
  }
});

router.get('/candles/:symbol', verifyToken, async (req, res) => {
  const { resolution = 'D', from, to } = req.query;
  const toTs = to ? parseInt(to) : Math.floor(Date.now() / 1000);
  const fromTs = from ? parseInt(from) : toTs - 90 * 24 * 60 * 60;

  try {
    const data = await yahoo.candles(req.params.symbol.toUpperCase(), resolution, fromTs, toTs);
    res.json(data);
  } catch (err) {
    console.error('Candles error:', err.message, err.stack?.split('\n')[1]);
    res.status(502).json({ error: 'Failed to fetch candles', detail: err.message });
  }
});

router.get('/news/:symbol', verifyToken, async (req, res) => {
  try {
    const data = await finnhub.companyNews(req.params.symbol.toUpperCase());
    res.json((data || []).slice(0, 10));
  } catch {
    res.status(502).json({ error: 'Failed to fetch news' });
  }
});

module.exports = router;
