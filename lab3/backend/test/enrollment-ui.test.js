import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { browserServers, MemoryStore, adminKey } from './helpers.js';

test('teacher opens enrollment; students choose a classroom and nickname, preserve selection and continue after closure', { timeout: 90000 }, async t => {
  const servers = await browserServers(new MemoryStore()); t.after(() => servers.close());
  const browser = await chromium.launch({ channel: 'msedge', headless: true }); t.after(() => browser.close());
  const teacherContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const teacher = await teacherContext.newPage(), student = await studentContext.newPage(), errors = [];
  for (const page of [teacher, student]) page.on('pageerror', error => errors.push(error.message));
  await student.route('**/api/classrooms/open', route => route.abort());
  await student.goto(servers.origin + '/lab3/?scoutTheme=light');
  await expect(student.locator('#classes-status')).toContainText('수업 목록을 불러오지 못했습니다');
  await expect(student.locator('#join button[type=submit]')).toBeDisabled();
  await student.unroute('**/api/classrooms/open');
  await student.locator('#classes-retry').click();
  await expect(student.locator('#classes-status')).toContainText('현재 오픈된 수업이 없습니다');
  await expect(student.locator('#class-select')).toBeDisabled();
  await expect(student.locator('#join input[name=code], #restore, .recovery')).toHaveCount(0);
  await teacher.goto(servers.origin + '/lab3/instructor.html?scoutTheme=light');
  await teacher.locator('#admin-login [name=admin]').fill(adminKey);
  await teacher.locator('#admin-login button').click();
  await expect(teacher.locator('#admin-home')).toBeVisible();
  async function create(title) {
    await teacher.locator('#create [name=title]').fill(title); await teacher.locator('#create button').click();
    await expect(teacher.locator('#class-title')).toHaveText(title);
    await expect(teacher.locator('#enrollment-control')).toHaveText('수업 오픈');
    const id = await teacher.locator('#join-code').textContent();
    await teacher.locator('#enrollment-control').click();
    await expect(teacher.locator('#enrollment-control')).toHaveText('수업 종료');
    return id;
  }
  const a = await create('수업 A');
  await expect(student.locator('#class-select option[value="' + a + '"]')).toHaveCount(1, { timeout: 15000 });
  assert.equal(await student.locator('#class-select').inputValue(), '');
  await student.locator('#class-select').selectOption(a);
  await student.locator('#join [name=nickname]').fill('선택한 학생');
  await teacher.locator('#back-list').click(); await expect(teacher.locator('#admin-home')).toBeVisible();
  const b = await create('수업 B');
  await expect(student.locator('#class-select option[value="' + b + '"]')).toHaveCount(1, { timeout: 15000 });
  assert.equal(await student.locator('#class-select').inputValue(), a);
  const manager = JSON.parse(await teacher.evaluate(origin => sessionStorage.getItem(`lab3.admin:${origin}`), servers.apiOrigin));
  const actor = { classroomId: a, credential: manager.credential };
  await student.route('**/api/join', async route => {
    await servers.enrollment(actor, false); await route.continue();
  });
  await student.locator('#join button[type=submit]').click();
  await expect(student.locator('#message')).toContainText('선택한 수업이 종료');
  await expect(student.locator('#join button[type=submit]')).toBeDisabled();
  await expect(student.locator('#classroom')).toBeHidden();
  assert.equal((await servers.state(actor)).data.participants.length, 0);
  assert.equal(await student.locator('#class-select').inputValue(), a);
  await student.unroute('**/api/join');
  await servers.enrollment(actor, true);
  await expect(student.locator('#join button[type=submit]')).toBeEnabled({ timeout: 15000 });
  await student.locator('#join button[type=submit]').click();
  await expect(student.locator('#role')).toContainText('선택한 학생');
  const saved = JSON.parse(await student.evaluate(origin => localStorage.getItem(`lab3.session:${origin}:student`), servers.apiOrigin));
  await servers.enrollment(actor, false); await servers.gate(actor, '3-1', true);
  await expect(student.locator('#next-portion')).toBeEnabled({ timeout: 10000 });
  await student.locator('#next-portion').click();
  await expect(student.locator('#activity')).toBeVisible();
  const frame = student.frameLocator('#activity');
  await expect(frame.locator('#clip-primary')).toHaveText('영상 보기');
  assert.equal(await frame.locator('#clip-v').evaluate(video => video.paused), true);
  await student.reload(); await expect(student.locator('#continue')).toBeEnabled();
  await expect(student.locator('#resume-status')).toContainText('수업 A');
  await student.locator('#continue').click(); await expect(student.locator('#activity')).toBeVisible();
  assert.equal((await servers.state(actor)).data.participants.length, 1);
  await student.reload(); await expect(student.locator('#restart')).toBeEnabled(); await student.locator('#restart').click();
  await expect(student.locator('#join')).toBeVisible();
  assert.equal((await servers.state(saved)).data.participant.epoch, 1);
  assert.equal((await servers.state(actor)).data.participants.length, 1);
  await servers.enrollment(actor, true);
  await expect(student.locator('#class-select option[value="' + a + '"]')).toHaveCount(1, { timeout: 15000 });
  await student.locator('#class-select').selectOption(a); await student.locator('#join [name=nickname]').fill('선택한 학생');
  await student.locator('#join button[type=submit]').click(); await expect(student.locator('#pre-start')).toBeVisible();
  await student.locator('#next-portion').click(); await expect(student.locator('#activity')).toBeVisible();
  if (process.env.LAB3_UI_EVIDENCE_DIR) await mkdir(process.env.LAB3_UI_EVIDENCE_DIR, { recursive: true });
  for (const theme of ['light', 'dark']) {
    await student.evaluate(theme => { document.documentElement.dataset.theme = theme;
      document.querySelector('#activity').contentDocument.documentElement.dataset.theme = theme; }, theme);
    await teacher.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    for (const width of [1440, 390]) {
      await student.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await teacher.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      assert.equal(await student.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const page of [student, teacher]) {
        assert.equal(await page.evaluate(() => {
          const reference = document.createElement('div');
          reference.style.background = 'var(--cp-surface-soft)'; reference.style.color = 'var(--cp-link)';
          document.body.append(reference);
          const colors = getComputedStyle(reference);
          const matches = getComputedStyle(document.body).backgroundColor === colors.backgroundColor &&
            getComputedStyle(document.querySelector('button.primary')).backgroundColor === colors.color;
          reference.remove(); return matches;
        }), true);
      }
      if (process.env.LAB3_UI_EVIDENCE_DIR) await student.screenshot({ path: join(process.env.LAB3_UI_EVIDENCE_DIR, `local-neutral-${theme}-${width}.png`) });
    }
  }
  assert.deepEqual(errors, []);
});
