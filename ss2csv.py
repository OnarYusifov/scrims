from bs4 import BeautifulSoup
import csv
import os

def next_available_filename(base='match_stats.csv'):
    if not os.path.exists(base):
        return base
    i = 1
    while True:
        candidate = f'match_stats_{i}.csv'
        if not os.path.exists(candidate):
            return candidate
        i += 1

with open("match.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f, "html.parser")

rows = []
for item in soup.find_all("div", class_="st-content__item"):
    username = item.find("span", class_="trn-ign__username")
    discrim = item.find("span", class_="trn-ign__discriminator")
    rank = item.find("div", class_="rank")
    rank_val = rank.find("span").text.strip() if rank and rank.find("span") else ""
    player = f"{username.text.strip()}{discrim.text.strip()}" if username and discrim else ""
    stats = [v.text.strip() for v in item.find_all("div", class_="value")]
    row = [player, rank_val] + stats
    rows.append(row)

csv_filename = next_available_filename()
with open(csv_filename, "w", encoding="utf-8", newline="") as out:
    writer = csv.writer(out)
    writer.writerow(["player", "rank", "TRS", "ACS", "K", "D", "A", "+/-", "K/D", "DDΔ", "ADR", "HS%", "KAST", "FK", "FD", "MK"])
    for row in rows:
        writer.writerow(row)

print(f"{csv_filename} dosyasına {len(rows)} oyuncu başarıyla yazıldı.")
