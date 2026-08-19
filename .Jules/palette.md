# Palette's Journal - Critical Learnings

## 2025-05-10 - ARIA Labels and Keyboard Navigation on Custom Leaflet/HTML Controls
**Learning:** Icon-only buttons and input controls in custom HTML overlays without explicit `aria-label`, `aria-expanded`, or `role` attributes make the web map application inaccessible for screen reader and keyboard-only users.
**Action:** Always complement icon buttons (e.g. ↻, ⚙, ☰, + Profil) with informative `aria-label` attributes and ensure form inputs have associated `<label>` or explicit labels.
