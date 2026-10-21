import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferencesExport, normalizePreferences, parsePreferencesFile } from '../src/preferences.js';

const valid = { theme: 'dark', wallpaper: 'aurora', accent: 'teal' };

test('normalizes only supported appearance preferences', () => {
  assert.deepEqual(normalizePreferences({ ...valid, token: 'must-not-survive', vault: { password: 'nope' } }), valid);
});

test('rejects unknown theme, wallpaper, and accent values', () => {
  assert.throws(() => normalizePreferences({ ...valid, theme: 'system' }), /theme/);
  assert.throws(() => normalizePreferences({ ...valid, wallpaper: '../vault' }), /wallpaper/);
  assert.throws(() => normalizePreferences({ ...valid, accent: 'custom-css' }), /accent/);
});

test('rejects arrays and null input', () => {
  assert.throws(() => normalizePreferences(null), /JSON object/);
  assert.throws(() => normalizePreferences([]), /JSON object/);
});

test('round-trips a versioned export', () => {
  const file = createPreferencesExport(valid);
  assert.equal(file.format, 'prottush-os-preferences');
  assert.equal(file.version, 1);
  assert.deepEqual(parsePreferencesFile(JSON.stringify(file)), valid);
});

test('rejects unsupported file versions and malformed JSON', () => {
  assert.throws(() => parsePreferencesFile('{'), /valid JSON/);
  assert.throws(() => parsePreferencesFile(JSON.stringify({ format: 'other', version: 1, preferences: valid })), /supported/);
  assert.throws(() => parsePreferencesFile(JSON.stringify({ format: 'prottush-os-preferences', version: 99, preferences: valid })), /supported/);
});

test('rejects oversized imports', () => {
  assert.throws(() => parsePreferencesFile('x'.repeat(32769)), /too large/);
});
