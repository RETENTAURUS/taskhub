# TaskHub — A Collaborative Task Manager

Aplikasi manajemen task berbasis web dengan fitur kolaborasi: banyak anggota dalam satu proyek,
penanggung jawab per task, papan Kanban (To Do / In Progress / Done), dan **log aktivitas** yang
mencatat siapa mengubah apa.

**Stack:** React 19 · Redux Toolkit · React Router · Vite · Vitest + Testing Library · Node (server REST opsional)

> **Live demo:** _isi URL Netlify/Vercel-mu di sini setelah deploy_
> **Repository:** _isi URL GitHub-mu di sini_

---

## 1. Pemenuhan Fitur Wajib

| Syarat | Implementasi | Lokasi |
|---|---|---|
| **Task CRUD** | Buat, lihat, ubah, hapus task (dan proyek). Validasi di form **dan** di API | `components/TaskForm.jsx`, `store/tasksSlice.js`, `api/core.js` |
| **Ubah status** | Dropdown di kartu, atau **drag & drop** antar kolom | `components/TaskCard.jsx`, `TaskColumn.jsx` |
| **Filter & Sorting** | Filter: teks, status, prioritas, penanggung jawab. Sort: tanggal dibuat, tenggat, prioritas, judul (naik/turun) | `components/TaskFilters.jsx`, `store/selectors.js` |
| **State management global** | Redux Toolkit: 5 slice, `createEntityAdapter`, `createSelector` | `src/store/` |
| **Operasi async API** | `createAsyncThunk` untuk fetch / post / update / delete, dengan status loading, error, dan retry | `store/*Slice.js`, `src/api/` |
| **Testing ≥ 2 komponen** | **9 file test** untuk komponen & halaman (TaskCard, TaskForm, TaskFilters, TaskColumn, ProjectForm, ErrorBoundary, ProjectsPage, ProjectPage, App) | `*.test.jsx` |
| **Advanced topic** | Code splitting (`React.lazy` + `Suspense`), optimistic update + rollback, `React.memo` + `useCallback`, `ErrorBoundary`, penanganan race condition | lihat bagian 4 |
| **Deployment** | Konfigurasi siap pakai untuk Netlify **dan** Vercel + CI GitHub Actions | `netlify.toml`, `vercel.json`, `.github/workflows/ci.yml` |

## 2. Menjalankan

Butuh Node 18+.

```bash
npm install
npm run dev          # http://localhost:5173  (mode mandiri, data di localStorage browser)
npm test             # 156 test
npm run build        # hasil di dist/
```

### Dua mode backend

| Mode | Cara | Kapan dipakai |
|---|---|---|
| **Mandiri** (bawaan) | `VITE_API_URL` kosong. API tiruan di browser, data di `localStorage`, tetap async dengan jeda 250 ms | Deploy statis Netlify/Vercel, demo, pengembangan UI |
| **Server REST** | `npm run server` (port 4000) lalu `VITE_API_URL=http://localhost:4000 npm run dev` | Data **dibagikan** ke semua pengguna; penyimpanan di `server/data.json` |

Kedua mode memakai **satu kode logika yang sama** (`src/api/core.js`), jadi validasi dan pencatatan
aktivitas pasti identik. Antarmuka `localApi` dan `httpApi` juga sama, sehingga UI tidak tahu mana yang dipakai.

### Mencoba kolaborasi

Pilih nama di pojok kanan atas ("Masuk sebagai"), pindahkan task, lalu ganti pengguna lain —
panel **Aktivitas** mencatat `Budi memindahkan "…" dari To Do ke In Progress`.

## 3. Arsitektur

```
 UI (React)                    State (Redux Toolkit)                API
 ┌────────────────┐  dispatch  ┌─────────────────────┐  thunk   ┌──────────────┐
 │ pages/         │──────────▶ │ users projects tasks │ ───────▶ │ api/index.js │
 │ components/    │ ◀──select──│ activity ui          │ ◀─────── │  ├ localApi  │─▶ core.js ─▶ localStorage
 └────────────────┘            └─────────────────────┘ (extra)   │  └ httpApi   │─▶ server/ ─▶ core.js ─▶ data.json
                                                                 └──────────────┘
```

- `api` diinjeksi lewat `thunk.extraArgument` — di test cukup mengganti API, tanpa mock modul.
- `core.js` hanya berisi fungsi murni + adapter penyimpanan, sehingga bisa jalan di browser maupun Node.

### REST API (`server/index.js`)

| Metode & path | Fungsi | Sukses |
|---|---|---|
| `GET /api/health` | Cek server | 200 |
| `GET /api/users` | Daftar pengguna | 200 |
| `GET /api/projects` · `POST /api/projects` | Daftar (dengan statistik) · buat | 200 · 201 |
| `PATCH /api/projects/:id` · `DELETE /api/projects/:id` | Ubah · hapus (cascade task & aktivitas) | 200 |
| `GET /api/projects/:id/tasks` · `POST /api/projects/:id/tasks` | Daftar · buat task | 200 · 201 |
| `PATCH /api/tasks/:id` · `DELETE /api/tasks/:id` | Ubah (parsial) · hapus | 200 |
| `GET /api/projects/:id/activity` | Log aktivitas (terbaru di atas) | 200 |

Pengguna pelaku dikirim lewat header `X-User-Id`. Kode galat: `400` JSON rusak, `401` pengguna tidak dikenal,
`404` tidak ditemukan, `405` metode salah, `413` body > 1 MB, `422` validasi gagal.

## 4. Topik lanjutan

1. **Code splitting.** `ProjectPage` dimuat lazy di `App.jsx` dan `ActivityFeed` lazy di dalam `ProjectPage`.
   Hasil build menunjukkan chunk terpisah (`ProjectPage-*.js`, `ActivityFeed-*.js`), sehingga halaman daftar
   proyek tidak mengunduh kode papan task. Dibungkus `Suspense` (fallback spinner) dan `ErrorBoundary`
   (menangkap error render atau gagal memuat chunk).
2. **Optimistic update + rollback** (`tasksSlice.js`). Saat status diubah, UI langsung berpindah (`pending`);
   bila server menolak (`rejected`), task dikembalikan dari *snapshot* dan pesan error ditampilkan.
3. **Race condition.** Jika pengguna pindah proyek saat request lama belum selesai, respons basi diabaikan
   (`a.meta.arg !== s.projectId`). Ada test khusus.
4. **Memoization.** `TaskCard` dibungkus `React.memo`, callback di parent distabilkan dengan `useCallback`,
   dan data turunan memakai `createSelector` (memoized, diuji lewat kesamaan referensi).
5. **Ketahanan.** `localStorage` penuh/rusak/tidak tersedia → otomatis cadangan ke memori. Server menulis
   file secara atomik (tulis ke `.tmp` lalu `rename`).

## 5. Pengujian

```bash
npm test                 # semua test
npm run coverage         # + laporan coverage
```

**156 test, 17 file, coverage ±96%** (statement). Strategi:

| Lapisan | Contoh yang diuji |
|---|---|
| **Komponen** | `TaskCard` (terlambat/tidak, callback, drag), `TaskForm` (validasi, trim, nilai batas 120 karakter, prefill), `TaskFilters` (terhubung ke store), `TaskColumn` (drop), `ProjectForm`, `ErrorBoundary` |
| **Halaman (integrasi)** | Alur lengkap UI → Redux → API: tambah/ubah/hapus task, pindah status, filter, sort, gagal memuat + "Coba lagi", rollback saat server error, proyek tak dikenal |
| **Redux** | Thunk (loading → succeeded/failed), optimistic update & rollback, race condition, selector filter/sort (semua permutasi input), memoization |
| **API / logika** | Validasi (tanggal 30 Feb ditolak, 29 Feb kabisat diterima), cascade delete, log aktivitas, isolasi data, adapter penyimpanan rusak |
| **Server** | Alur CRUD lewat HTTP sungguhan, kode status, CORS, JSON rusak, body besar, persistensi file |

**Mutation check.** Kode sengaja dirusak satu per satu (mis. menghapus rollback, membalik urutan tenggat kosong,
menghapus cascade, melonggarkan validasi). Dua mutasi sempat lolos, test lalu diperkuat, dan semua mutasi kini ditangkap.

## 6. Struktur

```
src/
  api/        core.js (logika+validasi) · adapters.js · localApi.js · httpApi.js · index.js
  store/      users/projects/tasks/activity/ui slice · selectors.js · index.js
  components/ TaskCard · TaskColumn · TaskForm · TaskFilters · ProjectCard · ProjectForm · Modal · ActivityFeed · …
  pages/      ProjectsPage · ProjectPage (lazy)
  test/       setup.js · utils.jsx
server/       index.js (REST, Node murni) · server.test.js
netlify.toml · vercel.json · .github/workflows/ci.yml · .env.example
```
