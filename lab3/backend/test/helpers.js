import { createRequire } from 'node:module';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';
import { randomBytes } from 'node:crypto';
import { TableStore } from '../src/table-store.js';
import { ClassroomService } from '../src/service.js';
import { curriculum } from '../src/curriculum.js';
import { createApi } from '../src/api.js';
import { apiServer } from '../src/local.js';

export const adminKey = randomBytes(32).toString('base64url');
const clone = value => value && structuredClone(value);
const conflict = () => Object.assign(new Error('ETag mismatch'), { statusCode: 412 });

export class MemoryStore {
  rows = new Map();
  key(room, row) { return `${room}/${row}`; }
  async read(room, row) { return clone(this.rows.get(this.key(room, row))) || null; }
  async students(room) { return [...this.rows.values()].filter(row => row.partitionKey === room && row.rowKey.startsWith('student:')).map(clone); }
  put(row) {
    const key = this.key(row.partitionKey, row.rowKey);
    this.rows.set(key, { ...clone(row), etag: String(Number(this.rows.get(key)?.etag || 0) + 1) });
  }
  async create(room) {
    if (this.rows.has(this.key(room.partitionKey, room.rowKey))) throw conflict();
    this.put(room);
  }
  async remove(entity) {
    const key = this.key(entity.partitionKey, entity.rowKey);
    if (this.rows.get(key)?.etag !== entity.etag) throw conflict();
    this.rows.delete(key);
  }
  async classrooms(openOnly = false) { return [...this.rows.values()].filter(row =>
    row.rowKey === 'room' && (!openOnly || row.enrollmentOpen === true)).map(clone); }
  async commit(room, student, createStudent) {
    if (this.rows.get(this.key(room.partitionKey, room.rowKey))?.etag !== room.etag) throw conflict();
    if (student) {
      const current = this.rows.get(this.key(student.partitionKey, student.rowKey));
      if (createStudent ? !!current : current?.etag !== student.etag) throw conflict();
    }
    this.put(room); if (student) this.put(student);
  }
  async heartbeat(student, now) {
    const stored = this.rows.get(this.key(student.partitionKey, student.rowKey));
    if (stored?.etag === student.etag) this.put({ ...student, lastSeen: now });
  }
}

export function fixture(store = new MemoryStore(), origin = 'http://127.0.0.1:8080', password = adminKey) {
  const service = new ClassroomService(store, curriculum, password);
  const api = createApi(service, origin);
  async function call(path, { method = 'GET', token, body, origin: requestOrigin = origin } = {}) {
    const result = await api({
      method, path, headers: {
        origin: requestOrigin, ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {})
      }, body: body ? JSON.stringify(body) : ''
    });
    return { status: result.status, headers: result.headers, data: result.body ? JSON.parse(result.body) : null };
  }
  const create = async () => (await call('/api/classrooms', { method: 'POST', token: password, body: { title: '함께하는 실습' } })).data.session;
  const joinStudent = async room => {
    await service.enrollment(room.classroomId, room.credential, { open: true });
    return (await call('/api/join', { method: 'POST', body: { code: room.classroomId, nickname: '수강생' } })).data.session;
  };
  const path = session => `/api/classrooms/${session.classroomId}`;
  const gate = (teacher, portionId, open) => call(`${path(teacher)}/gates/${portionId}`, { method: 'PUT', token: teacher.credential, body: { open } });
  const enrollment = (teacher, open) => call(`${path(teacher)}/enrollment`, { method: 'PUT', token: teacher.credential, body: { open } });
  const enter = (student, portionId) => call(`${path(student)}/enter`, { method: 'POST', token: student.credential, body: { portionId } });
  const progress = (student, portionId, stepId, actionIndex) => call(`${path(student)}/progress`, {
    method: 'POST', token: student.credential, body: { portionId, stepId, actionIndex }
  });
  const state = session => call(path(session), { token: session.credential });
  const complete = async (student, portionId) => {
    for (const step of curriculum.find(portion => portion.id === portionId).steps) {
      for (let action = 0; action < step.count; action++) {
        const result = await progress(student, portionId, step.id, action);
        if (result.status !== 200) throw new Error(JSON.stringify(result));
      }
    }
  };
  return { store, service, api, call, create, joinStudent, path, gate, enrollment, enter, progress, state, complete };
}

export async function azurite() {
  const require = createRequire(import.meta.url);
  const TableServer = require('azurite/dist/src/table/TableServer.js').default;
  const TableConfiguration = require('azurite/dist/src/table/TableConfiguration.js').default;
  const { EMULATOR_ACCOUNT_NAME, EMULATOR_ACCOUNT_KEY } = require('azurite/dist/src/common/utils/constants.js');
  const directory = await mkdtemp(join(tmpdir(), 'lab3-table-test-'));
  const config = new TableConfiguration('127.0.0.1', 0, undefined, join(directory, 'tables.json'), false, false);
  config.skipApiVersionCheck = true;
  let server = new TableServer(config);
  await server.start();
  const tableName = 'Lab3Test';
  const clientFor = () => new TableClient(`${server.getHttpServerAddress()}/${EMULATOR_ACCOUNT_NAME}`, tableName,
    new AzureNamedKeyCredential(EMULATOR_ACCOUNT_NAME, EMULATOR_ACCOUNT_KEY.toString('base64')), {
      allowInsecureConnection: true, retryOptions: { maxRetries: 0 }
    });
  let client = clientFor();
  await client.createTable();
  return {
    get store() { return new TableStore(client); },
    async restart() {
      await server.close(); server = new TableServer(config); await server.start(); client = clientFor();
    },
    async close() { await server.close(); await rm(directory, { recursive: true }); }
  };
}

export async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

export async function browserServers(store, password = adminKey) {
  const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
  let apiOrigin;
  const staticServer = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/lab3/config.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript' });
      response.end(`window.LAB3_CONFIG={apiBase:${JSON.stringify(apiOrigin)}};`); return;
    }
    const file = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    try {
      const body = await readFile(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp4': 'video/mp4' };
      response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); response.end(body);
    } catch (error) {
      if (error.code !== 'ENOENT') console.error(error);
      response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end();
    }
  });
  const origin = await listen(staticServer), f = fixture(store, origin, password), server = apiServer(f.api);
  apiOrigin = await listen(server);
  return {
    ...f, origin, apiOrigin,
    async close() {
      server.closeAllConnections(); staticServer.closeAllConnections();
      await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => staticServer.close(resolve))]);
    }
  };
}
