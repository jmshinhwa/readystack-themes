// Mahn- und Kostenmodul — Inkasso-Backend
// Gebührentabelle GKG Anlage 2, Stand KostRÄG 2021, gültig ab 2021-01-01
export const GKG_TABELLE = [
  { bis: 500, gebuehr: 38 },
  { bis: 1000, gebuehr: 61 },
  { bis: 5000, gebuehr: 161 },
];

// Gebührentabelle RVG Anlage 2
export const RVG_TABELLE = [
  { bis: 500, gebuehr: 49 },
  { bis: 5000, gebuehr: 354.5 },
  { bis: 10000, gebuehr: 614 },
];

export const MAHN_GKG_MINDEST = 36;      // KV 1100 Mindestgebühr
export const MAHN_GKG_FAKTOR = 1.0;      // KV 1100 Gerichtsgebühr Mahnbescheid
export const MAHN_RVG_FAKTOR = 1.0;      // VV 3305 RVG Anwalt Mahnantrag
export const TIMEOUT_MS = 5000;
