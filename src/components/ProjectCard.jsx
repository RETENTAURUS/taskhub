import { Link } from 'react-router-dom';
import { initials } from '../utils.js';

export default function ProjectCard({ project, users, onEdit, onDelete }) {
  const { total, done } = project.stats ?? { total: 0, done: 0 };
  const members = users.filter((u) => project.memberIds.includes(u.id));

  return (
    <article className="card project-card">
      <h3><Link to={`/projects/${project.id}`}>{project.name}</Link></h3>
      {project.description && <p className="muted">{project.description}</p>}
      <progress value={done} max={Math.max(total, 1)} aria-label={`Progres ${project.name}`} />
      <p className="muted small">{done} dari {total} task selesai</p>
      <div className="project-card__footer">
        <span className="avatars" aria-label={`Anggota: ${members.map((m) => m.name).join(', ')}`}>
          {members.map((m) => <span key={m.id} className="avatar" title={m.name}>{initials(m.name)}</span>)}
        </span>
        <span className="row">
          <button type="button" className="btn btn--small" onClick={() => onEdit(project)} aria-label={`Ubah proyek ${project.name}`}>Ubah</button>
          <button type="button" className="btn btn--small btn--danger" onClick={() => onDelete(project)} aria-label={`Hapus proyek ${project.name}`}>Hapus</button>
        </span>
      </div>
    </article>
  );
}
