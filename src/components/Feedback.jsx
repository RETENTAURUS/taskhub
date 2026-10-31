export function Spinner({ label = 'Memuat…' }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__dot" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div className="banner banner--error" role="alert">
      <span>{message}</span>
      <span className="banner__actions">
        {onRetry && <button type="button" className="btn btn--small" onClick={onRetry}>Coba lagi</button>}
        {onDismiss && <button type="button" className="btn btn--small btn--ghost" onClick={onDismiss}>Tutup</button>}
      </span>
    </div>
  );
}
