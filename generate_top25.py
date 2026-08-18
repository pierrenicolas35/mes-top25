import json

# Grille théorique du découpage TOP 25 / Série Bleue France métropolitaine
# 0.20° en longitude (~15 km) x 0.12° en latitude (~13 km)
cartes = []

# Plage des colonnes (01 à 38) et des lignes (10 à 44)
for col in range(1, 39):
    for row in range(10, 45):
        ref = f"{col:02d}{row:02d}"
        
        # Calcul des coordonnées géographiques (WGS84)
        lon_min = round(-5.20 + (col - 1) * 0.30, 4)
        lon_max = round(lon_min + 0.30, 4)
        lat_max = round(51.20 - (row - 10) * 0.18, 4)
        lat_min = round(lat_max - 0.18, 4)

        # Filtre approximatif sur la boîte englobante France
        if -5.5 <= lon_min <= 9.8 and 41.3 <= lat_min <= 51.2:
            cartes.append({
                "ref": f"{ref}TOP",
                "name": f"Carte TOP 25 n° {ref}",
                "bbox": [lat_min, lon_min, lat_max, lon_max]
            })

with open("top25.json", "w", encoding="utf-8") as f:
    json.dump(cartes, f, ensure_ascii=False, indent=2)

print(f"Fichier top25.json créé avec {len(cartes)} cartes !")
