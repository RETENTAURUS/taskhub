import { useDispatch, useSelector } from 'react-redux';
import { PRIORITIES, PRIORITY_LABEL, SORT_OPTIONS, STATUSES, STATUS_LABEL } from '../constants.js';
import { selectFilters, selectSort } from '../store/selectors.js';
import { resetFilters, setFilter, setSort } from '../store/uiSlice.js';

export default function TaskFilters({ members }) {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);
  const sort = useSelector(selectSort);
  const change = (key) => (e) => dispatch(setFilter({ key, value: e.target.value }));

  return (
    <form className="filters" role="search" aria-label="Filter dan urutkan task" onSubmit={(e) => e.preventDefault()}>
      <input
        type="search"
        placeholder="Cari task…"
        aria-label="Cari task"
        value={filters.search}
        onChange={change('search')}
      />
      <select aria-label="Filter status" value={filters.status} onChange={change('status')}>
        <option value="all">Semua status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <select aria-label="Filter prioritas" value={filters.priority} onChange={change('priority')}>
        <option value="all">Semua prioritas</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
      </select>
      <select aria-label="Filter penanggung jawab" value={filters.assigneeId} onChange={change('assigneeId')}>
        <option value="all">Semua orang</option>
        <option value="none">Belum ditugaskan</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <select aria-label="Urutkan berdasarkan" value={sort.by} onChange={(e) => dispatch(setSort({ by: e.target.value }))}>
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button
        type="button"
        className="btn btn--small"
        aria-label={`Arah urutan: ${sort.dir === 'asc' ? 'naik' : 'turun'}`}
        onClick={() => dispatch(setSort({ dir: sort.dir === 'asc' ? 'desc' : 'asc' }))}
      >
        {sort.dir === 'asc' ? '↑ Naik' : '↓ Turun'}
      </button>
      <button type="button" className="btn btn--small btn--ghost" onClick={() => dispatch(resetFilters())}>Reset</button>
    </form>
  );
}
