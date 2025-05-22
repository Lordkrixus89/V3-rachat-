import axios from 'axios';
import cheerio from 'cheerio';

async function scrapeEbay(query) {
  try {
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const $ = cheerio.load(data);
    let prices = [];
    $('span.s-item__price').each((i, el) => {
      const txt = $(el).text().replace(/[^\d,.]/g, '').replace(',', '.');
      const price = parseFloat(txt);
      if (!isNaN(price)) prices.push(price);
    });
    return prices.length ? Math.min(...prices) : null;
  } catch (e) {
    return null;
  }
}

async function scrapeLeboncoin(query) {
  try {
    const url = `https://www.leboncoin.fr/recherche?category=5805&text=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const $ = cheerio.load(data);
    let prices = [];
    $('span.AdCard_price__1L0bX').each((i, el) => {
      const txt = $(el).text().replace(/[^\d,.]/g, '').replace(',', '.');
      const price = parseFloat(txt);
      if (!isNaN(price)) prices.push(price);
    });
    return prices.length ? Math.min(...prices) : null;
  } catch (e) {
    return null;
  }
}

export default async (req, res) => {
  const { game, platform = 'PS5' } = req.query;
  if (!game) return res.status(400).json({ error: 'Paramètre game manquant' });

  const q = `${game} ${platform}`;
  const [ebay, lbc] = await Promise.all([
    scrapeEbay(q),
    scrapeLeboncoin(q)
  ]);
  const cand = [ebay, lbc].filter(x => x != null);
  if (cand.length === 0) {
    return res.json({ revente: null, rachat: null, risque: null });
  }
  const revente = Math.min(...cand);
  const rachat = +(revente / 3).toFixed(2);

  let risque;
  if (revente >= 40) risque = 1;
  else if (revente >= 30) risque = 2;
  else if (revente >= 20) risque = 3;
  else if (revente >= 10) risque = 4;
  else risque = 5;

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.json({ revente, rachat, risque });
};
