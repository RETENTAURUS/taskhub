import { useState } from 'react';
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '../constants.js';

const MAX_TITLE = 120;

export default function TaskForm({ initial, members, onSubmit, onCancel, submitLabel = 'Simpan' }) {
  const [values, setValues] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    status: initial?.status ?? 'todo',
    priority: initial?.priority ?? 'medium',
    assigneeId: initial?.assigneeId ?? '',
    dueDate: initial?.dueDate ?? '',
  });
  const [error, setError] = useState('');

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const title = values.title.trim();
    if (!title) return setError('Judul task wajib diisi');
    if (title.length > MAX_TITLE) return setError(`Judul maksimal ${MAX_TITLE} karakter`);
    setError('');
    onSubmit({
      ...values,
      title,
      description: values.description.trim(),
      assigneeId: values.assigneeId || null,
      dueDate: values.dueDate || null,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <label>Judul
        <input value={values.title} onChange={set('title')} aria-invalid={Boolean(error)} autoFocus />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <label>Deskripsi
        <textarea rows={3} value={values.description} onChange={set('description')} />
      </label>
      <div className="grid-2">
        <label>Status
          <select value={values.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label>Prioritas
          <select value={values.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </label>
        <label>Penanggung jawab
          <select value={values.assigneeId} onChange={set('assigneeId')}>
            <option value="">Belum ditugaskan</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label>Tenggat
          <input type="date" value={values.dueDate} onChange={set('dueDate')} />
        </label>
      </div>
      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn--primary">{submitLabel}</button>
      </div>
    </form>
  );
}
