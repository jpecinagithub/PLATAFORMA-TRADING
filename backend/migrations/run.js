require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const schema = `
CREATE DATABASE IF NOT EXISTS trading_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trading_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  cash_balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS holdings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
  avg_cost_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_holding (portfolio_id, symbol),
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  type ENUM('BUY', 'SELL') NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(15,6) NOT NULL,
  price DECIMAL(15,4) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watchlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_watchlist (user_id, symbol),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

async function runMigrations() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'trading_pass',
    multipleStatements: true,
  });

  try {
    console.log('Running migrations...');
    await conn.query(schema);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigrations();
