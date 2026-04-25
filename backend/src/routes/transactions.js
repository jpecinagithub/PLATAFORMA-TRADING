const express = require('express');
const verifyToken = require('../middleware/auth');
const pool = require('../config/db');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const { symbol, type, limit = 50, offset = 0 } = req.query;

  try {
    const [portfolios] = await pool.query(
      'SELECT id FROM portfolios WHERE user_id = ?',
      [req.user.id]
    );
    if (portfolios.length === 0) return res.status(404).json({ error: 'Portfolio not found' });

    let query = 'SELECT * FROM transactions WHERE portfolio_id = ?';
    const params = [portfolios[0].id];

    if (symbol) { query += ' AND symbol = ?'; params.push(symbol.toUpperCase()); }
    if (type) { query += ' AND type = ?'; params.push(type.toUpperCase()); }

    query += ' ORDER BY executed_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
