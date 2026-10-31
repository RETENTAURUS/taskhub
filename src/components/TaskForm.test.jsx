import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TaskForm from './TaskForm.jsx';

const members = [{ id: 'u1', name: 'Ayu' }, { id: 'u2', name: 'Budi' }];
const setup = (props = {}) => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(<TaskForm members={members} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Tambah task" {...props} />);
  return { onSubmit, onCancel, user: userEvent.setup() };
};

describe('<TaskForm />', () => {
  it('judul kosong -> pesan error dan onSubmit tidak dipanggil', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Judul task wajib diisi');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('judul hanya spasi dianggap kosong', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Judul'), '    ');
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('judul lebih dari 120 karakter ditolak', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByLabelText('Judul'));
    await user.paste('x'.repeat(121));
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    expect(screen.getByRole('alert')).toHaveTextContent('maksimal 120');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mengirim nilai yang sudah dirapikan (trim, kosong -> null)', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Judul'), '  Siapkan demo  ');
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Siapkan demo', description: '', status: 'todo', priority: 'medium', assigneeId: null, dueDate: null,
    });
  });

  it('mengirim semua field yang diisi', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Judul'), 'Tugas');
    await user.type(screen.getByLabelText('Deskripsi'), 'Detail');
    await user.selectOptions(screen.getByLabelText('Status'), 'in_progress');
    await user.selectOptions(screen.getByLabelText('Prioritas'), 'high');
    await user.selectOptions(screen.getByLabelText('Penanggung jawab'), 'u2');
    await user.type(screen.getByLabelText('Tenggat'), '2026-07-01');
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Tugas', description: 'Detail', status: 'in_progress', priority: 'high', assigneeId: 'u2', dueDate: '2026-07-01',
    });
  });

  it('mode ubah: field terisi data awal', () => {
    setup({
      initial: { title: 'Lama', description: 'd', status: 'done', priority: 'low', assigneeId: 'u1', dueDate: '2026-01-02' },
    });
    expect(screen.getByLabelText('Judul')).toHaveValue('Lama');
    expect(screen.getByLabelText('Status')).toHaveValue('done');
    expect(screen.getByLabelText('Penanggung jawab')).toHaveValue('u1');
    expect(screen.getByLabelText('Tenggat')).toHaveValue('2026-01-02');
  });

  it('pilihan penanggung jawab hanya anggota proyek', () => {
    setup();
    const options = screen.getAllByRole('option', { name: /Ayu|Budi|Belum ditugaskan/ }).map((o) => o.textContent);
    expect(options).toEqual(['Belum ditugaskan', 'Ayu', 'Budi']);
  });

  it('error hilang setelah pengiriman yang valid', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Judul'), 'ok');
    await user.click(screen.getByRole('button', { name: 'Tambah task' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Batal memanggil onCancel', async () => {
    const { onCancel, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
