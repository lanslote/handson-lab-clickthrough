import { randomUUID } from 'node:crypto';
import { ApiError } from './service.js';

export function createApi(service, allowedOrigins) {
  const origins = allowedOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => {
    try { return new URL(origin).origin !== origin || origin === 'null'; }
    catch { return true; }
  })) throw new Error('LAB3_ALLOWED_ORIGINS must contain exact origins, without paths or wildcards.');

  return async ({ method, path, headers, body = '' }) => {
    const requestId = randomUUID(), origin = headers.origin;
    const responseHeaders = {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'X-Request-Id': requestId, Vary: 'Origin'
    };
    const response = (status, data) => ({ status, headers: responseHeaders, body: JSON.stringify(data) });
    try {
      if (origin && !origins.includes(origin)) throw new ApiError(403, '허용되지 않은 프런트엔드 주소입니다.');
      if (origin) responseHeaders['Access-Control-Allow-Origin'] = origin;
      if (method === 'OPTIONS') {
        responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS';
        responseHeaders['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
        return { status: 204, headers: responseHeaders, body: '' };
      }
      if (Buffer.byteLength(body) > 4096) throw new ApiError(413, '요청이 너무 큽니다.');
      let payload = {};
      if (body) {
        if (!headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'JSON 요청이 필요합니다.');
        try { payload = JSON.parse(body); }
        catch { throw new ApiError(400, 'JSON 요청을 읽을 수 없습니다.'); }
      }
      const token = /^Bearer ([^\s]+)$/.exec(headers.authorization || '')?.[1];
      if (method === 'GET' && path === '/api/health') {
        await service.store.read('health', 'room');
        return response(200, { ok: true, curriculumVersion: 1 });
      }
      if (method === 'GET' && path === '/api/classrooms/open') return response(200, await service.openClassrooms());
      if (method === 'POST' && path === '/api/admin/login') return response(201, await service.adminLogin(token, payload));
      if (method === 'GET' && path === '/api/admin/session') return response(200, await service.adminStatus(token));
      if (method === 'POST' && path === '/api/admin/logout') return response(200, await service.adminLogout(token, payload));
      if (method === 'GET' && path === '/api/admin/classrooms') return response(200, await service.adminClassrooms(token));
      if (method === 'GET' && path === '/api/admin/classrooms/archived') return response(200, await service.adminClassrooms(token, true));
      if (method === 'POST' && path === '/api/admin/classrooms') return response(201, await service.adminCreate(token, payload));
      if (method === 'POST' && path === '/api/classrooms') return response(201, await service.create(token, payload));
      if (method === 'POST' && path === '/api/join') return response(201, await service.join(payload));
      const match = /^\/api\/classrooms\/([A-F0-9]{12})(?:\/(enter|progress|reset|enrollment|archive)|\/gates\/(3-[1-6]))?$/.exec(path);
      if (match) {
        const [, roomId, action, portionId] = match;
        if (method === 'GET' && !action && !portionId) return response(200, await service.snapshot(roomId, token));
        if (method === 'PUT' && portionId) return response(200, await service.gate(roomId, token, portionId, payload));
        if (method === 'POST' && action === 'enter') return response(200, await service.enter(roomId, token, payload));
        if (method === 'POST' && action === 'progress') return response(200, await service.progress(roomId, token, payload));
        if (method === 'POST' && action === 'reset') return response(200, await service.reset(roomId, token, payload));
        if (method === 'PUT' && action === 'enrollment') return response(200, await service.enrollment(roomId, token, payload));
        if (method === 'PUT' && action === 'archive') return response(200, await service.archive(roomId, token, payload));
      }
      throw new ApiError(404, 'API 경로를 찾을 수 없습니다.');
    } catch (error) {
      if (error instanceof ApiError) return response(error.status, { error: error.message, requestId });
      console.error(JSON.stringify({
        event: 'lab3_api_error', requestId, name: error.name, code: error.code, status: error.statusCode
      }));
      return response(503, { error: '서버 저장소에 연결할 수 없습니다. 잠시 후 다시 시도하세요.', requestId });
    }
  };
}
