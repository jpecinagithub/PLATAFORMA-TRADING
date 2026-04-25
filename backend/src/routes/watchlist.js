const express = require('express');
const verifyToken = require('../middleware/auth');
const pool = require('../config/db');
const finnhub = require('../services/finnhub');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const [items] = await pool.query(
      'SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC',
      [req.user.id]
    );

    const withQuotes = await Promise.all(
      items.map(async (item) => {
        try {
          const q = await finnhub.quote(item.symbol);
          return { ...item, current_price: q.c, change: q.d, change_percent: q.dp };
        } catch {
          return { ...item, current_price: null, change: null, change_percent: null };
        }
      })
    );

    res.json(withQuotes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    await pool.query(
      'INSERT IGNORE INTO watchlist (user_id, symbol) VALUES (?, ?)',
      [req.user.id, symbol.toUpperCase()]
    );
    res.status(201).json({ message: 'Added to watchlist' });
  } catch {
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

router.delete('/:symbol', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM watchlist WHERE user_id = ? AND symbol = ?',
      [req.user.id, req.params.symbol.toUpperCase()]
    );
    res.json({ message: 'Removed from watchlist' });
  } catch {
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

module.exports = router;
