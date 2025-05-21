#!/usr/bin/env python3
# ps5_rachat_full_process.py

import pandas as pd
import requests
from bs4 import BeautifulSoup
import re
import time

def get_lowest_price_ebay_ps5(game):
    """Récupère le prix le plus bas disponible sur eBay FR pour 'game PS5'."""
    query = "+".join(game.split())
    url = f"https://www.ebay.fr/sch/i.html?_nkw={query}+PS5&_sop=15"
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    prices = []
    for tag in soup.select(".s-item__price"):
        text = tag.get_text()
        m = re.search(r"(\d+[\.,]?\d*)", text)
        if m:
            prices.append(float(m.group(1).replace(",", ".")))
    return min(prices) if prices else None

def get_lowest_price_leboncoin_ps5(game):
    """Récupère le prix le plus bas disponible sur Le Bon Coin pour 'game PS5'."""
    query = "+".join(game.split())
    url = f"https://www.leboncoin.fr/recherche?text={query}+PS5"
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    prices = []
    for tag in soup.select("span.AdCard_price__YVdGl"):
        text = tag.get_text()
        m = re.search(r"(\d+[\.,]?\d*)", text)
        if m:
            prices.append(float(m.group(1).replace(",", ".")))
    return min(prices) if prices else None

# 1) Récupération de la liste des jeux PS5
wiki_url = "https://en.wikipedia.org/wiki/List_of_PlayStation_5_games"
tables   = pd.read_html(wiki_url)

# 2) On recherche la table qui a une colonne "Title"
df = None
for tbl in tables:
    cols = [str(c) for c in tbl.columns]
    if any("Title" in c for c in cols):
        df = tbl
        break
if df is None:
    raise RuntimeError("Table des jeux PS5 introuvable")

# 3) On prend la première colonne et on la renomme en "nom"
first_col  = df.columns[0]
df_games   = df[[first_col]].rename(columns={ first_col: "nom" })


# 2) Scraping des prix et calcul du rachat
records = []
for game in df_games["nom"]:
    title = f"{game} PS5"
    ebay_price = get_lowest_price_ebay_ps5(title)
    lbc_price = get_lowest_price_leboncoin_ps5(title)
    candidates = [p for p in (ebay_price, lbc_price) if p is not None]
    if candidates:
        revente = min(candidates)
        rachat  = round(revente / 3, 2)
        # Jauge de risque
        if   revente >= 40: risk = 1
        elif revente >= 30: risk = 2
        elif revente >= 20: risk = 3
        elif revente >= 10: risk = 4
        else:               risk = 5
    else:
        revente = None
        rachat  = None
        risk    = None

    records.append({
        "nom":        game,
        "plateforme":"PS5",
        "revente":    revente,
        "rachat":     rachat,
        "risque":     risk
    })
    time.sleep(1)  # pour ne pas surcharger les serveurs

# 3) Export en CSV
df_out = pd.DataFrame(records)
df_out.to_csv("ps5_rachat_full_process.csv", index=False, encoding="utf-8-sig")
print("Fichier généré : ps5_rachat_full_process.csv")

