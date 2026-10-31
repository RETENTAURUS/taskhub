import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { memoryAdapter } from '../api/adapters.js';
import { seedDb } from '../api/core.js';
import { createLocalApi } from '../api/localApi.js';
import { createStore } from '../store/index.js';

/** API tiruan tanpa jeda, berisi data contoh (p_web punya 3 task). */
export function makeApi({ db = seedDb('2026-01-01T00:00:00.000Z') } = {}) {
  return createLocalApi({ adapter: memoryAdapter(db), latency: 0 });
}

/** Merender seluruh aplikasi (Redux + Router) pada route tertentu. */
export function renderApp({ route = '/', api = makeApi() } = {}) {
  const store = createStore({ api });
  const user = userEvent.setup();
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </Provider>,
  );
  return { store, api, user, ...view };
}
