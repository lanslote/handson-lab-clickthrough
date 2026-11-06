import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { configuredStore } from './table-store.js';
import { ClassroomService } from './service.js';
import { curriculum } from './curriculum.js';
import { createApi } from './api.js';

export function apiServer(api) {
  return createServer(async (request, response) => {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 4096) {
        response.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: '요청이 너무 큽니다.' }));
        return;
      }
      chunks.push(chunk);
    }
    const result = await api({
      method: request.method, path: new URL(request.url, 'http://localhost').pathname,
      headers: request.headers, body: Buffer.concat(chunks).toString('utf8')
    });
    response.writeHead(result.status, result.headers); response.end(result.body);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const service = new ClassroomService(configuredStore(), curriculum, process.env.LAB3_ADMIN_KEY);
  const server = apiServer(createApi(service, process.env.LAB3_ALLOWED_ORIGINS || ''));
  server.requestTimeout = 15000;
  server.listen(Number(process.env.PORT || 7071), '127.0.0.1', () => console.log('Lab 3 API: http://127.0.0.1:7071/api'));
}
