import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { participantView } from './curriculum.js';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const hash = value => createHash('sha256').update(value).digest('hex');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' &&
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const secret = () => randomBytes(32).toString('base64url');
const id = () => randomBytes(8).toString('hex');
const code = () => randomBytes(6).toString('hex').toUpperCase();
const validRoom = value => /^[A-F0-9]{12}$/.test(value);
const decodeRoom = entity => entity && { ...entity, gates: JSON.parse(entity.gates) };
const encodeRoom = room => ({ ...room, gates: JSON.stringify(room.gates) });
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function fields(value, allowed) {
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).some(key => !allowed.includes(key))) throw new ApiError(400, '요청 형식이 올바르지 않습니다.');
}

function text(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new ApiError(400, `${label}을(를) 1~${max}자로 입력하세요.`);
  }
  return value.trim();
}

export class ClassroomService {
  constructor(store, curriculum, adminKey) {
    if (typeof adminKey !== 'string' || adminKey.length < 8) throw new Error('LAB3_ADMIN_KEY must be at least 8 characters.');
    this.store = store; this.curriculum = curriculum; this.adminHash = hash(adminKey);
  }

  async adminLogin(token, body) {
    fields(body, []);
    if (!token || !equal(hash(token), this.adminHash)) throw new ApiError(403, '강사 비밀키가 올바르지 않습니다.');
    const sessionId = id(), credential = `a_${sessionId}.${secret()}`;
    const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
    await this.store.create({
      partitionKey: 'admin', rowKey: `session:${sessionId}`, tokenHash: hash(credential),
      expiresAt, keyVersion: this.adminHash
    });
    return { session: { role: 'admin', credential, expiresAt } };
  }

  async adminAuth(token) {
    if (!token) throw new ApiError(401, '강사 관리 로그인이 필요합니다.');
    const match = /^a_([a-f0-9]{16})\.[A-Za-z0-9_-]{43}$/.exec(token);
    if (!match) throw new ApiError(403, '강사 관리 세션이 필요합니다. 수업별 키나 수강생 키로는 관리 홈에 접근할 수 없습니다.');
    const session = await this.store.read('admin', `session:${match[1]}`);
    if (!session || session.expiresAt <= Date.now() || !equal(session.tokenHash, hash(token)) ||
        !equal(session.keyVersion, this.adminHash)) {
      throw new ApiError(401, '관리 세션이 만료되었거나 유효하지 않습니다. 비밀키로 다시 로그인하세요.');
    }
    return session;
  }

  async adminStatus(token) {
    const session = await this.adminAuth(token);
    return { role: 'admin', expiresAt: session.expiresAt };
  }

  async adminLogout(token, body) {
    fields(body, []);
    const session = await this.adminAuth(token);
    await this.store.remove(session);
    return { loggedOut: true };
  }

  async adminClassrooms(token) {
    await this.adminAuth(token);
    const rooms = await this.store.classrooms();
    return {
      classrooms: rooms.map(room => ({ id: room.partitionKey, title: room.title, createdAt: room.createdAt }))
        .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
    };
  }

  async adminCreate(token, body) {
    await this.adminAuth(token);
    const result = await this.createClassroom(body);
    return { classroom: result.classroom };
  }

  async room(roomId) {
    if (!validRoom(roomId)) throw new ApiError(404, '수업을 찾을 수 없습니다.');
    const room = decodeRoom(await this.store.read(roomId, 'room'));
    if (!room) throw new ApiError(404, '수업을 찾을 수 없습니다.');
    if (room.schemaVersion !== 1) throw new Error('Unsupported classroom schema.');
    return room;
  }

  async auth(room, token) {
    if (typeof token !== 'string') throw new ApiError(401, '입장 또는 복구 정보가 필요합니다.');
    if (token.startsWith('a_')) {
      await this.adminAuth(token);
      return { role: 'teacher' };
    }
    if (equal(hash(token), room.teacherHash)) return { role: 'teacher' };
    const match = /^s_([a-f0-9]{16})\.[A-Za-z0-9_-]{43}$/.exec(token);
    if (match) {
      const student = await this.store.read(room.partitionKey, `student:${match[1]}`);
      if (student && equal(hash(token), student.tokenHash)) return { role: 'student', student };
    }
    throw new ApiError(401, '이 수업의 입장 정보가 아닙니다. 복구 정보를 확인하세요.');
  }

  async create(token, body) {
    if (!token || !equal(hash(token), this.adminHash)) throw new ApiError(403, '강사 수업 생성 권한이 없습니다.');
    return this.createClassroom(body);
  }

  async createClassroom(body) {
    fields(body, ['title']);
    const title = text(body.title, 80, '수업 이름');
    const credential = `t_${secret()}`, roomId = code();
    const room = {
      partitionKey: roomId, rowKey: 'room', title, teacherHash: hash(credential), schemaVersion: 1,
      gates: JSON.stringify(Object.fromEntries(this.curriculum.map(portion => [portion.id, false]))),
      revision: 1, studentCount: 0, createdAt: Date.now()
    };
    await this.store.create(room);
    return {
      session: { classroomId: roomId, credential, role: 'teacher' },
      classroom: { id: roomId, title, createdAt: room.createdAt }
    };
  }

  async mutate(roomId, operation) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const room = await this.room(roomId);
      const result = await operation(room);
      if (!result) return;
      room.revision++;
      try {
        await this.store.commit(encodeRoom(room), result.student, result.createStudent);
        return result.value;
      } catch (error) {
        const conflict = error.statusCode === 409 || error.statusCode === 412 ||
          error.subResponses?.some(response => [409, 412].includes(response.status));
        if (!conflict) throw error;
        if (attempt === 7) throw new ApiError(503, '동시 변경이 많아 저장을 확인하지 못했습니다. 잠시 후 다시 시도하세요.');
        await delay(10 * (attempt + 1) + Math.random() * 30);
      }
    }
  }

  async join(body) {
    fields(body, ['code', 'nickname']);
    const roomId = String(body.code || '').trim().toUpperCase();
    const nickname = text(body.nickname, 24, '닉네임');
    const studentId = id(), credential = `s_${studentId}.${secret()}`;
    await this.mutate(roomId, room => {
      if (room.studentCount >= 200) throw new ApiError(409, '이 수업의 입장 인원이 200명에 도달했습니다.');
      room.studentCount++;
      const now = Date.now();
      return {
        createStudent: true,
        student: {
          partitionKey: roomId, rowKey: `student:${studentId}`, nickname, tokenHash: hash(credential),
          cursor: 0, activePortion: -1, createdAt: now, lastSeen: now
        }
      };
    });
    return { session: { classroomId: roomId, credential, role: 'student' } };
  }

  async snapshot(roomId, token) {
    const room = await this.room(roomId), actor = await this.auth(room, token);
    const classroom = {
      id: roomId, title: room.title, revision: room.revision,
      portions: this.curriculum.map(portion => ({
        id: portion.id, title: portion.title, open: room.gates[portion.id]
      }))
    };
    if (actor.role === 'teacher') {
      const students = await this.store.students(roomId);
      const participants = students.map(student => participantView(student, room, this.curriculum));
      classroom.portions.forEach(portion => {
        portion.completedCount = participants.filter(student => student.completedPortions.includes(portion.id)).length;
      });
      return { role: 'teacher', classroom, participants, serverTime: Date.now() };
    }
    await this.store.heartbeat(actor.student, Date.now());
    return { role: 'student', classroom, participant: participantView(actor.student, room, this.curriculum), serverTime: Date.now() };
  }

  async gate(roomId, token, portionId, body) {
    fields(body, ['open']);
    if (typeof body.open !== 'boolean') throw new ApiError(400, '개방 여부를 지정하세요.');
    await this.mutate(roomId, async room => {
      const actor = await this.auth(room, token);
      if (actor.role !== 'teacher') throw new ApiError(403, '강사만 구간을 열거나 닫을 수 있습니다.');
      if (!this.curriculum.some(portion => portion.id === portionId)) throw new ApiError(404, '구간을 찾을 수 없습니다.');
      if (room.gates[portionId] === body.open) return null;
      room.gates[portionId] = body.open;
      return {};
    });
    return this.snapshot(roomId, token);
  }

  async enter(roomId, token, body) {
    fields(body, ['portionId']);
    await this.mutate(roomId, async room => {
      const actor = await this.auth(room, token);
      if (actor.role !== 'student') throw new ApiError(403, '수강생 입장 정보가 필요합니다.');
      const index = this.curriculum.findIndex(portion => portion.id === body.portionId);
      if (index < 0) throw new ApiError(404, '구간을 찾을 수 없습니다.');
      const student = actor.student;
      if (index <= student.activePortion) return null;
      if (index !== student.activePortion + 1 || (index > 0 && student.cursor < this.curriculum[index - 1].end)) {
        throw new ApiError(409, '이전 구간을 먼저 완료하세요.');
      }
      if (!room.gates[body.portionId]) throw new ApiError(423, '강사가 아직 이 구간을 열지 않았습니다.');
      student.activePortion = index; student.lastSeen = Date.now();
      return { student };
    });
    return this.snapshot(roomId, token);
  }

  async progress(roomId, token, body) {
    fields(body, ['portionId', 'stepId', 'actionIndex']);
    await this.mutate(roomId, async room => {
      const actor = await this.auth(room, token);
      if (actor.role !== 'student') throw new ApiError(403, '수강생 입장 정보가 필요합니다.');
      const portionIndex = this.curriculum.findIndex(portion => portion.id === body.portionId);
      const portion = this.curriculum[portionIndex];
      const step = portion?.steps.find(step => step.id === body.stepId);
      if (!step || !Number.isInteger(body.actionIndex) || body.actionIndex < 0 || body.actionIndex >= step.count) {
        throw new ApiError(400, '활동 위치가 올바르지 않습니다.');
      }
      const student = actor.student, ordinal = step.start + body.actionIndex;
      if (portionIndex > student.activePortion) throw new ApiError(423, '아직 입장하지 않은 구간입니다.');
      if (ordinal < student.cursor) return null; // Retrying a lost response must not complete the next activity.
      if (ordinal !== student.cursor || portionIndex !== student.activePortion) {
        throw new ApiError(409, '현재 활동을 먼저 완료하세요.');
      }
      student.cursor++; student.lastSeen = Date.now();
      return { student };
    });
    return this.snapshot(roomId, token);
  }
}
