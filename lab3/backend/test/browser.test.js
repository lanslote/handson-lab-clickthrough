import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { azurite, browserServers, adminKey, MemoryStore } from './helpers.js';
import { curriculum } from '../src/curriculum.js';

async function browser() {
  return chromium.launch({ channel: process.env.LAB3_BROWSER_CHANNEL || 'msedge', headless: true });
}

async function learner(context, origin, code, nickname) {
  await context.addInitScript(ids => {
    if (location.protocol !== 'http:') return;
    localStorage.setItem('hol2.watched', JSON.stringify(ids));
    localStorage.setItem('lab3.force', '0');
  }, curriculum.flatMap(portion => portion.steps.map(step => step.id)));
  const page = await context.newPage();
  await page.goto(origin + '/lab3/');
  await page.locator('#join [name=code]').fill(code);
  await page.locator('#join [name=nickname]').fill(nickname);
  await page.locator('#join button').click();
  await expect(page.locator('#role')).toContainText(nickname);
  return page;
}

test('independent instructor/learner contexts: real activities, wait/release, lagging student, refresh, rejoin and disconnect recovery',
  { timeout: 90000 }, async t => {
    const emulator = await azurite(); t.after(() => emulator.close());
    const servers = await browserServers(emulator.store); t.after(() => servers.close());
    const instance = await browser(); t.after(() => instance.close());
    const contexts = await Promise.all(Array.from({ length: 4 }, () => instance.newContext({ viewport: { width: 1440, height: 1100 } })));
    const [teacherContext, fastContext, slowContext, restoredContext] = contexts;
    const teacherPage = await teacherContext.newPage();
    const errors = [];
    for (const context of contexts) context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await teacherPage.goto(servers.origin + '/lab3/instructor.html');
    await teacherPage.locator('#admin-login [name=admin]').fill(adminKey);
    await teacherPage.locator('#admin-login button').click();
    await expect(teacherPage.locator('#admin-home')).toBeVisible();
    await teacherPage.locator('#create [name=title]').fill('브라우저 수업');
    await teacherPage.locator('#create button').click();
    await expect(teacherPage.locator('#join-code')).toHaveText(/^[A-F0-9]{12}$/);
    const code = await teacherPage.locator('#join-code').textContent();
    const fast = await learner(fastContext, servers.origin, code, '먼저 하는 사람');
    const slow = await learner(slowContext, servers.origin, code, '천천히 하는 사람');
    await expect(fast.locator('#next-portion')).toBeHidden();
    await teacherPage.locator('[data-gate="3-1"]').click();
    await expect(fast.locator('#next-portion')).toBeVisible({ timeout: 10000 });
    await fast.locator('#next-portion').click();
    await expect(fast.locator('#activity')).toBeVisible();
    const frame = fast.frameLocator('#activity');
    await expect(frame.locator('[data-g=next]')).toBeVisible();
    await expect(teacherPage.locator('.gate').first()).toContainText('0 / 2명 완료');

    await fastContext.setOffline(true);
    await frame.locator('[data-g=next]').click();
    await expect(fast.locator('#connection')).toContainText('저장 대기');
    await expect(frame.locator('#guide h2')).toHaveText('Contoso IT Concierge 만들기');
    await fastContext.setOffline(false);
    await expect(frame.locator('[data-hot]')).toBeVisible({ timeout: 15000 });
    await frame.locator('[data-hot]').click();
    await frame.locator('[data-in]').fill('Contoso IT Concierge');
    const activityFrame = fast.frames().find(item => item !== fast.mainFrame());
    const instructions = await activityFrame.evaluate(() => LAB.steps.find(step => step.id === 'instructions').actions[0].value);
    await frame.locator('[data-in]').fill(instructions);
    await frame.locator('[data-q="2"]').click();
    await frame.locator('[data-g=qnext]').click();
    await expect(frame.locator('#guide h2')).toHaveText('안내(지침) 붙여넣기');
    await expect(fast.locator('#learner-status')).toContainText('완료 · 강사 개방 대기');
    await expect(fast.locator('#next-portion')).toBeHidden();
    await expect(teacherPage.locator('.gate').first()).toContainText('1 / 2명 완료', { timeout: 10000 });

    await teacherPage.route('**/gates/3-2', route => route.abort());
    await teacherPage.locator('[data-gate="3-2"]').click();
    await expect(teacherPage.locator('#message')).toContainText('개방 변경을 확인하지 못했습니다');
    await expect(teacherPage.locator('[data-gate="3-2"]')).toHaveText('입장 열기');
    await expect(fast.locator('#next-portion')).toBeHidden();
    await teacherPage.unroute('**/gates/3-2');
    await expect(teacherPage.locator('[data-gate="3-2"]')).toBeEnabled({ timeout: 10000 });
    await teacherPage.locator('[data-gate="3-2"]').click();
    await expect(fast.locator('#next-portion')).toHaveText(/3-2/);
    await expect(fast.locator('#next-portion')).toBeVisible({ timeout: 10000 });
    await expect(frame.locator('#guide h2')).toHaveText('안내(지침) 붙여넣기');
    await expect(slow.locator('#next-portion')).toHaveText(/3-1/);
    await fast.locator('#next-portion').click();
    await expect(frame.locator('#guide h2')).toHaveText('공개 웹 사이트 지식 준비');
    await teacherPage.locator('[data-gate="3-2"]').click();
    await frame.locator('[data-hot]').click();
    await expect(frame.locator('.todo li.done')).toHaveCount(1);
    await fast.reload();
    await expect(fast.locator('#resume')).toBeVisible();
    await fast.locator('#continue').click();
    await expect(fast.locator('#activity')).toBeVisible();
    await expect(frame.locator('.todo li.done')).toHaveCount(1);
    await expect(frame.locator('#guide h2')).toHaveText('공개 웹 사이트 지식 준비');

    const saved = await fast.evaluate(origin => localStorage.getItem(`lab3.session:${origin}:student`), servers.apiOrigin);
    await restoredContext.addInitScript(({ origin, saved }) => {
      if (location.protocol === 'http:') localStorage.setItem(`lab3.session:${origin}:student`, saved);
    }, { origin: servers.apiOrigin, saved });
    const restored = await restoredContext.newPage();
    await restored.goto(servers.origin + '/lab3/');
    await expect(restored.locator('#resume')).toBeVisible();
    await restored.locator('#continue').click();
    await expect(restored.locator('#role')).toContainText('먼저 하는 사람');
    await expect(restored.locator('#learner-status')).toContainText('3-2');
    await expect(teacherPage.locator('#roster-count')).toHaveText('2명 입장');
    assert.deepEqual(errors, []);
  });

test('unconfigured server is explicit; forced video cannot be skipped or fast-forwarded and errors do not complete it',
  { timeout: 45000 }, async t => {
    const emulator = await azurite(); t.after(() => emulator.close());
    const servers = await browserServers(emulator.store); t.after(() => servers.close());
    const instance = await browser(); t.after(() => instance.close());
    const context = await instance.newContext();
    const page = await context.newPage();
    await page.route('**/lab3/config.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.LAB3_CONFIG={apiBase:""};' }));
    await page.goto(servers.origin + '/lab3/');
    await expect(page.locator('#connection')).toContainText('수업 서버 미설정');
    await expect(page.locator('#join button')).toBeDisabled();
    await page.unroute('**/lab3/config.js');
    const teacher = await servers.create(), student = await servers.joinStudent(teacher);
    await servers.gate(teacher, '3-1', true); await servers.enter(student, '3-1');
    await context.addInitScript(({ origin, session }) => {
      if (location.protocol !== 'http:') return;
      localStorage.setItem(`lab3.session:${origin}`, JSON.stringify(session));
    }, { origin: servers.apiOrigin, session: student });
    await page.route('**/lab3/activity.js', route => route.abort());
    await page.reload();
    await expect(page.locator('#resume')).toBeVisible();
    await page.locator('#continue').click();
    await expect(page.locator('#activity-error')).toContainText('실습 엔진 파일을 불러오지 못했습니다');
    assert.equal((await servers.state(student)).data.participant.cursor, 0);
    await page.unroute('**/lab3/activity.js');
    await page.reload();
    await expect(page.locator('#resume')).toBeVisible();
    await page.locator('#continue').click();
    await expect(page.locator('#activity')).toBeVisible();
    const frame = page.frameLocator('#activity');
    await expect(page.locator('#force-video')).toBeChecked();
    await expect(frame.locator('video')).toBeVisible();
    await expect(frame.locator('[data-clip=skip]')).toHaveCount(0);
    await expect(frame.locator('[data-g=next]')).toHaveCount(0);
    const activityFrame = page.frames().find(item => item !== page.mainFrame());
    await activityFrame.evaluate(() => {
      const video = document.querySelector('video');
      video.currentTime = 30; video.dispatchEvent(new Event('timeupdate'));
    });
    assert.ok(await frame.locator('video').evaluate(video => video.currentTime) < 3);
    await activityFrame.evaluate(() => document.querySelector('video').dispatchEvent(new Event('error')));
    await expect(frame.locator('[data-video-retry]')).toBeVisible();
    assert.equal((await servers.state(student)).data.participant.cursor, 0);
  });

test('all original activity kinds remain required and no answers are transmitted', { timeout: 90000 }, async t => {
  const emulator = await azurite(); t.after(() => emulator.close());
  const servers = await browserServers(emulator.store); t.after(() => servers.close());
  const instance = await browser(); t.after(() => instance.close());
  const context = await instance.newContext({ viewport: { width: 1440, height: 1100 } });
  const teacher = await servers.create();
  const page = await learner(context, servers.origin, teacher.classroomId, '전체 실습');
  const progressBodies = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().endsWith('/progress')) progressBodies.push(request.postDataJSON());
  });
  const session = JSON.parse(await page.evaluate(origin => localStorage.getItem(`lab3.session:${origin}:student`), servers.apiOrigin));
  const frame = page.frameLocator('#activity');
  const kinds = new Set();
  for (const portion of curriculum) {
    await servers.gate(teacher, portion.id, true);
    await expect(page.locator('#next-portion')).toBeVisible({ timeout: 10000 });
    await page.locator('#next-portion').click();
    await expect(page.locator('#activity')).toBeVisible();
    await expect(frame.locator('.tag')).toHaveText(`${portion.id} · 수업 실습`);
    const activity = page.frames().find(item => item !== page.mainFrame());
    for (let cursor = portion.start; cursor < portion.end; cursor++) {
      const current = await activity.evaluate(() => {
        const action = curAction();
        return {
          key: `${curStep().id}:${actionIdx}:${done}`, manual: curStep().manual,
          kind: action?.kind, value: action?.value, answer: action?.answer, file: action?.file,
          images: action?.imgs?.length
        };
      });
      kinds.add(current.kind || 'manual');
      if (current.manual) await frame.locator('[data-g=next]').click();
      else if (current.kind === 'click') await frame.locator('[data-hot]').click();
      else if (current.kind === 'input') await frame.locator('[data-in]').fill(current.value);
      else if (current.kind === 'filepick') {
        await frame.getByRole('button', { name: `📄 ${current.file}`, exact: true }).click();
        await frame.locator('[data-open]').click();
      } else if (current.kind === 'quiz') {
        await frame.locator(`[data-q="${current.answer}"]`).click();
        assert.equal((await servers.state(session)).data.participant.cursor, cursor);
        await frame.locator('[data-g=qnext]').click();
      } else if (current.kind === 'edit') await frame.locator('[data-edit]').fill(current.value);
      else if (current.kind === 'compare') {
        for (let image = 0; image < current.images; image++) await frame.locator(`[data-cmp="${image}"]`).click();
        assert.equal((await servers.state(session)).data.participant.cursor, cursor);
        await frame.locator('[data-g=cmpnext]').click();
      } else if (current.kind === 'reflect') {
        await frame.locator('[data-reflect]').fill('역할은 HR 도우미로 바꾸고 범위를 휴가 규정으로 제한하며 지식 문서를 교체하고 보안을 유지한다.');
        await frame.locator('[data-g=reflsubmit]').click();
        assert.equal((await servers.state(session)).data.participant.cursor, cursor);
        await frame.locator('[data-g=qnext]').click();
      } else throw new Error(`Unknown activity in ${portion.id}: ${JSON.stringify(current)}`);
      await expect.poll(async () => (await servers.state(session)).data.participant.cursor).toBe(cursor + 1);
      await expect.poll(() => activity.evaluate(() => `${curStep().id}:${actionIdx}:${done}`)).not.toBe(current.key);
    }
    await expect(frame.locator('#guide h2')).toHaveText(portion.steps.at(-1).title);
  }
  assert.equal((await servers.state(session)).data.participant.state, 'finished');
  assert.deepEqual([...kinds].sort(), ['click', 'compare', 'edit', 'filepick', 'input', 'manual', 'quiz', 'reflect']);
  assert.ok(progressBodies.length > 30);
  assert.ok(progressBodies.every(body => Object.keys(body).sort().join() === 'actionIndex,epoch,portionId,stepId'));
  assert.deepEqual(errors, []);
});

test('separate entry pages preserve legacy credentials without student manual recovery controls', { timeout: 60000 }, async t => {
  const servers = await browserServers(new MemoryStore()); t.after(() => servers.close());
  const instance = await browser(); t.after(() => instance.close());
  const context = await instance.newContext();
  const studentPage = await context.newPage(), teacherPage = await context.newPage();
  const errors = [];
  for (const page of [studentPage, teacherPage]) page.on('pageerror', error => errors.push(error.message));
  const teacher = await servers.create(), student = await servers.joinStudent(teacher);
  const legacyKey = `lab3.session:${servers.apiOrigin}`;
  await studentPage.goto(servers.origin + '/lab3/');
  await expect(studentPage.locator('#create, #teacher')).toHaveCount(0);
  await expect(studentPage.locator('a[href="instructor.html"]')).toHaveAttribute('href', 'instructor.html');
  await studentPage.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: legacyKey, value: teacher });
  await studentPage.reload();
  await expect(studentPage.locator('#join')).toBeVisible();
  await expect(studentPage.locator('#classroom')).toBeHidden();
  assert.equal(await studentPage.evaluate(key => localStorage.getItem(key), legacyKey), null);
  assert.ok(await studentPage.evaluate(key => !!localStorage.getItem(key), `${legacyKey}:teacher`));
  await teacherPage.goto(servers.origin + '/lab3/instructor.html');
  await expect(teacherPage.locator('#admin-login')).toBeVisible();
  await teacherPage.locator('#legacy-access summary').click();
  await teacherPage.locator('#legacy-resume').click();
  await expect(teacherPage.locator('#role')).toHaveText('강사 관리 화면');
  await expect(teacherPage.locator('#join, #learner, #activity')).toHaveCount(0);
  await expect(teacherPage.locator('#learner-url')).toHaveAttribute('href', servers.origin + '/lab3/');
  await expect(teacherPage.getByRole('link', { name: '수강생 입장 →' })).toHaveAttribute('href', './');

  async function restore(page, session) {
    if (!await page.locator('#restore').isVisible()) await page.locator('#legacy-access summary').click();
    await page.locator('#restore [name=code]').fill(session.classroomId);
    await page.locator('#restore [name=credential]').fill(session.credential);
    await page.locator('#restore button').click();
  }
  await expect(studentPage.locator('#restore, #recovery-key, .recovery')).toHaveCount(0);
  assert.equal(await studentPage.evaluate(key => localStorage.getItem(key), `${legacyKey}:student`), null);
  await studentPage.evaluate(({ key, student }) => localStorage.setItem(key, JSON.stringify(student)), { key: `${legacyKey}:student`, student });
  await studentPage.reload();
  await expect(studentPage.locator('#resume')).toBeVisible();
  await studentPage.locator('#continue').click();
  await expect(studentPage.locator('#role')).toContainText('수강생');
  const originalStudentRecord = await studentPage.evaluate(key => localStorage.getItem(key), `${legacyKey}:student`);
  const originalTeacherRecord = await studentPage.evaluate(key => localStorage.getItem(key), `${legacyKey}:teacher`);
  await studentPage.reload(); await teacherPage.reload();
  await expect(studentPage.locator('#resume')).toBeVisible();
  await studentPage.locator('#continue').click();
  await teacherPage.locator('#legacy-access summary').click();
  await teacherPage.locator('#legacy-resume').click();
  await expect(studentPage.locator('#role')).toContainText('수강생');
  await expect(teacherPage.locator('#role')).toHaveText('강사 관리 화면');
  await teacherPage.locator('#leave').click();
  await expect(teacherPage.locator('#admin-login')).toBeVisible();
  assert.equal(await studentPage.evaluate(key => localStorage.getItem(key), `${legacyKey}:student`), originalStudentRecord);
  await restore(teacherPage, student, false);
  await expect(teacherPage.locator('#message')).toContainText('수강생 복구 키입니다');
  await expect(teacherPage.locator('#classroom')).toBeHidden();
  assert.equal(await teacherPage.evaluate(key => localStorage.getItem(key), `${legacyKey}:teacher`), null);
  await restore(teacherPage, teacher, false);
  await expect(teacherPage.locator('#classroom')).toBeVisible();
  await expect(teacherPage.locator('#role')).toHaveText('강사 관리 화면');
  assert.equal(await teacherPage.evaluate(key => localStorage.getItem(key), `${legacyKey}:teacher`), originalTeacherRecord);

  const anotherStudent = await servers.joinStudent(teacher);
  await studentPage.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: legacyKey, value: anotherStudent });
  await studentPage.reload();
  await expect(studentPage.locator('#resume')).toBeVisible();
  await studentPage.locator('#continue').click();
  assert.equal(await studentPage.evaluate(key => localStorage.getItem(key), `${legacyKey}:student`), originalStudentRecord);
  assert.ok(await studentPage.evaluate(key => !!localStorage.getItem(key), legacyKey));
  await studentPage.evaluate(key => localStorage.removeItem(`${key}:student`), legacyKey);
  await teacherPage.reload(); // Visiting the other page must still preserve/migrate the learner's credential.
  assert.equal(await teacherPage.evaluate(key => localStorage.getItem(key), legacyKey), null);
  await studentPage.reload();
  await expect(studentPage.locator('#resume')).toBeVisible();
  await studentPage.locator('#continue').click();
  await expect(studentPage.locator('#role')).toContainText('수강생');
  assert.equal(JSON.parse(await studentPage.evaluate(key => localStorage.getItem(key), `${legacyKey}:student`)).credential, anotherStudent.credential);
  assert.deepEqual(errors, []);
});

test('instructor form accepts a nine-character configured password and still accepts long passwords', { timeout: 45000 }, async t => {
  const password = randomBytes(9).toString('hex').slice(0, 9);
  const servers = await browserServers(new MemoryStore(), password); t.after(() => servers.close());
  const instance = await browser(); t.after(() => instance.close());
  const page = await instance.newPage();
  await page.goto(servers.origin + '/lab3/instructor.html');
  await expect(page.getByLabel('강사 비밀키', { exact: true })).toHaveAttribute('minlength', '8');
  await page.locator('#admin-login [name=admin]').fill(adminKey);
  assert.equal(await page.locator('#admin-login').evaluate(form => form.checkValidity()), true);
  await page.locator('#admin-login [name=admin]').fill(password);
  await page.locator('#admin-login button').click();
  await expect(page.locator('#admin-home')).toBeVisible();
  await page.locator('#create [name=title]').fill('아홉 글자 테스트');
  await page.locator('#create button').click();
  await expect(page.locator('#classroom')).toBeVisible();
  await expect(page.locator('#role')).toHaveText('강사 관리 화면');
});

test('one instructor login manages two classes, restores on refresh, distinguishes network failures and revokes logout/expiry', { timeout: 90000 }, async t => {
  const store = new MemoryStore(), servers = await browserServers(store); t.after(() => servers.close());
  const legacy = await servers.create(), student = await servers.joinStudent(legacy);
  const instance = await browser(); t.after(() => instance.close());
  const context = await instance.newContext();
  const page = await context.newPage();
  const errors = [], passwordRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.headers().authorization === `Bearer ${adminKey}`) passwordRequests.push(new URL(request.url()).pathname);
  });
  await page.goto(servers.origin + '/lab3/instructor.html');
  await expect(page.locator('#admin-login')).toBeVisible();
  for (const selector of ['#admin-home', '#create', '#classroom']) await expect(page.locator(selector)).toBeHidden();
  await page.evaluate(({ origin, teacher, student }) => {
    localStorage.setItem(`lab3.session:${origin}:teacher`, JSON.stringify(teacher));
    localStorage.setItem(`lab3.session:${origin}:student`, JSON.stringify(student));
  }, { origin: servers.apiOrigin, teacher: legacy, student });
  await page.locator('#admin-login [name=admin]').fill(adminKey + 'wrong');
  await page.locator('#admin-login button').click();
  await expect(page.locator('#message')).toContainText('강사 비밀키가 올바르지 않습니다');
  await page.locator('#admin-login [name=admin]').fill(adminKey);
  await page.locator('#admin-login button').click();
  await expect(page.locator('#admin-home')).toBeVisible();
  await expect(page.locator('#admin-login')).toBeHidden();
  await expect(page.locator('#admin-login [name=admin]')).toHaveValue('');
  await expect(page.locator(`[data-manage="${legacy.classroomId}"]`)).toBeVisible();
  for (const title of ['First classroom', 'Second classroom']) {
    await page.locator('#create [name=title]').fill(title);
    await page.locator('#create button').click();
    await expect(page.locator('#classroom')).toBeVisible();
    await expect(page.locator('#class-title')).toHaveText(title);
    await expect(page.locator('.recovery')).toBeHidden();
    await page.locator('[data-gate="3-1"]').click();
    await expect(page.locator('[data-gate="3-1"]')).toHaveText('입장 닫기');
    await page.locator('#back-list').click();
    await expect(page.locator('#admin-home')).toBeVisible();
  }
  await expect(page.locator('#classrooms-list h3').first()).toHaveText('Second classroom');
  await page.reload();
  await expect(page.locator('#admin-home')).toBeVisible();
  await page.locator(`[data-manage="${legacy.classroomId}"]`).click();
  await expect(page.locator('#class-title')).toHaveText('함께하는 실습');
  await page.locator('[data-gate="3-1"]').click();
  await expect(page.locator('[data-gate="3-1"]')).toHaveText('입장 닫기');
  await page.reload();
  await expect(page.locator('#classroom')).toBeVisible();
  await expect(page.locator('#class-title')).toHaveText('함께하는 실습');
  const manager = JSON.parse(await page.evaluate(origin => sessionStorage.getItem(`lab3.admin:${origin}`), servers.apiOrigin));
  assert.match(manager.credential, /^a_[a-f0-9]{16}\.[A-Za-z0-9_-]{43}$/);
  assert.equal(await page.evaluate(password => JSON.stringify({ ...localStorage, ...sessionStorage }).includes(password), adminKey), false);
  assert.deepEqual(passwordRequests, ['/api/admin/login']);
  assert.equal((await servers.state(legacy)).status, 200);
  assert.equal((await servers.enter(student, '3-1')).status, 200);
  await context.setOffline(true);
  await page.locator('#admin-logout').click();
  await expect(page.locator('#message')).toContainText('관리 로그아웃을 확인하지 못했습니다');
  await expect(page.locator('#classroom')).toBeVisible();
  assert.ok(await page.evaluate(origin => !!sessionStorage.getItem(`lab3.admin:${origin}`), servers.apiOrigin));
  await context.setOffline(false);
  await expect(page.locator('#connection')).toHaveAttribute('data-state', 'online', { timeout: 15000 });
  await page.locator('#admin-logout').click();
  await expect(page.locator('#admin-login')).toBeVisible();
  for (const selector of ['#admin-home', '#classroom']) await expect(page.locator(selector)).toBeHidden();
  assert.equal((await servers.call('/api/admin/classrooms', { token: manager.credential })).status, 401);
  await page.reload();
  await expect(page.locator('#admin-login')).toBeVisible();
  assert.ok(await page.evaluate(origin => !!localStorage.getItem(`lab3.session:${origin}:teacher`) &&
    !!localStorage.getItem(`lab3.session:${origin}:student`), servers.apiOrigin));
  await page.locator('#admin-login [name=admin]').fill(adminKey);
  await page.locator('#admin-login button').click();
  await expect(page.locator('#admin-home')).toBeVisible();
  const expiring = JSON.parse(await page.evaluate(origin => sessionStorage.getItem(`lab3.admin:${origin}`), servers.apiOrigin));
  const entity = await store.read('admin', `session:${expiring.credential.slice(2, 18)}`);
  store.put({ ...entity, expiresAt: Date.now() - 1 });
  await expect(page.locator('#admin-login')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#message')).toContainText('만료');
  await expect(page.locator('#connection')).toHaveAttribute('data-state', 'online');
  assert.equal(await page.evaluate(origin => sessionStorage.getItem(`lab3.admin:${origin}`), servers.apiOrigin), null);
  assert.deepEqual(errors, []);
});
