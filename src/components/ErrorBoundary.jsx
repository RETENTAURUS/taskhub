import { Component } from 'react';

/** Menangkap error render (termasuk gagal memuat chunk lazy) agar aplikasi tidak blank. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="banner banner--error" role="alert">
        <strong>Terjadi kesalahan.</strong> Muat ulang halaman untuk mencoba lagi.
        <button type="button" className="btn btn--small" onClick={() => window.location.reload()}>Muat ulang</button>
      </div>
    );
  }
}
