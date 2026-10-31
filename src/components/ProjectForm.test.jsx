import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProjectForm from './ProjectForm.jsx';

const users = [{ id: 'u1', name: 'Ayu' }, { id: 'u2', name: 'Budi' }];

describe('<ProjectForm />', () => {
  it('nama kosong ditolak', async () => {
    const onSubmit = vi.fn();
    render(<ProjectForm users={users} onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Nama proyek wajib diisi');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('semua anggota terpilih secara bawaan dan bisa dikurangi', async () => {
    const onSubmit = vi.fn();
    render(<ProjectForm users={users} onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Nama proyek'), 'Proyek X');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Budi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Proyek X', description: '', memberIds: ['u1'] });
  });

  it('nama lebih dari 60 karakter ditolak', async () => {
    const onSubmit = vi.fn();
    render(<ProjectForm users={users} onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.click(screen.getByLabelText('Nama proyek'));
    await userEvent.paste('x'.repeat(61));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('maksimal 60');
  });
});
