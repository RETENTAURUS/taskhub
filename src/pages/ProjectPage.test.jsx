import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/core.js';
import { makeApi, renderApp } from '../test/utils.jsx';

afterEach(() => vi.restoreAllMocks());

const column = (name) => screen.getByRole('region', { name: `Kolom ${name}` });
const open = async (opts = {}) => {
  const ctx = renderApp({ route: '/projects/p_web', ...opts });
  await screen.findByRole('heading', { name: 'Implementasi navigasi responsif', level: 4 });
  return ctx;
};

describe('Halaman papan task', () => {
  it('menampilkan task di kolom sesuai statusnya', async () => {
    await open();
    expect(within(column('To Do')).getByText('Tulis dokumentasi API')).toBeInTheDocument();
    expect(within(column('In Progress')).getByText('Implementasi navigasi responsif')).toBeInTheDocument();
    expect(within(column('Done')).getByText('Rancang wireframe halaman utama')).toBeInTheDocument();
    expect(screen.getByText('1 dari 3 task selesai')).toBeInTheDocument();
  });

  it('memuat panel aktivitas secara lazy', async () => {
    await open();
    expect(await screen.findByRole('complementary', { name: 'Aktivitas terbaru' })).toBeInTheDocument();
  });

  it('mengubah status memindahkan kartu antar kolom dan mencatat aktivitas', async () => {
    const { user } = await open();
    await user.selectOptions(screen.getByLabelText('Ubah status Tulis dokumentasi API'), 'done');
    expect(within(column('Done')).getByText('Tulis dokumentasi API')).toBeInTheDocument();
    expect(within(column('To Do')).queryByText('Tulis dokumentasi API')).not.toBeInTheDocument();
    expect(await screen.findByText(/memindahkan "Tulis dokumentasi API" dari To Do ke Done/)).toBeInTheDocument();
  });

  it('menambah task baru', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: '+ Task baru' }));
    const dialog = screen.getByRole('dialog', { name: 'Task baru' });
    await user.type(within(dialog).getByLabelText('Judul'), 'Uji coba aksesibilitas');
    await user.selectOptions(within(dialog).getByLabelText('Prioritas'), 'high');
    await user.click(within(dialog).getByRole('button', { name: 'Tambah task' }));
    expect(await within(column('To Do')).findByText('Uji coba aksesibilitas')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dialog tetap terbuka bila server menolak (validasi server)', async () => {
    const real = makeApi();
    const api = { ...real, createTask: async () => { throw new ApiError(422, 'Judul task wajib diisi'); } };
    const { user } = await open({ api });
    await user.click(screen.getByRole('button', { name: '+ Task baru' }));
    await user.type(screen.getByLabelText('Judul'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    expect(await screen.findByText('Judul task wajib diisi')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('mengubah task yang ada', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Ubah Tulis dokumentasi API' }));
    const title = screen.getByLabelText('Judul');
    expect(title).toHaveValue('Tulis dokumentasi API');
    await user.clear(title);
    await user.type(title, 'Tulis dokumentasi REST');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByRole('heading', { name: 'Tulis dokumentasi REST', level: 4 })).toBeInTheDocument();
  });

  it('menghapus task setelah konfirmasi', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Hapus Tulis dokumentasi API' }));
    await waitFor(() => expect(screen.queryByText('Tulis dokumentasi API')).not.toBeInTheDocument());
  });

  it('pencarian menyaring task', async () => {
    const { user } = await open();
    await user.type(screen.getByLabelText('Cari task'), 'wireframe');
    expect(screen.getByText('Rancang wireframe halaman utama')).toBeInTheDocument();
    expect(screen.queryByText('Tulis dokumentasi API')).not.toBeInTheDocument();
  });

  it('filter prioritas dan reset', async () => {
    const { user } = await open();
    await user.selectOptions(screen.getByLabelText('Filter prioritas'), 'low');
    expect(screen.queryByText('Rancang wireframe halaman utama')).not.toBeInTheDocument();
    expect(screen.getByText('Tulis dokumentasi API')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Rancang wireframe halaman utama')).toBeInTheDocument();
  });

  it('pengurutan judul dalam satu kolom', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: '+ Task baru' }));
    await user.type(screen.getByLabelText('Judul'), 'Aaa duluan');
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    await within(column('To Do')).findByText('Aaa duluan');
    await user.selectOptions(screen.getByLabelText('Urutkan berdasarkan'), 'title');
    const titles = () => within(column('To Do')).getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(titles()).toEqual(['Aaa duluan', 'Tulis dokumentasi API']);
    await user.click(screen.getByRole('button', { name: /Arah urutan/ }));
    expect(titles()).toEqual(['Tulis dokumentasi API', 'Aaa duluan']);
  });

  it('gagal mengubah status -> kartu kembali ke kolom semula + pesan error', async () => {
    const real = makeApi();
    const api = { ...real, updateTask: async () => { throw new ApiError(500, 'Server sedang bermasalah'); } };
    const { user } = await open({ api });
    await user.selectOptions(screen.getByLabelText('Ubah status Tulis dokumentasi API'), 'done');
    expect(await screen.findByRole('alert')).toHaveTextContent('Server sedang bermasalah');
    expect(within(column('To Do')).getByText('Tulis dokumentasi API')).toBeInTheDocument();
  });

  it('menampilkan siapa yang mengerjakan setelah ganti pengguna', async () => {
    const { user } = await open();
    await user.selectOptions(screen.getByLabelText('Masuk sebagai'), 'u_budi');
    await user.selectOptions(screen.getByLabelText('Ubah status Tulis dokumentasi API'), 'in_progress');
    expect(await screen.findByText(/Budi/, { selector: 'strong' })).toBeInTheDocument();
  });

  it('proyek tidak dikenal -> pesan tidak ditemukan', async () => {
    renderApp({ route: '/projects/p_hantu' });
    expect(await screen.findByText('Proyek tidak ditemukan.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kembali ke daftar proyek/ })).toBeInTheDocument();
  });

  it('gagal memuat task -> error dengan tombol Coba lagi', async () => {
    const real = makeApi();
    let fail = true;
    const api = { ...real, listTasks: async (id) => { if (fail) throw new ApiError(500, 'Gagal memuat'); return real.listTasks(id); } };
    const { user } = renderApp({ route: '/projects/p_web', api });
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memuat');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Tulis dokumentasi API')).toBeInTheDocument();
  });
});
