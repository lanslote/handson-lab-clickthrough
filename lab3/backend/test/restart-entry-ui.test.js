import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { browserServers, MemoryStore } from './helpers.js';

test('restart returns to blank entry, survives reload and reuses only the explicitly selected same participant', { timeout: 90000 }, async t => {
  const servers = await browserServers(new MemoryStore()); t.after(() => servers.close());
  const first = await servers.create(), second = await servers.create();
  await servers.enrollment(first, true); await servers.enrollment(second, true);
  const browser = await chromium.launch({ channel: 'msedge', headless: true }); t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage(), errors = [], resets = [];
  let joins = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().endsWith('/api/join')) joins++;
    if (request.url().endsWith('/reset')) resets.push(request.postDataJSON().operationId);
  });
  const saved = () => page.evaluate(origin => JSON.parse(localStorage.getItem(`lab3.session:${origin}:student`)), servers.apiOrigin);
  async function join(code, nickname) {
    await expect(page.locator('#class-select')).toBeEnabled();
    await page.locator('#class-select').selectOption(code);
    await page.locator('#join [name=nickname]').fill(nickname);
    await page.locator('#join button[type=submit]').click();
    await expect(page.locator('#role')).toContainText(nickname);
  }
  async function restart() {
    await page.reload(); await expect(page.locator('#restart')).toBeEnabled();
    await page.locator('#restart').click();
    await expect(page.locator('#join')).toBeVisible();
    await expect(page.locator('#resume')).toBeHidden();
    assert.equal(await page.locator('#class-select').inputValue(), '');
    await expect(page.locator('#join [name=nickname]')).toHaveValue('');
  }
  await page.goto(servers.origin + '/lab3/');
  await join(first.classroomId, 'returning-student');
  const original = await saved();
  await expect(page.locator('#ready-title')).toHaveText('수업에 입장했습니다');
  await expect(page.locator('#next-portion')).toBeDisabled();
  await expect(page.locator('#activity')).toBeHidden();
  for (const [width, height, theme] of [[1280, 800, 'light'], [390, 844, 'dark']]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const ready = await page.locator('#pre-start').boundingBox();
    assert.ok(ready.y + ready.height <= height);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await servers.gate(first, '3-1', true);
  await expect(page.locator('#next-portion')).toBeEnabled({ timeout: 10000 });
  await expect(page.locator('#pre-start')).toBeVisible();
  await expect(page.locator('#activity')).toBeHidden();
  await page.locator('#next-portion').click(); await expect(page.locator('#activity')).toBeVisible();
  await expect(page.locator('#pre-start')).toBeHidden();
  await servers.progress(original, '3-1', 'intro', 0);
  await page.reload(); await expect(page.locator('#continue')).toBeEnabled(); await page.locator('#continue').click();
  assert.equal((await servers.state(original)).data.participant.cursor, 1);
  await page.reload(); await expect(page.locator('#restart')).toBeEnabled();
  await page.route('**/reset', route => route.abort());
  await page.locator('#restart').click();
  await expect(page.locator('#connection')).toContainText('저장 대기');
  await expect(page.locator('#join')).toBeHidden(); await expect(page.locator('#resume')).toBeVisible();
  assert.equal((await servers.state(original)).data.participant.cursor, 1);
  await page.unroute('**/reset'); await page.locator('#connection button').click();
  await expect(page.locator('#join')).toBeVisible();
  assert.ok(resets.length >= 2); assert.equal(new Set(resets).size, 1);
  assert.equal((await servers.state(original)).data.participant.cursor, 0);
  assert.equal((await servers.state(original)).data.participant.epoch, 1);
  assert.equal((await saved()).restartEntry, true);
  await page.reload(); await expect(page.locator('#join')).toBeVisible(); await expect(page.locator('#resume')).toBeHidden();
  assert.equal(await page.locator('#class-select').inputValue(), '');
  await expect(page.locator('#join [name=nickname]')).toHaveValue('');
  await servers.gate(first, '3-1', false);
  await join(first.classroomId, 'returning-student');
  assert.equal((await saved()).credential, original.credential); assert.equal(joins, 1);
  assert.equal((await servers.state(first)).data.participants.length, 1);
  await expect(page.locator('#pre-start')).toBeVisible(); await expect(page.locator('#next-portion')).toBeDisabled();
  await restart(); await join(first.classroomId, 'another-student');
  assert.notEqual((await saved()).credential, original.credential);
  assert.equal((await servers.state(first)).data.participants.length, 2);
  await restart(); await join(second.classroomId, 'new-student');
  assert.equal((await saved()).classroomId, second.classroomId);
  assert.equal((await servers.state(second)).data.participants.length, 1);
  assert.equal((await servers.state(first)).data.participants.length, 2);
  await page.locator('#learner-menu > summary').click(); await page.locator('#leave').click();
  await expect(page.locator('#join')).toBeVisible(); assert.equal(await saved(), null);
  await page.reload(); await expect(page.locator('#resume')).toBeHidden();
  assert.deepEqual(errors, []);
});
