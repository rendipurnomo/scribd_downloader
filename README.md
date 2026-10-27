# Scribd PDF Downloader

Aplikasi **Desktop** yang mengunduh dokumen Scribd sebagai PDF.
Frontend berupa **React** (Vite), backend berupa **FastAPI** yang menjalankan
script Python (Selenium + Chrome + CDP) Anda.

---

## Struktur Folder

```
scribd_downloader/
├── server/
│   ├── main.py                 # FastAPI + subprocess
│   ├── requirements.txt        # Dependencies Python
│   ├── scribd_downloader.py    # Script Python asli (Selenium/Chrome)
│   └── downloads/              # (Otomatis dibuat) Tempat simpan PDF
│
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        └── App.jsx
```

---

## Prasyarat

### 1. Python

- Python 3.9+ terinstall
- Pastikan `python` dan `pip` tersedia di terminal

### 2. Chrome + ChromeDriver

- **Google Chrome** terinstall
- **ChromeDriver** (versi sesuai Chrome) terinstall
- Tambahkan ChromeDriver ke `PATH` environment

Cek ChromeDriver: buka terminal, ketik `chromedriver --version`

### 3. Node.js (hanya untuk frontend)

- Node.js 18+ terinstall
- Pastikan `npm` tersedia di terminal

---

## Instalasi

### 1. Buka terminal

Buka 2 terminal (atau tab) yang menunjuk ke folder proyek:

```
scribd_downloader/
```

---

### 2. Install dependencies backend

```bash
cd server
pip install -r requirements.txt
```

---

### 3. Install dependencies frontend

```bash
cd ../client
npm install
```

---

## Cara Menjalankan

### 4. Jalankan backend

```bash
cd server
python main.py
```

Backend akan berjalan di `http://localhost:8000`

---

### 5. Jalankan frontend

Buka tab baru / terminal lain, arahkan ke `client/`:

```bash
cd ../client
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

---

### 6. Gunakan aplikasi

1. Buka browser → `http://localhost:5173`
2. Masukkan URL Scribd, contoh:
   ```
   https://id.scribd.com/document/123456789/Document-Title
   ```
3. Klik **Unduh PDF**
4. Tunggu proses (tergantung panjang dokumen)
5. Klik **Download PDF** saat selesai

---

## Cara Kerja

```
React (localhost:5173)
   │  POST /api/convert { url }
   ▼
FastAPI (localhost:8000)
   │  → subprocess → python scribd_downloader.py
   │  → stdout/stderr diparse → progress
   ▼
Browser Chrome (Selenium)
   │  → Buka URL embed Scribd
   │  → Scroll halaman
   │  → Sembunyikan overlay
   │  → Cetak ke PDF (CDP Page.printToPDF)
   ▼
PDF disimpan di server/scribd_downloader/downloads/
```

---

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/convert` | Mulai konversi (body: `{ url }`) |
| `GET`  | `/api/status?task_id=xxx` | Cek status konversi |
| `GET`  | `/api/download/{task_id}` | Download PDF hasil konversi |

---

## Status Task

| Status | Arti |
|--------|------|
| `queued` | Menunggu diproses |
| `running` | Sedang berjalan |
| `completed` | Selesai, PDF siap diunduh |
| `failed` | Gagal, lihat pesan error |

---

## Tips

- **Dokumen panjang** → butuh waktu lebih lama, progress akan naik perlahan
- **Overlay/cookie banner** → script otomatis menyembunyikannya
- **ChromeDriver** → pastikan versi cocok dengan Chrome Anda

---

## Troubleshooting

### `ChromeDriver` tidak ditemukan

```bash
# Cek di terminal
chromedriver --version
```
Jika tidak ada, install ChromeDriver dan tambahkan ke PATH.

### `ModuleNotFoundError: No module named 'pypdf'`

```bash
pip install pypdf
```

### Frontend gagal connect ke API

Pastikan backend berjalan di `http://localhost:8000`
dan frontend di `http://localhost:5173`

---

## Reset

Hapus folder `downloads/` jika ingin mengosongkan PDF yang sudah diunduh.
