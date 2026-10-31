import { STATUS_LABEL } from '../constants.js';
import TaskCard from './TaskCard.jsx';

export default function TaskColumn({ status, tasks, usersById, onMove, onStatusChange, onEdit, onDelete }) {
  return (
    <section
      className="column"
      aria-label={`Kolom ${STATUS_LABEL[status]}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) onMove(id, status);
      }}
    >
      <h3>{STATUS_LABEL[status]} <span className="count">{tasks.length}</span></h3>
      {tasks.length === 0 && <p className="muted small empty">Tidak ada task</p>}
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          assignee={usersById[t.assigneeId]}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}
