import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { createDefaultApi } from './api/index.js';
import { createStore } from './store/index.js';
import { USER_STORAGE_KEY } from './store/uiSlice.js';
import './styles.css';

const store = createStore({ api: createDefaultApi() });

// Ingat pengguna terakhir yang dipilih (side effect sengaja di luar reducer).
let lastUser = store.getState().ui.currentUserId;
store.subscribe(() => {
  const { currentUserId } = store.getState().ui;
  if (currentUserId === lastUser) return;
  lastUser = currentUserId;
  try { localStorage.setItem(USER_STORAGE_KEY, currentUserId); } catch { /* abaikan */ }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
