import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { createStore } from '../store/index.js';
import TaskFilters from './TaskFilters.jsx';

const members = [{ id: 'u1', name: 'Ayu' }];
const setup = () => {
  const store = createStore({ api: {} });
  render(<Provider store={store}><TaskFilters members={members} /></Provider>);
  return { store, user: userEvent.setup() };
};

describe('<TaskFilters />', () => {
  it('mengetik di kolom pencarian memperbarui state global', async () => {
    const { store, user } = setup();
    await user.type(screen.getByLabelText('Cari task'), 'logo');
    expect(store.getState().ui.filters.search).toBe('logo');
  });

  it('memilih filter status, prioritas, dan penanggung jawab', async () => {
    const { store, user } = setup();
    await user.selectOptions(screen.getByLabelText('Filter status'), 'done');
    await user.selectOptions(screen.getByLabelText('Filter prioritas'), 'high');
    await user.selectOptions(screen.getByLabelText('Filter penanggung jawab'), 'u1');
    expect(store.getState().ui.filters).toMatchObject({ status: 'done', priority: 'high', assigneeId: 'u1' });
  });

  it('mengubah kriteria dan arah urutan', async () => {
    const { store, user } = setup();
    await user.selectOptions(screen.getByLabelText('Urutkan berdasarkan'), 'priority');
    await user.click(screen.getByRole('button', { name: /Arah urutan: naik/ }));
    expect(store.getState().ui.sort).toEqual({ by: 'priority', dir: 'desc' });
    expect(screen.getByRole('button', { name: /Arah urutan: turun/ })).toHaveTextContent('↓ Turun');
  });

  it('Reset mengembalikan semua filter ke bawaan', async () => {
    const { store, user } = setup();
    await user.type(screen.getByLabelText('Cari task'), 'x');
    await user.selectOptions(screen.getByLabelText('Filter status'), 'todo');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(store.getState().ui.filters).toEqual({ status: 'all', priority: 'all', assigneeId: 'all', search: '' });
    expect(screen.getByLabelText('Cari task')).toHaveValue('');
  });
});
