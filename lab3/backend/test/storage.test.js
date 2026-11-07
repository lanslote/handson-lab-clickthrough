import test from 'node:test';
import assert from 'node:assert/strict';
import { azurite, fixture, adminKey } from './helpers.js';

test('real Table transactions: concurrent joins, idempotent progress, gate-close race and disk persistence', { timeout: 60000 }, async t => {
  const emulator = await azurite(); t.after(() => emulator.close());
  let f = fixture(emulator.store), teacher = await f.create();
  const students = await Promise.all(Array.from({ length: 6 }, () => f.joinStudent(teacher)));
  assert.ok(students.every(student => student?.credential));
  assert.equal((await f.state(teacher)).data.participants.length, 6);
  await f.gate(teacher, '3-1', true);
  await f.enter(students[0], '3-1');
  const repeats = await Promise.all(Array.from({ length: 4 }, () => f.progress(students[0], '3-1', 'intro', 0)));
  assert.ok(repeats.every(result => result.status === 200));
  assert.equal((await f.state(students[0])).data.participant.cursor, 1);
  const [, racingEntry] = await Promise.all([f.gate(teacher, '3-1', false), f.enter(students[1], '3-1')]);
  assert.ok([200, 423].includes(racingEntry.status));
  assert.equal((await f.enter(students[2], '3-1')).status, 423);
  assert.equal((await f.progress(students[0], '3-1', 'create', 0)).status, 200);
  await emulator.restart(); f = fixture(emulator.store);
  assert.equal((await f.state(students[0])).data.participant.cursor, 2);
  assert.equal((await f.state(teacher)).data.classroom.portions[0].open, false);
  assert.equal((await f.state(teacher)).data.participants.length, 6);
  const rows = await emulator.store.students(teacher.classroomId);
  assert.ok(rows.every(student => !student.credential && !student.answers && !student.reflection));
});

test('management sessions and existing classroom listing persist across real Table server restarts', { timeout: 60000 }, async t => {
  const emulator = await azurite(); t.after(() => emulator.close());
  let f = fixture(emulator.store);
  const teacher = await f.create(), student = await f.joinStudent(teacher);
  const manager = (await f.call('/api/admin/login', { method: 'POST', token: adminKey, body: {} })).data.session;
  await f.call('/api/admin/classrooms', { method: 'POST', token: manager.credential, body: { title: 'Table session class' } });
  await emulator.restart(); f = fixture(emulator.store);
  assert.equal((await f.call('/api/admin/classrooms', { token: manager.credential })).data.classrooms.length, 2);
  assert.equal((await f.gate({ ...teacher, credential: manager.credential }, '3-1', true)).status, 200);
  assert.equal((await f.enter(student, '3-1')).status, 200);
  assert.equal((await f.call('/api/admin/logout', { method: 'POST', token: manager.credential, body: {} })).status, 200);
  assert.equal((await f.call('/api/admin/classrooms', { token: manager.credential })).status, 401);
  assert.equal((await f.state(teacher)).status, 200);
});
