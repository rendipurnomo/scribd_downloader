# Scribd PDF Downloader

Aplikasi **Desktop** yang mengunduh dokumen Scribd sebagai PDF.
Frontend berupa **React** (Vite), backend berupa **FastAPI** yang menjalankan
script Python (Selenium + Chrome + CDP).

---

## Struktur Folder

```txt
scribd_downloader/
├── client/                       # Frontend React (Vite)
│   ├── dist/                     # (generated) build React
│   ├── src/
│   │   ├── main.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
└── server/
    ├── main.py                   # FastAPI + subprocess
    ├── requirements.txt          # Dependencies Python
    ├── scribd_downloader.py      # Script Python asli (Selenium/Chrome)
    ├── wsgi.py                   # (Optional) WSGI entry for PythonAnywhere
    ├── downloads/                # (generated) Tempat simpan PDF
    └── __pycache__/
```

---

## Prasyarat

### 1. Python 3.10+

```bash
python --version
```

### 2. Chrome + ChromeDriver

- **Google Chrome** terinstall
- **ChromeDriver** (versi sesuai Chrome) terinstall
- Tambahkan ChromeDriver ke `PATH` environment

Cek ChromeDriver: `chromedriver --version`

### 3. Node.js 18+

```bash
node --version
npm --version
```

---

## Install Dependencies

```bash
cd server
pip install -r requirements.txt

cd ../client
npm install
```

---

## Cara Menjalankan

### Mode Development (localhost)

```bash
# Terminal 1 - Backend
cd server
python main.py
# → http://localhost:8000

# Terminal 2 - Frontend
cd ../client
npm run dev
# → http://localhost:5173
```

---

## Cara Menjalankan (Production / Docker)

```bash
# Build image
docker build -t scribd-pdf-converter .

# Run container
docker run -d \
  --name scribd-pdf \
  -p 8000:8000 \
  --env SCRIBD_HEADLESS=1 \
  --env SCRIBD_CDP_TIMEOUT=600 \
  scribd-pdf-converter
```

Akses: `http://localhost:8000`

---

## Cara Deploy ke SnapDeploy

```bash
# 1. Build image
docker build -t scribd-pdf-converter .

# 2. Tag & push (ganti username dengan GitHub/GitLab Anda)
docker tag scribd-pdf-converter yourname/scribd-pdf-converter:latest
docker push yourname/scribd-pdf-converter

# 3. Di SnapDeploy dashboard:
#    - Pilih "Deploy existing image"
#    - Masukkan repo/image URL Anda
#    - Set env var: SCRIBD_HEADLESS=1
#    - Deploy
```

---

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/convert` | Mulai konversi (body: `{ url }`) |
| `GET`  | `/api/status?task_id=xxx` | Cek status konversi |
| `GET`  | `/api/download/{task_id}` | Download PDF hasil konversi |
| `GET`  | `/api/files` | Daftar PDF yang tersimpan |
| `GET`  | `/api/downloads/{folder}/{filename}` | Download file PDF |
| `DELETE` | `/api/files/{folder}/{filename}` | Hapus file PDF |

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

- **Dokumen panjang** → butuh waktu lebih lama
- **Overlay/cookie banner** → script otomatis menyembunyikannya
- **ChromeDriver** → pastikan versi cocok dengan Chrome Anda

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'pypdf'`
```bash
pip install pypdf
```

### Frontend gagal connect ke API
```bash
# Pastikan backend berjalan
curl http://localhost:8000/api/status
```

### Chrome not found
```bash
# Cek Chrome di PATH
which google-chrome
which chromium
```

### File PDF tidak muncul
```bash
ls -la server/downloads/
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
