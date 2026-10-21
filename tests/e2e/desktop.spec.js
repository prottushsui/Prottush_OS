import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function openStart(page) {
  await page.getByRole('button', { name: 'Start menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Start menu' })).toBeVisible();
}

async function launchFromStart(page, appName) {
  await openStart(page);
  const search = page.getByRole('textbox', { name: 'Search apps by name, description, or category' });
  await search.fill(appName);
  await page.getByRole('option', { name: new RegExp(appName, 'i') }).first().click();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/');
});

test('loads a named desktop and opens/dismisses Start with keyboard', async ({ page }) => {
  await expect(page.locator('main.desktop')).toBeVisible();
  await openStart(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Start menu' })).toHaveCount(0);
});

test('Start search launches Settings and preference controls are reachable', async ({ page }) => {
  await launchFromStart(page, 'Settings');
  await expect(page.getByRole('heading', { name: 'Personalization' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Backup appearance settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export settings/ })).toBeVisible();
  await expect(page.getByLabel('Import settings')).toBeAttached();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export settings/ }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.format).toBe('prottush-os-preferences');
  expect(Object.keys(exported.preferences).sort()).toEqual(['accent', 'theme', 'wallpaper']);
  expect(JSON.stringify(exported)).not.toMatch(/token|password|vault|window/i);
});

test('Terminal only runs the documented allowlisted commands', async ({ page }) => {
  await launchFromStart(page, 'Terminal');
  const input = page.getByRole('textbox', { name: 'Simulated terminal command' });
  await input.fill('help');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText(/Supported commands: help, date, apps/)).toBeVisible();
  await input.fill('rm -rf /');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText(/Unknown simulated command: rm/)).toBeVisible();
});

test('quick settings open, expose toggle state, and dismiss', async ({ page }) => {
  const quick = page.getByRole('button', { name: 'Open quick settings' });
  await quick.click();
  await expect(page.getByRole('dialog', { name: 'Quick settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Dark theme/ })).toHaveAttribute('aria-pressed');
  await page.getByRole('button', { name: 'Close quick settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Quick settings' })).toHaveCount(0);
});

test('core controls remain within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('main.desktop')).toBeVisible();
  await openStart(page);
  await expect(page.getByRole('textbox', { name: 'Search apps by name, description, or category' })).toBeVisible();
  const startBounds = await page.getByRole('dialog', { name: 'Start menu' }).boundingBox();
  expect(startBounds).not.toBeNull();
  expect(startBounds.x).toBeGreaterThanOrEqual(0);
  expect(startBounds.x + startBounds.width).toBeLessThanOrEqual(376);
});

test('Help & tips accurately describes privacy boundaries', async ({ page }) => {
  await launchFromStart(page, 'Help & tips');
  await expect(page.getByRole('heading', { name: 'Help & tips' })).toBeVisible();
  await expect(page.getByText(/does not execute operating-system commands/i)).toBeVisible();
  await expect(page.getByText(/Settings exports include only theme, wallpaper, and accent/i)).toBeVisible();
});

test('window minimize, taskbar restore, and close lifecycle works', async ({ page }) => {
  await launchFromStart(page, 'Terminal');
  const terminal = page.getByRole('group', { name: 'Terminal' });
  await expect(terminal).toBeVisible();
  await terminal.getByRole('button', { name: 'Minimize' }).click();
  await expect(terminal).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore Terminal' }).click();
  await expect(page.getByRole('group', { name: 'Terminal' })).toBeVisible();
  await page.getByRole('group', { name: 'Terminal' }).getByRole('button', { name: 'Close Terminal' }).click();
  await expect(page.getByRole('group', { name: 'Terminal' })).toHaveCount(0);
});

test('viewport resizing keeps core shell controls available', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('main.desktop')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start menu' })).toBeVisible();
  }
});

test('keyboard shortcuts do not hijack editable search fields', async ({ page }) => {
  await openStart(page);
  const search = page.getByRole('textbox', { name: 'Search apps by name, description, or category' });
  await search.focus();
  await page.keyboard.press('Alt+Shift+E');
  await expect(page.getByRole('dialog', { name: 'Start menu' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'File Explorer' })).toHaveCount(0);
});

test('reset window layout requires confirmation and preserves the desktop shell', async ({ page }) => {
  await launchFromStart(page, 'Terminal');
  await expect(page.getByRole('group', { name: 'Terminal' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('main.desktop').click({ button: 'right', position: { x: 1000, y: 500 } });
  await page.getByRole('menuitem', { name: 'Reset window layout' }).click();
  await expect(page.getByRole('group', { name: 'Terminal' })).toHaveCount(0);
  await expect(page.locator('main.desktop')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start menu' })).toBeVisible();
});
