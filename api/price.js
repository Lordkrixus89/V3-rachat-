// api/price.js
const axios   = require('axios');
const cheerio = require('cheerio');

async function scrapeEbay(query) { /* … inchangé … */ }
async function scrapeLeboncoin(query) { /* … inchangé … */ }

module.exports = async (req, res) => {
  const { game, platform='PS5' } = req.query;
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
  const rachat  = +(revente / 3).toFixed(2);
  let risque;
  if      (revente >= 40) risque = 1;
  else if (revente >= 30) risque = 2;
  else if (revente >= 20) risque = 3;
  else if (revente >= 10) risque = 4;
  else                    risque = 5;

  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate');
  res.json({ revente, rachat, risque });
};
