import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary.jsx';

function Bomb() {
  throw new Error('meledak');
}

afterEach(() => vi.restoreAllMocks());

describe('<ErrorBoundary />', () => {
  it('menampilkan anak bila tidak ada error', () => {
    render(<ErrorBoundary><p>aman</p></ErrorBoundary>);
    expect(screen.getByText('aman')).toBeInTheDocument();
  });

  it('menangkap error render dan menampilkan pesan, bukan layar kosong', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Terjadi kesalahan');
    expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
  });
});
