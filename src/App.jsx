import { lazy, Suspense, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { Spinner } from './components/Feedback.jsx';
import Header from './components/Header.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import { fetchUsers } from './store/usersSlice.js';

// Code splitting: halaman papan task baru diunduh saat pertama kali dibuka.
const ProjectPage = lazy(() => import('./pages/ProjectPage.jsx'));

function NotFound() {
  return (
    <main className="page">
      <h1>Halaman tidak ditemukan</h1>
      <Link to="/">← Kembali ke daftar proyek</Link>
    </main>
  );
}

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);

  return (
    <>
      <Header />
      <ErrorBoundary>
        <Suspense fallback={<main className="page"><Spinner /></main>}>
          <Routes>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
