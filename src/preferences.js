const THEMES = new Set(['light', 'dark']);
const WALLPAPERS = new Set(['default', 'aurora', 'sunset', 'forest', 'midnight']);
const ACCENTS = new Set(['blue', 'violet', 'teal', 'rose', 'amber']);

export const PREFERENCES_FORMAT = 'prottush-os-preferences';
export const PREFERENCES_VERSION = 1;

// Only visual preferences are transferable. Window layout, app state, credentials,
// tokens, vault data, and arbitrary imported keys are intentionally excluded.
export function normalizePreferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Preferences must be a JSON object.');
  }
  const source = input.preferences && typeof input.preferences === 'object'
    ? input.preferences
    : input;
  const theme = source.theme;
  const wallpaper = source.wallpaper;
  const accent = source.accent;
  if (!THEMES.has(theme)) throw new TypeError('Unsupported theme preference.');
  if (!WALLPAPERS.has(wallpaper)) throw new TypeError('Unsupported wallpaper preference.');
  if (!ACCENTS.has(accent)) throw new TypeError('Unsupported accent preference.');
  return { theme, wallpaper, accent };
}

export function parsePreferencesFile(text) {
  if (typeof text !== 'string' || text.length > 32_768) {
    throw new TypeError('The settings file is missing or too large.');
  }
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new TypeError('The settings file is not valid JSON.'); }
  if (parsed.format !== PREFERENCES_FORMAT || parsed.version !== PREFERENCES_VERSION) {
    throw new TypeError('This is not a supported Prottush OS settings export.');
  }
  return normalizePreferences(parsed.preferences);
}

export function createPreferencesExport(preferences) {
  return {
    format: PREFERENCES_FORMAT,
    version: PREFERENCES_VERSION,
    exportedAt: new Date().toISOString(),
    preferences: normalizePreferences(preferences),
  };
}
