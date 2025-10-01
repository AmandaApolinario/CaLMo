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

// Archetype colors (match backend enum values via normalizeKey)
export const ARCHETYPE_COLORS = {
  SHIFTING_THE_BURDEN:        '#FAD7A0', // LIGHT ORANGE
  FIXES_THAT_FAIL:            '#E8DAEF', // LIGHT LAVENDER
  LIMITS_TO_SUCCESS:          '#AED6F1', // LIGHT BLUE
  DRIFTING_GOALS:             '#F5B7B1', // LIGHT CORAL
  GROWTH_AND_UNDERINVESTMENT: '#F5CBA7', // LIGHT PEACH
  SUCCESS_TO_THE_SUCCESSFUL:  '#D4E6F1', // VERY LIGHT BLUE
  ESCALATION:                 '#D5DBDB', // LIGHT GRAY
  TRAGEDY_OF_THE_COMMONS:     '#A3E4D7', // LIGHT TEAL

  __FALLBACK:                 '#BED7ED', // PALE BLUE
};

export const getArchetypeColor = (type) => {
  const key = normalizeKey(type);
  const color = ARCHETYPE_COLORS[key];
  if (!color && key) {
    // Helpful log to spot any unmapped types
    // eslint-disable-next-line no-console
    console.warn('[CLD] Unmapped archetype type:', type);
  }
  return color || ARCHETYPE_COLORS.__FALLBACK;
};

// Regular variable node colors (centralized)
export const NODE_COLORS = {
  regular: {
    background:         '#FFF0CE', // CREAM
    border:             '#FFF0CE', // CREAM
    highlightBackground:'#C3A869', // GOLDENROD
    highlightBorder:    '#C3A869', // GOLDENROD
  }
};

// Edge colors by polarity (centralized)
export const EDGE_COLORS = {
  positive: { base: '#388E3C', highlight: '#4CAF50' }, // GREEN / LIGHT GREEN
  negative: { base: '#D32F2F', highlight: '#F44336' }, // RED / LIGHT RED
};
