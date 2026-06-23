const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'sim']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'n', 'nao', 'não', '']);

export function parseBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (value === undefined || value === null) return defaultValue;

  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return defaultValue;
}

export function findFieldKey(object, field, config = {}) {
  const candidates = [field, ...(config.aliases || [])]
    .map(candidate => String(candidate).trim().toLowerCase());

  return Object.keys(object).find(key => candidates.includes(key.trim().toLowerCase()));
}
