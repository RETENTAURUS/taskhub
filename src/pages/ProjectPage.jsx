import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { ErrorBanner, Spinner } from '../components/Feedback.jsx';
import Modal from '../components/Modal.jsx';
import TaskColumn from '../components/TaskColumn.jsx';
import TaskFilters from '../components/TaskFilters.jsx';
import TaskForm from '../components/TaskForm.jsx';
import { STATUSES } from '../constants.js';
import { fetchActivity } from '../store/activitySlice.js';
import { fetchProjects, projectsSelectors } from '../store/projectsSlice.js';
import { selectTaskCounts, selectVisibleByStatus } from '../store/selectors.js';
import {
  addTask, clearTasksError, editTask, fetchTasks, removeTask, tasksSelectors,
} from '../store/tasksSlice.js';
import { usersSelectors } from '../store/usersSlice.js';

// Advanced topic: komponen berat/sekunder dimuat hanya saat dibutuhkan.
const ActivityFeed = lazy(() => import('../components/ActivityFeed.jsx'));

export default function ProjectPage() {
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const store = useStore();

  const project = useSelector((s) => projectsSelectors.selectById(s, projectId));
  const projectsStatus = useSelector((s) => s.projects.status);
  const users = useSelector(usersSelectors.selectAll);
  const byStatus = useSelector(selectVisibleByStatus);
  const counts = useSelector(selectTaskCounts);
  const { status, error } = useSelector((s) => s.tasks);
  const [dialog, setDialog] = useState(null); // null | { task? }

  useEffect(() => {
    dispatch(fetchTasks(projectId));
    dispatch(fetchActivity(projectId));
    if (projectsStatus === 'idle') dispatch(fetchProjects());
    // sengaja hanya bergantung pada projectId: status proyek tidak boleh memicu fetch ulang
  }, [dispatch, projectId]);

  const members = useMemo(
    () => users.filter((u) => project?.memberIds.includes(u.id)),
    [users, project],
  );
  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  // Callback stabil supaya React.memo pada TaskCard efektif.
  const close = useCallback(() => setDialog(null), []);
  const onStatusChange = useCallback((task, status) => {
    if (status !== task.status) dispatch(editTask({ id: task.id, patch: { status } }));
  }, [dispatch]);
  const onMove = useCallback((id, status) => {
    const task = tasksSelectors.selectById(store.getState(), id);
    if (task && task.status !== status) dispatch(editTask({ id, patch: { status } }));
  }, [dispatch, store]);
  const onEdit = useCallback((task) => setDialog({ task }), []);
  const onDelete = useCallback((task) => {
    if (window.confirm(`Hapus task "${task.title}"?`)) dispatch(removeTask(task.id));
  }, [dispatch]);

  const save = async (values) => {
    const action = dialog.task
      ? editTask({ id: dialog.task.id, patch: values })
      : addTask({ projectId, input: values });
    const result = await dispatch(action);
    if (!result.error) close();
  };

  if (projectsStatus === 'succeeded' && !project) {
    return (
      <main className="page">
        <p role="alert">Proyek tidak ditemukan.</p>
        <Link to="/">← Kembali ke daftar proyek</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <Link to="/" className="back">← Semua proyek</Link>
      <div className="page__head">
        <div>
          <h1>{project?.name ?? 'Memuat…'}</h1>
          {project?.description && <p className="muted">{project.description}</p>}
          <p className="muted small">{counts.done} dari {counts.total} task selesai</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setDialog({})} disabled={!project}>
          + Task baru
        </button>
      </div>

      <TaskFilters members={members} />

      <ErrorBanner
        message={error}
        onRetry={status === 'failed' ? () => dispatch(fetchTasks(projectId)) : undefined}
        onDismiss={() => dispatch(clearTasksError())}
      />

      {status === 'loading' && counts.total === 0 ? (
        <Spinner label="Memuat task…" />
      ) : (
        <div className="layout">
          <div className="board">
            {STATUSES.map((s) => (
              <TaskColumn
                key={s}
                status={s}
                tasks={byStatus[s]}
                usersById={usersById}
                onMove={onMove}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
          <Suspense fallback={<Spinner label="Memuat aktivitas…" />}>
            <ActivityFeed />
          </Suspense>
        </div>
      )}

      {dialog && (
        <Modal title={dialog.task ? 'Ubah task' : 'Task baru'} onClose={close}>
          <TaskForm
            initial={dialog.task}
            members={members}
            onSubmit={save}
            onCancel={close}
            submitLabel={dialog.task ? 'Simpan' : 'Tambah task'}
          />
        </Modal>
      )}
    </main>
  );
}
