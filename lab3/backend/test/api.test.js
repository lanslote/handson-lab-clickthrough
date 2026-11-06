import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, adminKey, MemoryStore } from './helpers.js';
import { curriculum } from '../src/curriculum.js';

test('only an authorized teacher may create a class or change gates', async () => {
  const f = fixture();
  assert.equal((await f.call('/api/classrooms', { method: 'POST', body: { title: 'bad' } })).status, 403);
  const teacher = await f.create(), student = await f.joinStudent(teacher);
  assert.equal((await f.gate(student, '3-1', true)).status, 403);
  assert.equal((await f.call(`${f.path(teacher)}/gates/3-1`, { method: 'PUT', body: { open: true } })).status, 401);
  assert.equal((await f.state(teacher)).data.classroom.portions.some(portion => portion.open), false);
  assert.equal((await f.gate(teacher, '3-1', true)).status, 200);
});

test('locked boundaries, sequential activities and prerequisite completion are enforced by the API', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher);
  assert.equal((await f.enter(student, '3-1')).status, 423);
  assert.equal((await f.progress(student, '3-1', 'intro', 0)).status, 423);
  await f.gate(teacher, '3-1', true); await f.enter(student, '3-1');
  assert.equal((await f.progress(student, '3-1', 'rename', 0)).status, 409);
  await f.gate(teacher, '3-2', true);
  assert.equal((await f.enter(student, '3-2')).status, 409);
  assert.equal((await f.progress(student, '3-2', 'k-public', 0)).status, 423);
  assert.equal((await f.state(student)).data.participant.cursor, 0);
});

test('opening a page or polling is not completion; finished students wait for an explicit teacher release and their own entry', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher);
  await f.gate(teacher, '3-1', true); await f.enter(student, '3-1');
  await f.state(student); await f.state(student);
  assert.deepEqual((await f.state(student)).data.participant.completedPortions, []);
  await f.complete(student, '3-1');
  const waiting = (await f.state(student)).data;
  assert.equal(waiting.participant.state, 'waiting');
  assert.equal(waiting.classroom.portions[1].open, false);
  assert.equal((await f.state(teacher)).data.classroom.portions[0].completedCount, 1);
  await f.gate(teacher, '3-2', true);
  const released = (await f.state(student)).data.participant;
  assert.equal(released.state, 'ready'); assert.equal(released.activePortionId, '3-1');
  assert.equal(released.cursor, curriculum[0].end);
  await f.enter(student, '3-2');
  assert.equal((await f.state(student)).data.participant.activePortionId, '3-2');
});

test('closing a gate does not interrupt admitted or lagging learners; review never regresses progress', async () => {
  const f = fixture(), teacher = await f.create(), fast = await f.joinStudent(teacher), slow = await f.joinStudent(teacher);
  await f.gate(teacher, '3-1', true); await f.enter(fast, '3-1'); await f.enter(slow, '3-1');
  await f.complete(fast, '3-1'); await f.gate(teacher, '3-2', true); await f.enter(fast, '3-2');
  await f.gate(teacher, '3-1', false); await f.gate(teacher, '3-2', false);
  assert.equal((await f.progress(slow, '3-1', 'intro', 0)).status, 200);
  await f.complete(slow, '3-1');
  assert.equal((await f.enter(slow, '3-2')).status, 423);
  assert.equal((await f.progress(fast, '3-2', 'k-public', 0)).status, 200);
  const before = (await f.state(fast)).data.participant.cursor;
  await f.progress(fast, '3-1', 'intro', 0); await f.enter(fast, '3-1');
  assert.equal((await f.state(fast)).data.participant.cursor, before);
  assert.equal((await f.state(fast)).data.participant.activePortionId, '3-2');
});

test('participant credentials restore the same record; a nickname is not a credential and classrooms are isolated', async () => {
  const f = fixture(), a = await f.create(), b = await f.create(), student = await f.joinStudent(a);
  await f.gate(a, '3-1', true); await f.enter(student, '3-1'); await f.progress(student, '3-1', 'intro', 0);
  const restored = await f.state({ ...student });
  assert.equal(restored.data.participant.cursor, 1);
  const duplicate = await f.joinStudent(a);
  assert.notEqual(duplicate.credential, student.credential);
  assert.equal((await f.state(duplicate)).data.participant.cursor, 0);
  assert.equal((await f.call(f.path(b), { token: student.credential })).status, 401);
  assert.equal((await f.call(f.path(b), { token: a.credential })).status, 401);
  const learner = restored.data;
  assert.equal(learner.participants, undefined);
  assert.equal(JSON.stringify(learner).includes('tokenHash'), false);
  assert.equal(JSON.stringify(learner).includes('teacherHash'), false);
});

test('lost responses and concurrent retries complete exactly one activity; server state survives a new service instance', async () => {
  const store = new MemoryStore(), f = fixture(store), teacher = await f.create(), student = await f.joinStudent(teacher);
  await f.gate(teacher, '3-1', true); await f.enter(student, '3-1');
  const results = await Promise.all(Array.from({ length: 5 }, () => f.progress(student, '3-1', 'intro', 0)));
  assert.ok(results.every(result => result.status === 200));
  const restarted = fixture(store);
  assert.equal((await restarted.state(student)).data.participant.cursor, 1);
  assert.equal((await restarted.state(teacher)).data.classroom.portions[0].open, true);
});

test('classroom workflow reaches final completion without auto-release', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher);
  for (const portion of curriculum) {
    await f.gate(teacher, portion.id, true); await f.enter(student, portion.id); await f.complete(student, portion.id);
  }
  const final = (await f.state(student)).data.participant;
  assert.equal(final.state, 'finished'); assert.equal(final.completedPortions.length, 6);
});

test('unexpected answers/reflections, invalid JSON and untrusted origins are rejected', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher);
  const result = await f.call(`${f.path(student)}/progress`, {
    method: 'POST', token: student.credential, body: { portionId: '3-1', stepId: 'intro', actionIndex: 0, reflection: 'private' }
  });
  assert.equal(result.status, 400);
  assert.equal((await f.call('/api/health', { origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await f.call('/api/health', { method: 'OPTIONS' })).status, 204);
  assert.equal((await f.call('/api/classrooms', { method: 'POST', token: adminKey, body: { title: 'x'.repeat(4097) } })).status, 413);
  const invalid = await f.api({ method: 'POST', path: '/api/join', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(invalid.status, 400);
});
