import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { fixture, adminKey, MemoryStore } from './helpers.js';
import { curriculum } from '../src/curriculum.js';
import { ClassroomService } from '../src/service.js';
import { setTimeout as delay } from 'node:timers/promises';

test('eight/nine-character instructor password configuration preserves authentication and per-class credentials', async () => {
  const password = randomBytes(9).toString('hex').slice(0, 9);
  assert.throws(() => new ClassroomService(new MemoryStore(), curriculum, password.slice(0, 7)), /at least 8/);
  assert.doesNotThrow(() => new ClassroomService(new MemoryStore(), curriculum, password.slice(0, 8)));
  const f = fixture(new MemoryStore(), 'http://127.0.0.1:8080', password);
  assert.equal((await f.call('/api/classrooms', { method: 'POST', body: { title: 'test' } })).status, 403);
  assert.equal((await f.call('/api/classrooms', { method: 'POST', token: password + 'wrong', body: { title: 'test' } })).status, 403);
  const teacher = await f.create(), student = await f.joinStudent(teacher);
  assert.match(teacher.credential, /^t_[A-Za-z0-9_-]{43}$/);
  assert.match(student.credential, /^s_[a-f0-9]{16}\.[A-Za-z0-9_-]{43}$/);
  assert.equal((await f.gate(student, '3-1', true)).status, 403);
  assert.equal((await f.gate(teacher, '3-1', true)).status, 200);
  assert.equal((await f.call(f.path(teacher), { token: password })).status, 401);
});

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

test('management login requires the shared password and anonymous/student/classroom keys cannot list or create', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher);
  assert.equal((await f.call('/api/admin/login', { method: 'POST', token: adminKey + 'wrong', body: {} })).status, 403);
  assert.equal((await f.call('/api/admin/login', { method: 'POST', body: {} })).status, 403);
  for (const token of [undefined, student.credential, teacher.credential, adminKey]) {
    assert.ok([401, 403].includes((await f.call('/api/admin/classrooms', { token })).status));
    assert.ok([401, 403].includes((await f.call('/api/admin/classrooms', { method: 'POST', token, body: { title: 'not allowed' } })).status));
  }
  const result = await f.call('/api/admin/login', { method: 'POST', token: adminKey, body: {} });
  assert.equal(result.status, 201);
  assert.match(result.data.session.credential, /^a_[a-f0-9]{16}\.[A-Za-z0-9_-]{43}$/);
  assert.equal((await f.call('/api/admin/session', { token: result.data.session.credential })).status, 200);
});

test('one durable management session lists legacy and newly created classrooms and operates both without the password', async () => {
  const f = fixture(), legacy = await f.create(), student = await f.joinStudent(legacy);
  const manager = (await f.call('/api/admin/login', { method: 'POST', token: adminKey, body: {} })).data.session;
  const first = await f.call('/api/admin/classrooms', { method: 'POST', token: manager.credential, body: { title: 'first class' } });
  await delay(2);
  const second = await f.call('/api/admin/classrooms', { method: 'POST', token: manager.credential, body: { title: 'second class' } });
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  assert.equal(first.data.session, undefined); // Management creation does not issue a classroom teacher key.
  const list = (await f.call('/api/admin/classrooms', { token: manager.credential })).data.classrooms;
  assert.equal(list.length, 3);
  assert.equal(list[0].id, second.data.classroom.id);
  assert.ok(list.some(room => room.id === legacy.classroomId));
  assert.ok(list.every(room => Object.keys(room).sort().join() === 'archived,createdAt,enrollmentOpen,id,title'));
  for (const room of list) {
    const actor = { classroomId: room.id, credential: manager.credential };
    assert.equal((await f.state(actor)).data.role, 'teacher');
    assert.equal((await f.gate(actor, '3-1', true)).status, 200);
  }
  assert.equal((await f.state(legacy)).status, 200);
  assert.equal((await f.enter(student, '3-1')).status, 200);
  assert.equal((await f.enter({ classroomId: legacy.classroomId, credential: manager.credential }, '3-1')).status, 403);
  const restarted = fixture(f.store);
  assert.equal((await restarted.call('/api/admin/classrooms', { token: manager.credential })).status, 200);
  const entity = await f.store.read('admin', `session:${manager.credential.slice(2, 18)}`);
  assert.equal(entity.credential, undefined); assert.equal(entity.password, undefined);
  assert.equal(entity.tokenHash.length, 64);
});

test('management logout and expiry revoke list/create/read/gate permissions without revoking legacy participants', async () => {
  const f = fixture(), legacy = await f.create(), student = await f.joinStudent(legacy);
  async function login() { return (await f.call('/api/admin/login', { method: 'POST', token: adminKey, body: {} })).data.session; }
  const manager = await login();
  assert.equal((await f.call('/api/admin/logout', { method: 'POST', token: manager.credential, body: {} })).status, 200);
  async function assertRevoked(session) {
    assert.equal((await f.call('/api/admin/classrooms', { token: session.credential })).status, 401);
    assert.equal((await f.call('/api/admin/classrooms', { method: 'POST', token: session.credential, body: { title: 'blocked' } })).status, 401);
    assert.equal((await f.state({ ...legacy, credential: session.credential })).status, 401);
    assert.equal((await f.gate({ ...legacy, credential: session.credential }, '3-1', true)).status, 401);
  }
  await assertRevoked(manager);
  const expired = await login();
  const entity = await f.store.read('admin', `session:${expired.credential.slice(2, 18)}`);
  f.store.put({ ...entity, expiresAt: Date.now() - 1 });
  await assertRevoked(expired);
  assert.equal((await f.state(legacy)).status, 200); assert.equal((await f.state(student)).status, 200);
  assert.equal((await fixture(f.store, 'http://127.0.0.1:8080', adminKey + 'rotated').call('/api/admin/session', { token: (await login()).credential })).status, 401);
});

test('explicit learner reset preserves identity and gates, updates teacher counts and rejects unauthorized resets', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher), other = await f.joinStudent(teacher);
  await f.gate(teacher, '3-1', true); await f.enter(student, '3-1'); await f.enter(other, '3-1');
  await f.complete(student, '3-1'); await f.progress(other, '3-1', 'intro', 0);
  await f.gate(teacher, '3-1', false);
  const operation = { operationId: randomUUID(), expectedEpoch: 0 };
  assert.equal((await f.call(`${f.path(student)}/reset`, { method: 'POST', body: operation })).status, 401);
  assert.equal((await f.call(`${f.path(teacher)}/reset`, { method: 'POST', token: teacher.credential, body: operation })).status, 403);
  const manager = (await f.call('/api/admin/login', { method: 'POST', token: adminKey, body: {} })).data.session;
  assert.equal((await f.call(`${f.path(student)}/reset`, { method: 'POST', token: manager.credential, body: operation })).status, 403);
  const before = (await f.state(student)).data.participant;
  const result = await f.call(`${f.path(student)}/reset`, { method: 'POST', token: student.credential, body: operation });
  assert.equal(result.status, 200);
  assert.equal(result.data.participant.id, before.id); assert.equal(result.data.participant.nickname, before.nickname);
  assert.equal(result.data.participant.epoch, 1); assert.equal(result.data.participant.cursor, 0);
  assert.equal(result.data.participant.activePortionId, null); assert.deepEqual(result.data.participant.completedPortions, []);
  assert.equal((await f.state(other)).data.participant.cursor, 1);
  const roster = (await f.state(teacher)).data;
  assert.equal(roster.participants.length, 2); assert.equal(roster.classroom.portions[0].completedCount, 0);
  assert.equal(roster.classroom.portions[0].open, false);
  assert.equal((await f.call(`${f.path(student)}/enter`, { method: 'POST', token: student.credential, body: { portionId: '3-1', epoch: 1 } })).status, 423);
});

test('reset and progress races are atomic; lost reset responses are idempotent and old-epoch writes cannot advance', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher);
  await f.gate(teacher, '3-1', true); await f.enter(student, '3-1');
  const operation = { operationId: randomUUID(), expectedEpoch: 0 };
  await Promise.all([
    f.call(`${f.path(student)}/reset`, { method: 'POST', token: student.credential, body: operation }),
    f.progress(student, '3-1', 'intro', 0)
  ]);
  assert.equal((await f.state(student)).data.participant.cursor, 0);
  await f.call(`${f.path(student)}/enter`, { method: 'POST', token: student.credential, body: { portionId: '3-1', epoch: 1 } });
  assert.equal((await f.progress(student, '3-1', 'intro', 0)).status, 409);
  assert.equal((await f.call(`${f.path(student)}/progress`, { method: 'POST', token: student.credential, body: { portionId: '3-1', stepId: 'intro', actionIndex: 0, epoch: 0 } })).status, 409);
  await f.call(`${f.path(student)}/progress`, { method: 'POST', token: student.credential, body: { portionId: '3-1', stepId: 'intro', actionIndex: 0, epoch: 1 } });
  const retry = await f.call(`${f.path(student)}/reset`, { method: 'POST', token: student.credential, body: operation });
  assert.equal(retry.data.participant.cursor, 1); assert.equal(retry.data.participant.epoch, 1);
  assert.equal((await f.call(`${f.path(student)}/reset`, { method: 'POST', token: student.credential, body: { operationId: randomUUID(), expectedEpoch: 0 } })).status, 409);
});

test('new and legacy classrooms are closed by default; public enrollment listing is minimal and explicitly authorized', async () => {
  const f = fixture(), first = await f.create(), second = await f.create();
  const legacy = await f.store.read(second.classroomId, 'room');
  delete legacy.enrollmentOpen; f.store.put(legacy);
  assert.deepEqual((await f.call('/api/classrooms/open')).data.classrooms, []);
  assert.equal((await f.state(first)).data.classroom.enrollmentOpen, false);
  assert.equal((await f.call('/api/join', { method: 'POST', body: { code: first.classroomId, nickname: 'blocked' } })).status, 423);
  assert.equal((await f.call(`${f.path(first)}/enrollment`, { method: 'PUT', body: { open: true } })).status, 401);
  assert.equal((await f.enrollment({ ...first, credential: second.credential }, true)).status, 401);
  await f.enrollment(first, true);
  const joined = await f.call('/api/join', { method: 'POST', body: { code: first.classroomId, nickname: 'private nickname' } });
  assert.equal(joined.status, 201);
  assert.equal((await f.enrollment(joined.data.session, false)).status, 403);
  const publicData = (await f.call('/api/classrooms/open')).data;
  assert.equal(publicData.classrooms.length, 1);
  assert.deepEqual(Object.keys(publicData.classrooms[0]).sort(), ['id', 'title']);
  assert.equal(publicData.classrooms[0].id, first.classroomId);
  assert.equal(JSON.stringify(publicData).includes('private nickname'), false);
  assert.equal(JSON.stringify(publicData).includes('credential'), false);
  assert.equal(JSON.stringify(publicData).includes('tokenHash'), false);
  const manager = (await f.call('/api/admin/login', { method: 'POST', token: adminKey, body: {} })).data.session;
  assert.equal((await f.enrollment({ ...second, credential: manager.credential }, true)).status, 200);
  assert.equal((await f.call('/api/classrooms/open')).data.classrooms.length, 2);
});

test('classroom termination blocks new joins but preserves admitted learners, gates, progress and explicit reset', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher);
  await f.gate(teacher, '3-1', true); await f.enter(student, '3-1');
  await f.gate(teacher, '3-2', true);
  const gates = (await f.state(teacher)).data.classroom.portions.map(portion => portion.open);
  await f.enrollment(teacher, false);
  assert.deepEqual((await f.call('/api/classrooms/open')).data.classrooms, []);
  assert.equal((await f.call('/api/join', { method: 'POST', body: { code: teacher.classroomId, nickname: 'late learner' } })).status, 423);
  assert.deepEqual((await f.state(teacher)).data.classroom.portions.map(portion => portion.open), gates);
  await f.complete(student, '3-1');
  assert.equal((await f.enter(student, '3-2')).status, 200);
  assert.equal((await f.progress(student, '3-2', 'k-public', 0)).status, 200);
  const reset = await f.call(`${f.path(student)}/reset`, { method: 'POST', token: student.credential, body: { operationId: randomUUID(), expectedEpoch: 0 } });
  assert.equal(reset.status, 200);
  assert.equal((await f.call(`${f.path(student)}/enter`, { method: 'POST', token: student.credential, body: { portionId: '3-1', epoch: 1 } })).status, 200);
  assert.equal((await f.state(teacher)).data.participants.length, 1);
  assert.equal((await f.state(teacher)).data.classroom.enrollmentOpen, false);
});

test('a close/join race admits only transactions ordered before closure', async () => {
  const f = fixture(), teacher = await f.create();
  await f.enrollment(teacher, true);
  const [closed, joined] = await Promise.all([
    f.enrollment(teacher, false),
    f.call('/api/join', { method: 'POST', body: { code: teacher.classroomId, nickname: 'racing learner' } })
  ]);
  assert.equal(closed.status, 200); assert.ok([201, 423].includes(joined.status));
  const roster = (await f.state(teacher)).data;
  assert.equal(roster.participants.length, joined.status === 201 ? 1 : 0);
  assert.equal(roster.classroom.enrollmentOpen, false);
  assert.equal((await f.call('/api/join', { method: 'POST', body: { code: teacher.classroomId, nickname: 'after closure' } })).status, 423);
});

test('archive preserves classroom credentials and participant records while enforcing administrative listing permissions', async () => {
  const f = fixture(), teacher = await f.create(), otherTeacher = await f.create();
  const first = await f.joinStudent(teacher), second = await f.joinStudent(teacher);
  await f.gate(teacher, '3-1', true); await f.enter(first, '3-1'); await f.enter(second, '3-1');
  await f.complete(first, '3-1'); await f.progress(second, '3-1', 'intro', 0);
  const manager = (await f.call('/api/admin/login', { method: 'POST', token: adminKey, body: {} })).data.session;
  const archive = (token, archived) => f.call(`${f.path(teacher)}/archive`, { method: 'PUT', token, body: { archived } });
  assert.equal((await archive(undefined, true)).status, 401);
  assert.equal((await archive(first.credential, true)).status, 403);
  assert.equal((await archive(otherTeacher.credential, true)).status, 401);
  const beforeRows = await f.store.students(teacher.classroomId), beforeRoom = await f.store.read(teacher.classroomId, 'room');
  const rowCount = f.store.rows.size;
  const result = await archive(manager.credential, true);
  assert.equal(result.status, 200); assert.equal(result.data.classroom.archived, true);
  assert.equal(result.data.classroom.enrollmentOpen, false);
  assert.equal(f.store.rows.size, rowCount);
  assert.deepEqual(await f.store.students(teacher.classroomId), beforeRows);
  const afterRoom = await f.store.read(teacher.classroomId, 'room');
  assert.equal(afterRoom.teacherHash, beforeRoom.teacherHash); assert.equal(afterRoom.gates, beforeRoom.gates);
  assert.equal(afterRoom.studentCount, beforeRoom.studentCount);
  assert.equal((await f.state(first)).status, 200); assert.equal((await f.state(teacher)).status, 200);
  assert.equal((await f.call('/api/admin/classrooms', { token: manager.credential })).data.classrooms.some(room => room.id === teacher.classroomId), false);
  const archived = await f.call('/api/admin/classrooms/archived', { token: manager.credential });
  assert.deepEqual(archived.data.classrooms.map(room => room.id), [teacher.classroomId]);
  for (const token of [undefined, first.credential, teacher.credential]) {
    assert.ok([401, 403].includes((await f.call('/api/admin/classrooms/archived', { token })).status));
  }
  assert.equal((await f.enrollment(teacher, true)).status, 409);
  assert.equal((await f.call('/api/join', { method: 'POST', body: { code: teacher.classroomId, nickname: 'late' } })).status, 423);
  assert.equal((await f.call('/api/classrooms/open')).data.classrooms.some(room => room.id === teacher.classroomId), false);
});

test('archive/restore retains existing learner progress, reset and gates; restore never automatically opens admission', async () => {
  const f = fixture(), teacher = await f.create(), student = await f.joinStudent(teacher);
  await f.gate(teacher, '3-1', true); await f.enter(student, '3-1'); await f.complete(student, '3-1');
  await f.call(`${f.path(teacher)}/archive`, { method: 'PUT', token: teacher.credential, body: { archived: true } });
  await f.gate(teacher, '3-2', true);
  assert.equal((await f.enter(student, '3-2')).status, 200);
  assert.equal((await f.progress(student, '3-2', 'k-public', 0)).status, 200);
  assert.equal((await f.call(`${f.path(student)}/reset`, { method: 'POST', token: student.credential, body: { operationId: randomUUID(), expectedEpoch: 0 } })).status, 200);
  const before = (await f.state(student)).data.participant;
  const restored = await f.call(`${f.path(teacher)}/archive`, { method: 'PUT', token: teacher.credential, body: { archived: false } });
  assert.equal(restored.status, 200); assert.equal(restored.data.classroom.archived, false);
  assert.equal(restored.data.classroom.enrollmentOpen, false);
  assert.deepEqual({ ...(await f.state(student)).data.participant, lastSeen: 0 }, { ...before, lastSeen: 0 });
  assert.equal(restored.data.participants.length, 1);
  assert.equal(restored.data.classroom.portions[0].open, true); assert.equal(restored.data.classroom.portions[1].open, true);
  assert.equal((await f.call('/api/classrooms/open')).data.classrooms.length, 0);
  assert.equal((await f.enrollment(teacher, true)).status, 200);
  assert.equal((await f.call(`${f.path(teacher)}/archive`, { method: 'PUT', token: teacher.credential, body: { archived: false } })).data.classroom.enrollmentOpen, true);
});

test('legacy missing archive flags stay active, and archive/open/join races cannot reopen archived admission', async () => {
  const f = fixture(), teacher = await f.create();
  const legacy = await f.store.read(teacher.classroomId, 'room');
  delete legacy.archived; f.store.put(legacy);
  const manager = (await f.call('/api/admin/login', { method: 'POST', token: adminKey, body: {} })).data.session;
  assert.equal((await f.call('/api/admin/classrooms', { token: manager.credential })).data.classrooms[0].archived, false);
  assert.equal((await f.call('/api/admin/classrooms/archived', { token: manager.credential })).data.classrooms.length, 0);
  assert.equal((await f.store.read(teacher.classroomId, 'room')).archived, undefined);
  const [archived, opened, joined] = await Promise.all([
    f.call(`${f.path(teacher)}/archive`, { method: 'PUT', token: manager.credential, body: { archived: true } }),
    f.enrollment(teacher, true),
    f.call('/api/join', { method: 'POST', body: { code: teacher.classroomId, nickname: 'racing archive' } })
  ]);
  assert.equal(archived.status, 200); assert.ok([200, 409].includes(opened.status)); assert.ok([201, 423].includes(joined.status));
  const state = (await f.state(teacher)).data;
  assert.equal(state.classroom.archived, true); assert.equal(state.classroom.enrollmentOpen, false);
  assert.equal(state.participants.length, joined.status === 201 ? 1 : 0);
  assert.equal((await f.call('/api/classrooms/open')).data.classrooms.length, 0);
  assert.equal((await f.enrollment(teacher, true)).status, 409);
});
