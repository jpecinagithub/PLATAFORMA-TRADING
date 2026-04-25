const axios = require('axios');

const BASE = 'https://finnhub.io/api/v1';

function client() {
  return axios.create({
    baseURL: BASE,
    params: { token: process.env.FINNHUB_API_KEY },
    timeout: 10000,
  });
}

async function quote(symbol) {
  const { data } = await client().get('/quote', { params: { symbol } });
  return data;
}

async function searchSymbol(query) {
  const { data } = await client().get('/search', { params: { q: query } });
  return data;
}

async function companyProfile(symbol) {
  const { data } = await client().get('/stock/profile2', { params: { symbol } });
  return data;
}

async function companyNews(symbol) {
  const to = new Date().toISOString().split('T')[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const from = fromDate.toISOString().split('T')[0];
  const { data } = await client().get('/company-news', { params: { symbol, from, to } });
  return data;
}

module.exports = { quote, searchSymbol, companyProfile, companyNews };
