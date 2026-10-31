import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test/utils.jsx';

describe('<App /> routing', () => {
  it('klik proyek membuka papan task (halaman lazy)', async () => {
    const { user } = renderApp();
    await user.click(await screen.findByRole('link', { name: 'Website Kampus' }));
    expect(await screen.findByRole('heading', { name: 'Website Kampus', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Tulis dokumentasi API')).toBeInTheDocument();
  });

  it('tautan kembali ke daftar proyek', async () => {
    const { user } = renderApp({ route: '/projects/p_web' });
    await user.click(await screen.findByRole('link', { name: '← Semua proyek' }));
    expect(await screen.findByRole('heading', { name: 'Proyek', level: 1 })).toBeInTheDocument();
  });

  it('route tidak dikenal -> 404', async () => {
    renderApp({ route: '/tidak/ada' });
    expect(await screen.findByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
  });

  it('pengguna di header terisi dari server dan bisa diganti', async () => {
    const { user, store } = renderApp();
    const select = await screen.findByLabelText('Masuk sebagai');
    await screen.findByRole('option', { name: 'Budi' });
    await user.selectOptions(select, 'u_citra');
    expect(store.getState().ui.currentUserId).toBe('u_citra');
  });
});
