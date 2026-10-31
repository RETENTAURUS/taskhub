/** Tanggal lokal hari ini dalam format YYYY-MM-DD. */
export function todayString(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Task terlambat bila punya tenggat yang sudah lewat dan belum Done. */
export function isOverdue(task, today = todayString()) {
  return Boolean(task.dueDate) && task.status !== 'done' && task.dueDate < today;
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const initials = (name = '') => name.trim().slice(0, 1).toUpperCase();
