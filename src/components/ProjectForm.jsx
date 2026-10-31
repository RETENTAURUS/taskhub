import { useState } from 'react';

export default function ProjectForm({ initial, users, onSubmit, onCancel, submitLabel = 'Simpan' }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [memberIds, setMemberIds] = useState(initial?.memberIds ?? users.map((u) => u.id));
  const [error, setError] = useState('');

  const toggle = (id) =>
    setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Nama proyek wajib diisi');
    if (trimmed.length > 60) return setError('Nama proyek maksimal 60 karakter');
    setError('');
    onSubmit({ name: trimmed, description: description.trim(), memberIds });
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <label>Nama proyek
        <input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(error)} autoFocus />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <label>Deskripsi
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <fieldset>
        <legend>Anggota</legend>
        {users.map((u) => (
          <label key={u.id} className="check">
            <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggle(u.id)} />
            {u.name}
          </label>
        ))}
      </fieldset>
      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn--primary">{submitLabel}</button>
      </div>
    </form>
  );
}
