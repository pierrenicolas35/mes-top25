#!/usr/bin/env python3
"""
Validation script for top25.json (IGN Série Bleue – France métropolitaine).

Usage:
    python3 validate.py [top25.json]

Exit code 0 = OK, 1 = errors found.
"""
import json
import re
import sys

CATALOGUE = sys.argv[1] if len(sys.argv) > 1 else "top25.json"

# ─── Known required cards (explicitly stated by users / IGN catalogue) ──────
REQUIRED_REFS = {
    "3333OT",   # Chartreuse Nord / Grésivaudan  – was missing
    "3630OT",   # Chamonix / Massif du Mont-Blanc
    "3431OT",   # Lac d'Annecy
    "3334OT",   # Massif de la Chartreuse Sud / Grenoble
    "3536OT",   # Briançon / Serre-Chevalier / Montgenèvre
}

# France métropolitaine bounding box (WGS84)
FRANCE_LAT_MIN = 42.30
FRANCE_LAT_MAX = 51.15
FRANCE_LON_MIN = -5.20
FRANCE_LON_MAX =  8.30

REF_PATTERN = re.compile(r"^\d{4}(OT|ET|O|E)$")

errors = []
warnings = []

with open(CATALOGUE, encoding="utf-8") as f:
    data = json.load(f)

refs_found = set()

for i, card in enumerate(data):
    ref  = card.get("ref", "")
    name = card.get("name", "")
    bbox = card.get("bbox", [])

    # ── schema checks ──
    if not ref:
        errors.append(f"[{i}] Missing 'ref' field")
        continue
    if not name:
        errors.append(f"[{i}] {ref}: Missing 'name' field")
    if not isinstance(bbox, list) or len(bbox) != 4:
        errors.append(f"[{i}] {ref}: 'bbox' must be a list of 4 numbers")
        continue
    if not all(isinstance(v, (int, float)) for v in bbox):
        errors.append(f"[{i}] {ref}: 'bbox' values must be numeric")
        continue

    lat_min, lon_min, lat_max, lon_max = bbox

    # ── bbox sanity ──
    if lat_min >= lat_max:
        errors.append(f"{ref}: lat_min ({lat_min}) >= lat_max ({lat_max})")
    if lon_min >= lon_max:
        errors.append(f"{ref}: lon_min ({lon_min}) >= lon_max ({lon_max})")
    if not (-90 <= lat_min <= 90 and -90 <= lat_max <= 90):
        errors.append(f"{ref}: latitude out of range {lat_min},{lat_max}")
    if not (-180 <= lon_min <= 180 and -180 <= lon_max <= 180):
        errors.append(f"{ref}: longitude out of range {lon_min},{lon_max}")

    # ── ref format ──
    if not REF_PATTERN.match(ref):
        warnings.append(f"{ref}: unexpected ref format")

    # ── name must not be empty or contain legacy 'Feuille' prefix ──
    if name.startswith("Feuille "):
        warnings.append(f"{ref}: name still has legacy 'Feuille' prefix: '{name}'")

    refs_found.add(ref)

# ── duplicate refs ──
seen = set()
for card in data:
    r = card.get("ref", "")
    if not r:
        continue
    if r in seen:
        errors.append(f"Duplicate ref: {r}")
    seen.add(r)

# ── required cards present ──
for ref in sorted(REQUIRED_REFS):
    if ref not in refs_found:
        errors.append(f"Required card missing: {ref}")

# ── France coverage: check at least N distinct lat/lon bands ──
valid_cards = [c for c in data
               if isinstance(c.get("bbox"), list) and len(c["bbox"]) >= 4
               and all(isinstance(v, (int, float)) for v in c["bbox"])]
lat_bands = set(round(c["bbox"][0], 2) for c in valid_cards
                if FRANCE_LAT_MIN <= c["bbox"][0] <= FRANCE_LAT_MAX)
lon_bands = set(round(c["bbox"][1], 2) for c in valid_cards
                if FRANCE_LON_MIN <= c["bbox"][1] <= FRANCE_LON_MAX)

MIN_LAT_BANDS = 30  # expect ≥ 30 distinct latitude bands covering France
MIN_LON_BANDS = 20  # expect ≥ 20 distinct longitude bands covering France
if len(lat_bands) < MIN_LAT_BANDS:
    errors.append(
        f"Only {len(lat_bands)} latitude bands in France bbox "
        f"(expected ≥ {MIN_LAT_BANDS})"
    )
if len(lon_bands) < MIN_LON_BANDS:
    errors.append(
        f"Only {len(lon_bands)} longitude bands in France bbox "
        f"(expected ≥ {MIN_LON_BANDS})"
    )

# ── summary ──
print(f"Catalogue: {CATALOGUE}")
print(f"Total cards: {len(data)}")
print(f"Latitude bands in France: {len(lat_bands)}")
print(f"Longitude bands in France: {len(lon_bands)}")
print(f"Required refs present: "
      f"{sum(1 for r in REQUIRED_REFS if r in refs_found)}/{len(REQUIRED_REFS)}")
print()

if warnings:
    print(f"Warnings ({len(warnings)}):")
    for w in warnings[:20]:
        print(f"  ⚠  {w}")
    if len(warnings) > 20:
        print(f"  ... and {len(warnings)-20} more")
    print()

if errors:
    print(f"ERRORS ({len(errors)}):")
    for e in errors[:30]:
        print(f"  ✗  {e}")
    if len(errors) > 30:
        print(f"  ... and {len(errors)-30} more")
    sys.exit(1)
else:
    print("✓ All checks passed.")
