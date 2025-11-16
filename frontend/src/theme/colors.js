// Normalize display strings like "Fixes that Fail" → "FIXES_THAT_FAIL"
export const normalizeKey = (s) =>
  String(s || '')
    .trim()
    .replace(/[\s-]+/g, '_') // spaces/dashes → underscores
    .replace(/[^\w]/g, '')   // strip non-word chars
    .toUpperCase();          // upper-case

// Loop colors (used in the popup)
export const LOOP_COLORS = {
  REINFORCING: '#27AE60', // GREEN
  BALANCING:   '#E74C3C', // RED
};
export const getLoopColor = (type) =>
  LOOP_COLORS[normalizeKey(type)] || '#999999'; // GRAY

// Archetype base colors (per archetype *type*)
export const ARCHETYPE_COLORS = {
  SHIFTING_THE_BURDEN:        '#66BB6A', // medium green
  FIXES_THAT_FAIL:            '#BA68C8', // purple
  LIMITS_TO_SUCCESS:          '#FFB74D', // orange
  DRIFTING_GOALS:             '#4FC3F7', // cyan blue
  GROWTH_AND_UNDERINVESTMENT: '#F5CBA7', // peach
  SUCCESS_TO_THE_SUCCESSFUL:  '#D4E6F1', // light blue
  ESCALATION:                 '#F48FB1', // pink
  TRAGEDY_OF_THE_COMMONS:     '#A3E4D7', // teal

  __FALLBACK:                 '#BED7ED', // pale blue fallback
};

export const getArchetypeColor = (type) => {
  const key = normalizeKey(type);
  const color = ARCHETYPE_COLORS[key];
  if (!color && key) {
    // Helpful log to spot unmapped types
    // eslint-disable-next-line no-console
    console.warn('[CLD] Unmapped archetype type:', type);
  }
  return color || ARCHETYPE_COLORS.__FALLBACK;
};

// Regular variable node colors (centralized)
export const NODE_COLORS = {
  regular: {
    background:          '#FFF0CE', // CREAM
    border:              '#FFF0CE', // CREAM
    highlightBackground: '#C3A869', // GOLDENROD
    highlightBorder:     '#C3A869', // GOLDENROD
  }
};

// Edge colors by polarity (centralized)
export const EDGE_COLORS = {
  positive: { base: '#388E3C', highlight: '#4CAF50' }, // GREEN / LIGHT GREEN
  negative: { base: '#D32F2F', highlight: '#F44336' }, // RED / LIGHT RED
};

/* ------------------------------------------------------------------ */
/* Instance-based archetype colors + contrast safeguards               */
/* ------------------------------------------------------------------ */

// HEX → HSL
function hexToHsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { h: 0, s: 0, l: 0 };
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) {
    h = s = 0; // gray
  } else {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

// HSL → HEX
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;

  if (0 <= h && h < 60)        { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180){ r = 0; g = c; b = x; }
  else if (180 <= h && h < 240){ r = 0; g = x; b = c; }
  else if (240 <= h && h < 300){ r = x; g = 0; b = c; }
  else                         { r = c; g = 0; b = x; }

  const R = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const G = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const B = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  return `#${R}${G}${B}`;
}

// Quick HSL distance heuristic (not ΔE): hue + sat + lightness weighted
function hslDistance(a, b) {
  const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) / 180; // 0..1
  const ds = Math.abs(a.s - b.s);
  const dl = Math.abs(a.l - b.l);
  return dh * 0.6 + ds * 0.2 + dl * 0.2; // weights tuned for "distinct enough"
}

// Build a perceptually even gradient for all instances of a given type,
// keeping hue constant and ensuring each instance looks distinct.
function buildToneScale(hex, total) {
  const { h, s, l } = hexToHsl(hex);
  const n = Math.max(1, Math.min(20, total || 1));

  // Saturation normalized to a pleasant medium value
  const targetS = 0.60;
  const sat = Math.min(0.90, Math.max(0.35, s * 0.7 + targetS * 0.3));

  // Expanded lightness range for clearer distinction but still gentle overall
  const L_HIGH = 0.90; // lightest
  const L_LOW  = 0.60; // darkest

  // Nonlinear easing (exponential blend) for smoother distribution of perceived brightness
  const ease = (t) => Math.pow(t, 1.4); // feel free to try 1.3–1.6 for tuning

  if (n === 1) {
    const midL = (L_HIGH + L_LOW) / 2;
    return [hslToHex(h, sat, midL)];
  }

  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const e = ease(t);
    const L = L_HIGH + e * (L_LOW - L_HIGH);
    out.push(hslToHex(h, sat, Math.min(0.90, Math.max(0.25, L))));
  }
  return out;
}


/**
 * Ensure the foreground color is sufficiently distinct from the given background.
 * If too similar, it rotates hue and slightly shifts lightness until it passes a threshold.
 */
export function ensureContrastWithBackground(fgHex, bgHex, minDist = 0.22) {
  let fg = hexToHsl(fgHex);
  const bg = hexToHsl(bgHex);

  let attempts = 0;
  while (hslDistance(fg, bg) < minDist && attempts < 12) {
    // rotate hue and alternate lightness bumps
    fg.h = (fg.h + 30) % 360;
    fg.l = Math.min(1, Math.max(0, fg.l + (attempts % 2 ? 0.12 : -0.12)));
    attempts++;
  }
  return hslToHex(fg.h, fg.s, fg.l);
}

/**
 * Distinct color for an archetype instance *i* out of *total*,
 * preserving hue and using an evenly spaced lightness gradient.
 * The result is also adjusted to keep contrast with regular node background.
 */
export function getArchetypeInstanceColor(type, index, total) {
  const base = getArchetypeColor(type);
  const shades = buildToneScale(base, total);
  const chosen = shades[Math.max(0, Math.min(shades.length - 1, index))];
  return ensureContrastWithBackground(chosen, NODE_COLORS.regular.background, 0.30);
}