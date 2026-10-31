import { ApiError } from './core.js';

/** Klien REST untuk server di folder /server. Antarmuka sama dengan localApi. */
export function createHttpApi(baseUrl, fetchImpl = (...a) => globalThis.fetch(...a)) {
  const root = baseUrl.replace(/\/+$/, '');

  async function request(method, path, { body, actorId } = {}) {
    let res;
    try {
      res = await fetchImpl(`${root}${path}`, {
        method,
        headers: {
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(actorId && { 'X-User-Id': actorId }),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'Tidak dapat terhubung ke server');
    }
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, payload?.error ?? `Permintaan gagal (${res.status})`);
    return payload;
  }

  return {
    listUsers: () => request('GET', '/api/users'),
    listProjects: () => request('GET', '/api/projects'),
    createProject: (body, actorId) => request('POST', '/api/projects', { body, actorId }),
    updateProject: (id, body, actorId) => request('PATCH', `/api/projects/${id}`, { body, actorId }),
    deleteProject: (id, actorId) => request('DELETE', `/api/projects/${id}`, { actorId }),
    listTasks: (projectId) => request('GET', `/api/projects/${projectId}/tasks`),
    createTask: (projectId, body, actorId) =>
      request('POST', `/api/projects/${projectId}/tasks`, { body, actorId }),
    updateTask: (id, body, actorId) => request('PATCH', `/api/tasks/${id}`, { body, actorId }),
    deleteTask: (id, actorId) => request('DELETE', `/api/tasks/${id}`, { actorId }),
    listActivity: (projectId) => request('GET', `/api/projects/${projectId}/activity`),
  };
}
