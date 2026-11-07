import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { browserServers, MemoryStore } from './helpers.js';

function contrast(first, second) {
  const luminance = rgb => rgb.slice(0, 3).map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test('blue targets and current actions stand out without altering coordinates, input validation or gray gate waits', { timeout: 60000 }, async t => {
  const servers = await browserServers(new MemoryStore()); t.after(() => servers.close());
  const teacher = await servers.create(), student = await servers.joinStudent(teacher);
  await servers.gate(teacher, '3-1', true); await servers.enter(student, '3-1');
  await servers.progress(student, '3-1', 'intro', 0);
  const browser = await chromium.launch({ channel: 'msedge', headless: true }); t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(({ origin, student }) => {
    if (location.protocol !== 'http:') return;
    localStorage.setItem(`lab3.session:${origin}:student`, JSON.stringify(student));
    localStorage.setItem('hol2.watched', JSON.stringify(['intro', 'create', 'instructions']));
    localStorage.setItem('lab3.force', '0');
  }, { origin: servers.apiOrigin, student });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(servers.origin + '/lab3/');
  await expect(page.locator('#continue')).toBeEnabled(); await page.locator('#continue').click();
  await expect(page.locator('#activity')).toBeVisible();
  const frame = page.frameLocator('#activity');
  await expect(frame.locator('[data-hot]')).toBeVisible();
  const activity = page.frames().find(item => item !== page.mainFrame());
  const contrasts = [];
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => {
      document.documentElement.dataset.theme = theme;
      document.querySelector('#activity').contentDocument.documentElement.dataset.theme = theme;
    }, theme);
    for (const [width, height] of [[1280, 800], [390, 844]]) {
      await page.setViewportSize({ width, height });
      const result = await activity.evaluate(() => {
        const reference = document.createElement('div');
        reference.style.color = 'var(--cp-link)'; reference.style.background = 'var(--cp-surface)';
        document.body.append(reference);
        const blue = getComputedStyle(reference).color;
        const surface = getComputedStyle(reference).backgroundColor;
        reference.remove();
        const target = document.querySelector('[data-hot]'), current = document.querySelector('.todo li.cur');
        const bounds = target.getBoundingClientRect(), shot = document.querySelector('#shot-wrap').getBoundingClientRect();
        const box = curAction().box;
        const rgba = color => {
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data];
        };
        return {
          blue, targetBorder: getComputedStyle(target).borderColor,
          marker: getComputedStyle(document.querySelector('.beacon')).backgroundColor,
          currentBorder: getComputedStyle(current).borderLeftColor,
          progress: getComputedStyle(document.querySelector('.bar i')).backgroundColor,
          alpha: rgba(getComputedStyle(target).backgroundColor)[3] / 255,
          targetScaleError: Math.max(Math.abs(bounds.x - shot.x - box[0] / W * shot.width),
            Math.abs(bounds.y - shot.y - box[1] / H * shot.height),
            Math.abs(bounds.width - box[2] / W * shot.width),
            Math.abs(bounds.height - box[3] / H * shot.height)),
          currentText: rgba(getComputedStyle(current).color), currentBackground: rgba(getComputedStyle(current).backgroundColor),
          primaryText: rgba(surface), primaryBackground: rgba(blue),
          overflow: document.documentElement.scrollWidth > innerWidth,
          hasHiddenChrome: getComputedStyle(document.querySelector('.lab-top')).display === 'none'
        };
      });
      assert.equal(result.targetBorder, result.blue); assert.equal(result.marker, result.blue);
      assert.equal(result.currentBorder, result.blue); assert.equal(result.progress, result.blue);
      assert.ok(result.alpha >= .1 && result.alpha <= .15);
      assert.ok(result.targetScaleError <= 2, `Hotspot coordinates changed: ${result.targetScaleError}`);
      assert.equal(result.overflow, false); assert.equal(result.hasHiddenChrome, true);
      assert.ok(contrast(result.currentText, result.currentBackground) >= 4.5);
      assert.ok(contrast(result.primaryText, result.primaryBackground) >= 4.5);
      contrasts.push({ theme, width, primary: contrast(result.primaryText, result.primaryBackground).toFixed(2),
        currentAction: contrast(result.currentText, result.currentBackground).toFixed(2) });
      await expect(page.locator('#next-portion')).toBeDisabled();
      const waiting = await page.locator('#next-portion').evaluate(button => {
        const sample = document.createElement('div'); sample.style.background = 'var(--cp-surface-soft)';
        document.body.append(sample); const gray = getComputedStyle(sample).backgroundColor; sample.remove();
        return getComputedStyle(button).backgroundColor === gray && button.disabled;
      });
      assert.equal(waiting, true);
    }
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await frame.locator('[data-hot]').focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(frame.locator('[data-hot]')).toBeFocused();
  assert.equal(await frame.locator('[data-hot]').evaluate(button => getComputedStyle(button).outlineWidth), '3px');
  await expect(frame.locator('[data-g=assist]')).toHaveClass(/locked/);
  await frame.locator('[data-g=hint]').click();
  await expect(frame.locator('[data-g=assist]')).not.toHaveClass(/locked/);
  await frame.locator('[data-hot]').click(); await expect(frame.locator('[data-in]')).toBeVisible();
  assert.equal((await servers.state(student)).data.participant.cursor, 2);
  const inputBlue = await frame.locator('[data-in]').evaluate(input => {
    const reference = document.createElement('span'); reference.style.color = 'var(--cp-link)'; document.body.append(reference);
    const blue = getComputedStyle(reference).color; reference.remove(); return getComputedStyle(input).borderColor === blue;
  });
  assert.equal(inputBlue, true);
  await frame.locator('[data-in]').fill('wrong name');
  await expect(frame.locator('.note.warn')).toBeVisible();
  assert.equal((await servers.state(student)).data.participant.cursor, 2);
  await frame.locator('[data-in]').fill('Contoso IT Concierge');
  await expect(frame.locator('#guide h2')).toHaveText('안내(지침) 붙여넣기');
  assert.equal((await servers.state(student)).data.participant.cursor, 3);
  assert.deepEqual(errors, []);
  console.log('Blue accent contrast:', JSON.stringify(contrasts));
});
