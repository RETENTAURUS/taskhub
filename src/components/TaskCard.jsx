import { memo } from 'react';
import { PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '../constants.js';
import { formatDate, isOverdue } from '../utils.js';

/**
 * React.memo mencegah kartu dirender ulang bila propsnya tidak berubah
 * (penting pada papan dengan banyak task). Karena itu callback dari
 * parent harus stabil (useCallback).
 */
function TaskCard({ task, assignee, onStatusChange, onEdit, onDelete }) {
  const overdue = isOverdue(task);

  return (
    <article
      className={`card task task--${task.priority}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <header className="task__head">
        <h4>{task.title}</h4>
        <span className={`badge badge--${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
      </header>
      {task.description && <p className="muted small">{task.description}</p>}
      <p className="small task__meta">
        <span>{assignee ? `👤 ${assignee.name}` : 'Belum ditugaskan'}</span>
        {task.dueDate && (
          <span className={overdue ? 'overdue' : ''}>
            📅 {formatDate(task.dueDate)}{overdue ? ' (terlambat)' : ''}
          </span>
        )}
      </p>
      <div className="task__actions">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task, e.target.value)}
          aria-label={`Ubah status ${task.title}`}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button type="button" className="btn btn--small" onClick={() => onEdit(task)} aria-label={`Ubah ${task.title}`}>Ubah</button>
        <button type="button" className="btn btn--small btn--danger" onClick={() => onDelete(task)} aria-label={`Hapus ${task.title}`}>Hapus</button>
      </div>
    </article>
  );
}

export default memo(TaskCard);
