import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TaskColumn from './TaskColumn.jsx';

const task = { id: 't1', title: 'Satu', description: '', status: 'todo', priority: 'low', assigneeId: null, dueDate: null };
const setup = (tasks = [task]) => {
  const onMove = vi.fn();
  render(
    <TaskColumn
      status="in_progress" tasks={tasks} usersById={{}} onMove={onMove}
      onStatusChange={() => {}} onEdit={() => {}} onDelete={() => {}}
    />,
  );
  return { onMove, column: screen.getByRole('region', { name: 'Kolom In Progress' }) };
};

describe('<TaskColumn /> drag & drop', () => {
  it('menjatuhkan kartu ke kolom memanggil onMove(id, statusKolom)', () => {
    const { onMove, column } = setup();
    fireEvent.drop(column, { dataTransfer: { getData: () => 't9' } });
    expect(onMove).toHaveBeenCalledWith('t9', 'in_progress');
  });

  it('drop tanpa data diabaikan', () => {
    const { onMove, column } = setup();
    fireEvent.drop(column, { dataTransfer: { getData: () => '' } });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('dragOver dibatalkan agar kolom menjadi area drop yang valid', () => {
    const { column } = setup();
    const notCancelled = fireEvent.dragOver(column);
    expect(notCancelled).toBe(false);          // preventDefault dipanggil
  });

  it('kolom kosong menampilkan petunjuk dan jumlah 0', () => {
    setup([]);
    expect(screen.getByText('Tidak ada task')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /In Progress 0/ })).toBeInTheDocument();
  });
});
