import { app } from '@azure/functions';
import { configuredStore } from './table-store.js';
import { ClassroomService } from './service.js';
import { curriculum } from './curriculum.js';
import { createApi } from './api.js';

const service = new ClassroomService(configuredStore(), curriculum, process.env.LAB3_ADMIN_KEY);
const api = createApi(service, process.env.LAB3_ALLOWED_ORIGINS || '');

app.http('classroom', {
  route: '{*path}', methods: ['GET', 'POST', 'PUT', 'OPTIONS'], authLevel: 'anonymous',
  handler: async request => api({
    method: request.method, path: new URL(request.url).pathname,
    headers: Object.fromEntries(request.headers), body: await request.text()
  })
});
