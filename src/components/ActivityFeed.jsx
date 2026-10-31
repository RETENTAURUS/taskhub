import { useSelector } from 'react-redux';
import { formatDateTime } from '../utils.js';
import { Spinner } from './Feedback.jsx';

/** Dimuat secara lazy (code splitting) dari ProjectPage. */
export default function ActivityFeed() {
  const { items, status, error } = useSelector((s) => s.activity);

  return (
    <aside className="card activity" aria-label="Aktivitas terbaru">
      <h3>Aktivitas</h3>
      {status === 'loading' && items.length === 0 && <Spinner label="Memuat aktivitas…" />}
      {status === 'failed' && <p className="field-error" role="alert">{error}</p>}
      {status !== 'loading' && !error && items.length === 0 && <p className="muted small">Belum ada aktivitas.</p>}
      <ul>
        {items.map((a) => (
          <li key={a.id}>
            <strong>{a.userName}</strong> {a.text}
            <time className="muted small" dateTime={a.at}>{formatDateTime(a.at)}</time>
          </li>
        ))}
      </ul>
    </aside>
  );
}
