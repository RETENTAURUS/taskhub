import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ErrorBanner, Spinner } from '../components/Feedback.jsx';
import Modal from '../components/Modal.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import {
  addProject, clearProjectsError, editProject, fetchProjects, projectsSelectors, removeProject,
} from '../store/projectsSlice.js';
import { usersSelectors } from '../store/usersSlice.js';

export default function ProjectsPage() {
  const dispatch = useDispatch();
  const projects = useSelector(projectsSelectors.selectAll);
  const users = useSelector(usersSelectors.selectAll);
  const { status, error } = useSelector((s) => s.projects);
  const [dialog, setDialog] = useState(null); // null | { project? }

  useEffect(() => { dispatch(fetchProjects()); }, [dispatch]);
  const close = useCallback(() => setDialog(null), []);

  const save = async (values) => {
    const action = dialog.project
      ? editProject({ id: dialog.project.id, patch: values })
      : addProject(values);
    const result = await dispatch(action);
    if (!result.error) close();
  };

  const remove = (project) => {
    if (window.confirm(`Hapus proyek "${project.name}" beserta semua task-nya?`)) {
      dispatch(removeProject(project.id));
    }
  };

  return (
    <main className="page">
      <div className="page__head">
        <h1>Proyek</h1>
        <button type="button" className="btn btn--primary" onClick={() => setDialog({})}>+ Proyek baru</button>
      </div>

      <ErrorBanner
        message={error}
        onRetry={status === 'failed' ? () => dispatch(fetchProjects()) : undefined}
        onDismiss={() => dispatch(clearProjectsError())}
      />

      {status === 'loading' && projects.length === 0 && <Spinner label="Memuat proyek…" />}
      {status === 'succeeded' && projects.length === 0 && (
        <p className="muted empty">Belum ada proyek. Buat proyek pertamamu!</p>
      )}

      <div className="grid">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} users={users} onEdit={(project) => setDialog({ project })} onDelete={remove} />
        ))}
      </div>

      {dialog && (
        <Modal title={dialog.project ? 'Ubah proyek' : 'Proyek baru'} onClose={close}>
          <ProjectForm
            initial={dialog.project}
            users={users}
            onSubmit={save}
            onCancel={close}
            submitLabel={dialog.project ? 'Simpan' : 'Buat proyek'}
          />
        </Modal>
      )}
    </main>
  );
}
