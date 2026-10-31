import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/core.js';
import { makeApi, renderApp } from '../test/utils.jsx';

afterEach(() => vi.restoreAllMocks());

describe('Halaman daftar proyek', () => {
  it('menampilkan loading lalu daftar proyek beserta progresnya', async () => {
    renderApp();
    expect(screen.getByText('Memuat proyek…')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Website Kampus' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Persiapan Skripsi' })).toBeInTheDocument();
    expect(screen.getByText('1 dari 3 task selesai')).toBeInTheDocument();
  });

  it('membuat proyek baru lewat dialog', async () => {
    const { user } = renderApp();
    await screen.findByRole('link', { name: 'Website Kampus' });
    await user.click(screen.getByRole('button', { name: '+ Proyek baru' }));
    const dialog = screen.getByRole('dialog', { name: 'Proyek baru' });
    await user.type(within(dialog).getByLabelText('Nama proyek'), 'Lomba Hackathon');
    await user.click(within(dialog).getByRole('button', { name: 'Buat proyek' }));
    expect(await screen.findByRole('link', { name: 'Lomba Hackathon' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('validasi form: nama kosong tidak menutup dialog', async () => {
    const { user } = renderApp();
    await screen.findByRole('link', { name: 'Website Kampus' });
    await user.click(screen.getByRole('button', { name: '+ Proyek baru' }));
    await user.click(screen.getByRole('button', { name: 'Buat proyek' }));
    expect(screen.getByRole('alert')).toHaveTextContent('wajib diisi');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Escape menutup dialog', async () => {
    const { user } = renderApp();
    await screen.findByRole('link', { name: 'Website Kampus' });
    await user.click(screen.getByRole('button', { name: '+ Proyek baru' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mengubah nama proyek', async () => {
    const { user } = renderApp();
    await screen.findByRole('link', { name: 'Website Kampus' });
    await user.click(screen.getByRole('button', { name: 'Ubah proyek Website Kampus' }));
    const input = screen.getByLabelText('Nama proyek');
    await user.clear(input);
    await user.type(input, 'Portal Kampus');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByRole('link', { name: 'Portal Kampus' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website Kampus' })).not.toBeInTheDocument();
  });

  it('menghapus proyek setelah konfirmasi', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = renderApp();
    await screen.findByRole('link', { name: 'Website Kampus' });
    await user.click(screen.getByRole('button', { name: 'Hapus proyek Website Kampus' }));
    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Website Kampus' })).not.toBeInTheDocument());
  });

  it('membatalkan konfirmasi -> proyek tetap ada', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user } = renderApp();
    await screen.findByRole('link', { name: 'Website Kampus' });
    await user.click(screen.getByRole('button', { name: 'Hapus proyek Website Kampus' }));
    expect(screen.getByRole('link', { name: 'Website Kampus' })).toBeInTheDocument();
  });

  it('gagal memuat -> pesan error dan tombol Coba lagi', async () => {
    const real = makeApi();
    let fail = true;
    const api = { ...real, listProjects: async () => { if (fail) throw new ApiError(0, 'Tidak dapat terhubung ke server'); return real.listProjects(); } };
    const { user } = renderApp({ api });
    expect(await screen.findByRole('alert')).toHaveTextContent('Tidak dapat terhubung ke server');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByRole('link', { name: 'Website Kampus' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('daftar kosong menampilkan ajakan membuat proyek', async () => {
    const api = makeApi();
    for (const p of await api.listProjects()) await api.deleteProject(p.id, 'u_ayu');
    renderApp({ api });
    expect(await screen.findByText(/Belum ada proyek/)).toBeInTheDocument();
  });
});
