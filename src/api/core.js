/**
 * Inti logika "backend" TaskHub.
 *
 * Modul ini TIDAK bergantung pada browser maupun Node, sehingga dipakai oleh:
 *   - src/api/localApi.js  -> API tiruan di browser (localStorage), untuk deploy statis
 *   - server/index.js      -> REST API sungguhan di Node (data bersama banyak pengguna)
 * Satu sumber logika berarti perilaku validasi & aktivitas selalu sama.
 */

export const STATUSES = ['todo', 'in_progress', 'done'];
export const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
export const PRIORITIES = ['low', 'medium', 'high'];
export const PRIORITY_LABEL = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };

export const SEED_USERS = [
  { id: 'u_ayu', name: 'Ayu' },
  { id: 'u_budi', name: 'Budi' },
  { id: 'u_citra', name: 'Citra' },
  { id: 'u_dewi', name: 'Dewi' },
];

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function emptyDb() {
  return { users: clone(SEED_USERS), projects: [], tasks: [], activity: [] };
}

/** Data contoh agar aplikasi tidak kosong saat pertama dibuka. */
export function seedDb(now = new Date().toISOString()) {
  const db = emptyDb();
  const all = SEED_USERS.map((u) => u.id);
  db.projects.push(
    { id: 'p_web', name: 'Website Kampus', description: 'Redesign portal mahasiswa.',
      memberIds: all, createdAt: now, updatedAt: now },
    { id: 'p_skripsi', name: 'Persiapan Skripsi', description: 'Riset, bimbingan, dan penulisan.',
      memberIds: ['u_ayu', 'u_citra'], createdAt: now, updatedAt: now },
  );
  const t = (id, projectId, title, status, priority, assigneeId, dueDate) => ({
    id, projectId, title, description: '', status, priority, assigneeId, dueDate,
    createdAt: now, updatedAt: now,
  });
  db.tasks.push(
    t('t_1', 'p_web', 'Rancang wireframe halaman utama', 'done', 'high', 'u_citra', null),
    t('t_2', 'p_web', 'Implementasi navigasi responsif', 'in_progress', 'medium', 'u_budi', null),
    t('t_3', 'p_web', 'Tulis dokumentasi API', 'todo', 'low', 'u_dewi', null),
    t('t_4', 'p_skripsi', 'Cari 10 jurnal referensi', 'todo', 'high', 'u_ayu', null),
  );
  return db;
}

// ------------------------------------------------------------------ validasi

const isDate = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

const text = (value, field, { min = 0, max }) => {
  if (typeof value !== 'string') throw new ApiError(422, `${field} harus berupa teks`);
  const v = value.trim();
  if (v.length < min) throw new ApiError(422, `${field} wajib diisi`);
  if (v.length > max) throw new ApiError(422, `${field} maksimal ${max} karakter`);
  return v;
};

export function cleanProjectInput(input = {}, { partial = false } = {}) {
  const out = {};
  if (!partial || input.name !== undefined) out.name = text(input.name, 'Nama proyek', { min: 1, max: 60 });
  if (input.description !== undefined) out.description = text(input.description, 'Deskripsi', { max: 300 });
  if (input.memberIds !== undefined) {
    if (!Array.isArray(input.memberIds)) throw new ApiError(422, 'memberIds harus berupa array');
    out.memberIds = [...new Set(input.memberIds)];
  }
  return out;
}

export function cleanTaskInput(input = {}, { partial = false } = {}) {
  const out = {};
  if (!partial || input.title !== undefined) out.title = text(input.title, 'Judul task', { min: 1, max: 120 });
  if (input.description !== undefined) out.description = text(input.description, 'Deskripsi', { max: 500 });
  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) throw new ApiError(422, 'Status tidak valid');
    out.status = input.status;
  }
  if (input.priority !== undefined) {
    if (!PRIORITIES.includes(input.priority)) throw new ApiError(422, 'Prioritas tidak valid');
    out.priority = input.priority;
  }
  if (input.assigneeId !== undefined) out.assigneeId = input.assigneeId || null;
  if (input.dueDate !== undefined) {
    if (input.dueDate && !isDate(input.dueDate)) throw new ApiError(422, 'Tanggal harus berformat YYYY-MM-DD');
    out.dueDate = input.dueDate || null;
  }
  return out;
}

// ------------------------------------------------------------------- service

/**
 * @param adapter { load(): db | Promise<db>, save(db): void | Promise<void> }
 */
export function createService(adapter, { now = () => new Date().toISOString() } = {}) {
  const read = async () => clone(await adapter.load());
  const write = async (db) => { await adapter.save(db); };

  const actor = (db, actorId) => {
    const user = db.users.find((u) => u.id === actorId);
    if (!user) throw new ApiError(401, 'Pengguna tidak dikenal');
    return user;
  };
  const findProject = (db, id) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) throw new ApiError(404, 'Proyek tidak ditemukan');
    return p;
  };
  const findTask = (db, id) => {
    const t = db.tasks.find((x) => x.id === id);
    if (!t) throw new ApiError(404, 'Task tidak ditemukan');
    return t;
  };
  const checkMembers = (db, ids) => {
    for (const id of ids) if (!db.users.some((u) => u.id === id)) throw new ApiError(422, `Anggota tidak dikenal: ${id}`);
  };
  const checkAssignee = (db, project, assigneeId) => {
    if (assigneeId && !project.memberIds.includes(assigneeId)) {
      throw new ApiError(422, 'Penanggung jawab harus anggota proyek');
    }
  };
  const log = (db, projectId, user, message) =>
    db.activity.push({ id: uid('a'), projectId, userId: user.id, userName: user.name, text: message, at: now() });

  const withStats = (db, p) => {
    const mine = db.tasks.filter((t) => t.projectId === p.id);
    return { ...p, stats: { total: mine.length, done: mine.filter((t) => t.status === 'done').length } };
  };

  return {
    async listUsers() {
      return (await read()).users;
    },

    async listProjects() {
      const db = await read();
      return db.projects
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name))
        .map((p) => withStats(db, p));
    },

    async createProject(input, actorId) {
      const db = await read();
      const user = actor(db, actorId);
      const data = cleanProjectInput(input);
      const memberIds = data.memberIds ?? [user.id];
      checkMembers(db, memberIds);
      const stamp = now();
      const project = {
        id: uid('p'), name: data.name, description: data.description ?? '',
        memberIds: memberIds.includes(user.id) ? memberIds : [user.id, ...memberIds],
        createdAt: stamp, updatedAt: stamp,
      };
      db.projects.push(project);
      log(db, project.id, user, `membuat proyek "${project.name}"`);
      await write(db);
      return withStats(db, project);
    },

    async updateProject(id, patch, actorId) {
      const db = await read();
      const user = actor(db, actorId);
      const project = findProject(db, id);
      const data = cleanProjectInput(patch, { partial: true });
      if (data.memberIds) {
        checkMembers(db, data.memberIds);
        const dropped = db.tasks.some((t) => t.projectId === id && t.assigneeId && !data.memberIds.includes(t.assigneeId));
        if (dropped) throw new ApiError(422, 'Masih ada task yang ditugaskan ke anggota yang dihapus');
      }
      Object.assign(project, data, { updatedAt: now() });
      log(db, id, user, `memperbarui proyek "${project.name}"`);
      await write(db);
      return withStats(db, project);
    },

    async deleteProject(id, actorId) {
      const db = await read();
      actor(db, actorId);
      findProject(db, id);
      db.projects = db.projects.filter((p) => p.id !== id);
      db.tasks = db.tasks.filter((t) => t.projectId !== id);      // cascade
      db.activity = db.activity.filter((a) => a.projectId !== id);
      await write(db);
      return { id };
    },

    async listTasks(projectId) {
      const db = await read();
      findProject(db, projectId);
      return db.tasks.filter((t) => t.projectId === projectId);
    },

    async createTask(projectId, input, actorId) {
      const db = await read();
      const user = actor(db, actorId);
      const project = findProject(db, projectId);
      const data = cleanTaskInput(input);
      checkAssignee(db, project, data.assigneeId);
      const stamp = now();
      const task = {
        id: uid('t'), projectId, title: data.title, description: data.description ?? '',
        status: data.status ?? 'todo', priority: data.priority ?? 'medium',
        assigneeId: data.assigneeId ?? null, dueDate: data.dueDate ?? null,
        createdAt: stamp, updatedAt: stamp,
      };
      db.tasks.push(task);
      log(db, projectId, user, `menambahkan task "${task.title}"`);
      await write(db);
      return task;
    },

    async updateTask(id, patch, actorId) {
      const db = await read();
      const user = actor(db, actorId);
      const task = findTask(db, id);
      const project = findProject(db, task.projectId);
      const data = cleanTaskInput(patch, { partial: true });
      if (data.assigneeId !== undefined) checkAssignee(db, project, data.assigneeId);
      const before = task.status;
      Object.assign(task, data, { updatedAt: now() });
      log(
        db, task.projectId, user,
        data.status && data.status !== before
          ? `memindahkan "${task.title}" dari ${STATUS_LABEL[before]} ke ${STATUS_LABEL[task.status]}`
          : `memperbarui task "${task.title}"`,
      );
      await write(db);
      return task;
    },

    async deleteTask(id, actorId) {
      const db = await read();
      const user = actor(db, actorId);
      const task = findTask(db, id);
      db.tasks = db.tasks.filter((t) => t.id !== id);
      log(db, task.projectId, user, `menghapus task "${task.title}"`);
      await write(db);
      return { id };
    },

    async listActivity(projectId, limit = 30) {
      const db = await read();
      findProject(db, projectId);
      return db.activity
        .filter((a) => a.projectId === projectId)
        .slice()
        .reverse()           // terbaru di atas
        .slice(0, limit);
    },
  };
}
