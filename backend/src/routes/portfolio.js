const express = require('express');
const verifyToken = require('../middleware/auth');
const pool = require('../config/db');
const finnhub = require('../services/finnhub');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const [portfolios] = await pool.query(
      'SELECT * FROM portfolios WHERE user_id = ?',
      [req.user.id]
    );
    if (portfolios.length === 0) return res.status(404).json({ error: 'Portfolio not found' });

    const portfolio = portfolios[0];
    const [holdings] = await pool.query(
      'SELECT * FROM holdings WHERE portfolio_id = ? AND quantity > 0',
      [portfolio.id]
    );

    const holdingsWithPrices = await Promise.all(
      holdings.map(async (h) => {
        try {
          const q = await finnhub.quote(h.symbol);
          const currentPrice = q.c || 0;
          const currentValue = currentPrice * Number(h.quantity);
          const costBasis = Number(h.avg_cost_price) * Number(h.quantity);
          return {
            ...h,
            current_price: currentPrice,
            current_value: currentValue,
            cost_basis: costBasis,
            pnl: currentValue - costBasis,
            pnl_percent: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0,
          };
        } catch {
          return { ...h, current_price: 0, current_value: 0, cost_basis: 0, pnl: 0, pnl_percent: 0 };
        }
      })
    );

    const investedValue = holdingsWithPrices.reduce((s, h) => s + h.current_value, 0);
    const totalValue = Number(portfolio.cash_balance) + investedValue;

    res.json({
      cash_balance: Number(portfolio.cash_balance),
      invested_value: investedValue,
      total_value: totalValue,
      holdings: holdingsWithPrices,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

router.post('/buy', verifyToken, async (req, res) => {
  const { symbol, quantity } = req.body;
  if (!symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid symbol or quantity' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [portfolios] = await conn.query(
      'SELECT * FROM portfolios WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    if (portfolios.length === 0) throw new Error('Portfolio not found');
    const portfolio = portfolios[0];

    const quote = await finnhub.quote(symbol.toUpperCase());
    const price = quote.c;
    if (!price || price <= 0) throw new Error('Unable to get current price');

    const total = price * quantity;
    if (Number(portfolio.cash_balance) < total) {
      await conn.rollback();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    await conn.query(
      'UPDATE portfolios SET cash_balance = cash_balance - ? WHERE id = ?',
      [total, portfolio.id]
    );

    const [existing] = await conn.query(
      'SELECT * FROM holdings WHERE portfolio_id = ? AND symbol = ?',
      [portfolio.id, symbol.toUpperCase()]
    );

    if (existing.length > 0) {
      const h = existing[0];
      const newQty = Number(h.quantity) + Number(quantity);
      const newAvg = (Number(h.avg_cost_price) * Number(h.quantity) + total) / newQty;
      await conn.query(
        'UPDATE holdings SET quantity = ?, avg_cost_price = ? WHERE id = ?',
        [newQty, newAvg, h.id]
      );
    } else {
      await conn.query(
        'INSERT INTO holdings (portfolio_id, symbol, quantity, avg_cost_price) VALUES (?, ?, ?, ?)',
        [portfolio.id, symbol.toUpperCase(), quantity, price]
      );
    }

    await conn.query(
      'INSERT INTO transactions (portfolio_id, type, symbol, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)',
      [portfolio.id, 'BUY', symbol.toUpperCase(), quantity, price, total]
    );

    await conn.commit();
    res.json({ message: 'Purchase successful', symbol: symbol.toUpperCase(), quantity, price, total });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Purchase failed' });
  } finally {
    conn.release();
  }
});

router.post('/sell', verifyToken, async (req, res) => {
  const { symbol, quantity } = req.body;
  if (!symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid symbol or quantity' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [portfolios] = await conn.query(
      'SELECT * FROM portfolios WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    if (portfolios.length === 0) throw new Error('Portfolio not found');
    const portfolio = portfolios[0];

    const [holdings] = await conn.query(
      'SELECT * FROM holdings WHERE portfolio_id = ? AND symbol = ? FOR UPDATE',
      [portfolio.id, symbol.toUpperCase()]
    );
    if (holdings.length === 0 || Number(holdings[0].quantity) < quantity) {
      await conn.rollback();
      return res.status(400).json({ error: 'Insufficient shares' });
    }

    const quote = await finnhub.quote(symbol.toUpperCase());
    const price = quote.c;
    if (!price || price <= 0) throw new Error('Unable to get current price');

    const total = price * quantity;
    const h = holdings[0];
    const newQty = Number(h.quantity) - Number(quantity);

    if (newQty === 0) {
      await conn.query('DELETE FROM holdings WHERE id = ?', [h.id]);
    } else {
      await conn.query('UPDATE holdings SET quantity = ? WHERE id = ?', [newQty, h.id]);
    }

    await conn.query(
      'UPDATE portfolios SET cash_balance = cash_balance + ? WHERE id = ?',
      [total, portfolio.id]
    );

    await conn.query(
      'INSERT INTO transactions (portfolio_id, type, symbol, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)',
      [portfolio.id, 'SELL', symbol.toUpperCase(), quantity, price, total]
    );

    await conn.commit();
    res.json({ message: 'Sale successful', symbol: symbol.toUpperCase(), quantity, price, total });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Sale failed' });
  } finally {
    conn.release();
  }
});

module.exports = router;
