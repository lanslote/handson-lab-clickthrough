import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { browserServers, MemoryStore } from './helpers.js';

test('Lab 3 videos require start gestures and retain natural completion until explicit practice confirmation', { timeout: 150000 }, async t => {
  const servers = await browserServers(new MemoryStore()); t.after(() => servers.close());
  const browser = await chromium.launch({ channel: 'msedge', headless: true }); t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const teacher = await servers.create();
  await servers.gate(teacher, '3-1', true);
  await page.goto(servers.origin + '/lab3/');
  await page.locator('#join [name=code]').fill(teacher.classroomId);
  await page.locator('#join [name=nickname]').fill('영상 확인');
  await page.locator('#join button').click();
  await expect(page.locator('#next-portion')).toBeEnabled();
  await page.locator('#next-portion').click();
  await expect(page.locator('#activity')).toBeVisible();
  const frame = page.frameLocator('#activity');
  const student = JSON.parse(await page.evaluate(origin => localStorage.getItem(`lab3.session:${origin}:student`), servers.apiOrigin));
  async function video(seconds, cursor) {
    await expect(frame.locator('#clip-primary')).toHaveText('영상 보기');
    await expect.poll(() => frame.locator('#clip-v').evaluate((video, expected) => video.readyState >= 2 && video.duration === expected, seconds)).toBe(true);
    assert.equal(await frame.locator('#clip-v').evaluate(video => video.paused), true);
    assert.equal(await frame.locator('#clip-v').evaluate(video => video.currentTime), 0);
    await expect(frame.locator('[data-lab3-video=skip]')).toHaveCount(0);
    const activity = page.frames().find(item => item !== page.mainFrame());
    await activity.evaluate(() => document.querySelector('#clip-v').dispatchEvent(new Event('ended')));
    await expect(frame.locator('#clip-primary')).toHaveText('영상 보기');
    await frame.locator('#clip-primary').click();
    await expect.poll(() => frame.locator('#clip-v').evaluate(video => !video.paused && video.currentTime > .1)).toBe(true);
    await expect(frame.locator('#clip-primary')).toBeDisabled();
    assert.equal(await frame.locator('#clip-v').evaluate(video => video.playbackRate), 1);
    if (seconds === 37) {
      await activity.evaluate(() => {
        const video = document.querySelector('#clip-v');
        video.currentTime = 30; video.dispatchEvent(new Event('timeupdate'));
      });
      assert.ok(await frame.locator('#clip-v').evaluate(video => video.currentTime) < 5);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await activity.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(await frame.locator('#clip-primary').evaluate(button =>
        button.getBoundingClientRect().bottom <= document.querySelector('.clip-card').getBoundingClientRect().bottom));
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    await expect(frame.locator('#clip-primary')).toBeEnabled({ timeout: (seconds + 20) * 1000 });
    await expect(frame.locator('#clip-primary')).toHaveText('실습 시작');
    assert.equal(await frame.locator('#clip-v').evaluate(video => video.ended), true);
    assert.equal((await servers.state(student)).data.participant.cursor, cursor);
    await page.keyboard.press('Escape');
    await expect(frame.locator('#clip-v')).toBeVisible();
    await frame.locator('#clip-primary').click();
    await expect(frame.locator('#clip-v')).toHaveCount(0);
    assert.equal((await servers.state(student)).data.participant.cursor, cursor);
  }
  await video(37, 0);
  await frame.locator('[data-g=next]').click();
  await video(15, 1);
  await frame.locator('[data-hot]').click();
  await frame.locator('[data-in]').fill('Contoso IT Concierge');
  await video(15, 3);
  await expect(frame.locator('[data-in]')).toBeVisible();
  await frame.locator('[data-g=replay]').click();
  await expect(frame.locator('#clip-primary')).toHaveText('영상 보기');
  assert.equal(await frame.locator('#clip-v').evaluate(video => video.paused), true);
  await expect(frame.locator('[data-lab3-video=skip]')).toBeVisible();
  await frame.locator('[data-lab3-video=skip]').click();
  await page.locator('#learner-menu > summary').click();
  await page.locator('#force-video').uncheck();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('#continue')).toBeEnabled();
  await page.locator('#continue').click();
  await expect(page.locator('#activity')).toBeVisible();
  await expect(frame.locator('[data-in]')).toBeVisible();
  await expect(frame.locator('#clip-v')).toHaveCount(0);
  assert.deepEqual(errors, []);
});

test('waiting CTA reflects closed gates, prerequisite completion, reopening and the final boundary', { timeout: 45000 }, async t => {
  const servers = await browserServers(new MemoryStore()); t.after(() => servers.close());
  const teacher = await servers.create(), student = await servers.joinStudent(teacher);
  const browser = await chromium.launch({ channel: 'msedge', headless: true }); t.after(() => browser.close());
  const context = await browser.newContext();
  await context.addInitScript(({ origin, session }) => {
    if (location.protocol === 'http:') localStorage.setItem(`lab3.session:${origin}:student`, JSON.stringify(session));
  }, { origin: servers.apiOrigin, session: student });
  const page = await context.newPage();
  await page.goto(servers.origin + '/lab3/');
  await expect(page.locator('#continue')).toBeEnabled();
  await page.locator('#continue').click();
  await expect(page.locator('#next-portion')).toBeVisible();
  await expect(page.locator('#next-portion')).toBeDisabled();
  await expect(page.locator('#next-portion')).toContainText('3-1 · 강사 오픈 대기 중');
  await servers.gate(teacher, '3-1', true); await servers.enter(student, '3-1');
  await servers.gate(teacher, '3-2', true);
  await expect(page.locator('#next-portion')).toContainText('현재 구간 완료 후 이동', { timeout: 10000 });
  await expect(page.locator('#next-portion')).toBeDisabled();
  await servers.complete(student, '3-1');
  await expect(page.locator('#next-portion')).toBeEnabled({ timeout: 10000 });
  assert.equal((await servers.state(student)).data.participant.activePortionId, '3-1');
  await servers.gate(teacher, '3-2', false);
  await expect(page.locator('#next-portion')).toBeDisabled({ timeout: 10000 });
  await expect(page.locator('#next-portion')).toContainText('3-2 · 강사 오픈 대기 중');
  for (const portion of ['3-2', '3-3', '3-4', '3-5', '3-6']) {
    await servers.gate(teacher, portion, true); await servers.enter(student, portion); await servers.complete(student, portion);
  }
  await expect(page.locator('#learner-status')).toContainText('모든 구간 완료', { timeout: 10000 });
  await expect(page.locator('#next-portion')).toBeHidden();
});
