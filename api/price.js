// api/price.js
import axios from 'axios'
import cheerio from 'cheerio'

async function scrapeEbay(query) {
  const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=15`
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  const $ = cheerio.load(data)
  const prices = []
  $('.s-item__price').each((i, el) => {
    const m = $(el).text().match(/(\d+[\.,]?\d*)/)
    if (m) prices.push(parseFloat(m[1].replace(',', '.')))
  })
  return prices.length ? Math.min(...prices) : null
}

async function scrapeLeboncoin(query) {
  const url = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(query)}`
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  const $ = cheerio.load(data)
  const prices = []
  $('span.AdCard_price__YVdGl').each((i, el) => {
    const m = $(el).text().match(/(\d+[\.,]?\d*)/)
    if (m) prices.push(parseFloat(m[1].replace(',', '.')))
  })
  return prices.length ? Math.min(...prices) : null
}

export default async function handler(req, res) {
  const { game, platform='PS5' } = req.query
  if (!game) return res.status(400).json({ error: 'Paramètre game manquant' })

  const query = `${game} ${platform}`

  const [ebay, lbc] = await Promise.all([
    scrapeEbay(query),
    scrapeLeboncoin(query)
  ])

  const candidates = [ebay, lbc].filter(x => x != null)
  if (candidates.length === 0) {
    return res.json({ revente: null, rachat: null, risque: null })
  }

  const revente = Math.min(...candidates)
  const rachat  = +(revente / 3).toFixed(2)
  let risque
  if      (revente >= 40) risque = 1
  else if (revente >= 30) risque = 2
  else if (revente >= 20) risque = 3
  else if (revente >= 10) risque = 4
  else                    risque = 5

  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate')
  return res.json({ revente, rachat, risque })
}
