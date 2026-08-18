# Mes Cartes IGN TOP 25

Application web progressive (PWA) permettant de suivre les cartes IGN **Série Bleue** (TOP 25, 1:25 000) que vous possédez pour la France métropolitaine.

## Fonctionnalités

- Liste complète des cartes IGN Série Bleue de France métropolitaine
- Affichage des emprises (dalles) calées sur une carte OpenStreetMap
- Sélection / désélection de chaque carte possédée (stockage local)
- Recherche par référence ou nom
- Mode hors-ligne (Service Worker)

---

## Structure des données — `top25.json`

Chaque entrée du catalogue décrit une carte de la Série Bleue :

```json
{
  "ref":  "3333OT",
  "name": "Chartreuse Nord / Grésivaudan",
  "bbox": [45.36, 5.6972, 45.54, 6.0572]
}
```

| Champ  | Type     | Description |
|--------|----------|-------------|
| `ref`  | string   | Référence IGN — format `CCRR` + suffixe `O`, `E`, `OT` ou `ET` |
| `name` | string   | Nom officiel de la carte (ou désignation provisoire pour les fiches sans nom connu) |
| `bbox` | number[] | `[lat_min, lon_min, lat_max, lon_max]` en WGS84 |

### Grille de référence

La grille de la Série Bleue est calculée ainsi :

```
lat_bas(RR) = 45,00 + (35 − RR) × 0,18°
lon_ouest(CC) = 4,9772 + (CC − 31) × 0,36°
```

- Suffixe `O`  : demi-carte ouest — lon `[lon_ouest, lon_ouest + 0,18°]`
- Suffixe `E`  : demi-carte est  — lon `[lon_ouest + 0,18°, lon_ouest + 0,36°]`
- Suffixe `OT` / `ET` : carte pleine largeur — lon `[lon_ouest, lon_ouest + 0,36°]`

---

## Vérification / validation

Un script Python anti-régression est fourni :

```bash
python3 validate.py [top25.json]
```

Il vérifie :
- Schéma JSON (présence des champs obligatoires, valeurs numériques)
- Format des références (`CCRR` + suffixe valide)
- Cohérence des bbox (lat_min < lat_max, lon_min < lon_max, dans les bornes WGS84)
- Présence des cartes requises (dont `3333OT`)
- Couverture minimale de la France métropolitaine (≥ 30 bandes de latitude, ≥ 20 bandes de longitude)
- Absence de doublons

```
✓ All checks passed.
```

---

## Procédure de mise à jour du catalogue

1. **Source des données** : catalogue officiel IGN disponible via les services WFS/WMS d'IGN Géoservices (`wxs.ign.fr`) ou sur [geoservices.ign.fr](https://geoservices.ign.fr).
2. **Noms officiels** : les appellations exactes de chaque carte sont disponibles dans le catalogue papier IGN et sur le portail [ign.fr](https://www.ign.fr). Les entrées sans nom connu utilisent la désignation `CCRR Ouest` / `CCRR Est` à titre provisoire.
3. **Ajouter une carte manquante** : ajouter l'objet JSON correspondant dans `top25.json` en respectant le format ci-dessus, puis relancer `python3 validate.py`.
4. **Modifier les noms** : remplacer la désignation provisoire par le nom officiel IGN dans `top25.json`.

---

## Déploiement

L'application est statique — déposer les fichiers sur tout hébergement web (GitHub Pages, Netlify, etc.) ou ouvrir `index.html` directement dans un navigateur.
