import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TaskCard from './TaskCard.jsx';

const task = (o = {}) => ({
  id: 't1', projectId: 'p', title: 'Tulis laporan', description: 'Bab 1 sampai 3', status: 'todo',
  priority: 'high', assigneeId: 'u1', dueDate: null, ...o,
});
const setup = (props = {}) => {
  const handlers = { onStatusChange: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  render(<TaskCard task={task()} assignee={{ id: 'u1', name: 'Ayu' }} {...handlers} {...props} />);
  return handlers;
};

describe('<TaskCard />', () => {
  it('menampilkan judul, deskripsi, prioritas, dan penanggung jawab', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Tulis laporan' })).toBeInTheDocument();
    expect(screen.getByText('Bab 1 sampai 3')).toBeInTheDocument();
    expect(screen.getByText('Tinggi')).toBeInTheDocument();
    expect(screen.getByText(/Ayu/)).toBeInTheDocument();
  });

  it('tanpa penanggung jawab menampilkan "Belum ditugaskan"', () => {
    setup({ assignee: undefined });
    expect(screen.getByText('Belum ditugaskan')).toBeInTheDocument();
  });

  it('tanpa deskripsi dan tenggat, bagian itu tidak dirender', () => {
    setup({ task: task({ description: '' }) });
    expect(screen.queryByText(/📅/)).not.toBeInTheDocument();
  });

  it('menandai terlambat bila tenggat lewat dan belum done', () => {
    setup({ task: task({ dueDate: '2020-01-01' }) });
    expect(screen.getByText(/terlambat/)).toHaveClass('overdue');
  });

  it('tidak menandai terlambat bila sudah done', () => {
    setup({ task: task({ dueDate: '2020-01-01', status: 'done' }) });
    expect(screen.queryByText(/terlambat/)).not.toBeInTheDocument();
  });

  it('tenggat di masa depan tidak terlambat', () => {
    setup({ task: task({ dueDate: '2999-01-01' }) });
    expect(screen.getByText(/📅/)).not.toHaveClass('overdue');
  });

  it('mengubah status memanggil onStatusChange(task, statusBaru)', async () => {
    const { onStatusChange } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Ubah status Tulis laporan'), 'done');
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }), 'done');
  });

  it('tombol Ubah dan Hapus memanggil callback dengan task-nya', async () => {
    const { onEdit, onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Ubah Tulis laporan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hapus Tulis laporan' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('dapat di-drag: id task dititipkan ke dataTransfer', () => {
    setup();
    const setData = vi.fn();
    fireEvent.dragStart(screen.getByRole('article'), { dataTransfer: { setData, effectAllowed: '' } });
    expect(setData).toHaveBeenCalledWith('text/plain', 't1');
  });
});
