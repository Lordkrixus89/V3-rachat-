// api/price.js
const axios = require('axios');
const { load } = require('cheerio');

async function scrapeEbay(query) {
  const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=15`;
  const { data } = await axios.get(url, { headers:{'User-Agent':'Mozilla/5.0'} });
  const $ = load(data);
  const prices = [];
  $('.s-item__price').each((_, el) => {
    const m = $(el).text().match(/(\d+[\.,]?\d*)/);
    if (m) prices.push(parseFloat(m[1].replace(',', '.')));
  });
  return prices.length ? Math.min(...prices) : null;
}

async function scrapeLeboncoin(query) {
  const url = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers:{'User-Agent':'Mozilla/5.0'} });
  const $ = load(data);
  const prices = [];
  $('span.AdCard_price__YVdGl').each((_, el) => {
    const m = $(el).text().match(/(\d+[\.,]?\d*)/);
    if (m) prices.push(parseFloat(m[1].replace(',', '.')));
  });
  return prices.length ? Math.min(...prices) : null;
}

module.exports = async (req, res) => {
  const { game, platform='PS5' } = req.query;
  if (!game) return res.status(400).json({ error: 'Paramètre game manquant' });

  const q = `${game} ${platform}`;
  const [ebay, lbc] = await Promise.all([
    scrapeEbay(q),
    scrapeLeboncoin(q)
  ]);

  const cand = [ebay, lbc].filter(x => x != null);
  if (cand.length === 0) return res.json({ revente:null, rachat:null, risque:null });

  const revente = Math.min(...cand);
  const rachat  = +(revente/3).toFixed(2);
  let risque;
  if      (revente >= 40) risque = 1;
  else if (revente >= 30) risque = 2;
  else if (revente >= 20) risque = 3;
  else if (revente >= 10) risque = 4;
  else                    risque = 5;

  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate');
  res.json({ revente, rachat, risque });
};
