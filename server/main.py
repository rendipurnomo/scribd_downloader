import os
import sys
import uuid
import tempfile
import subprocess
import re
import shutil  # <-- tambahkan ini
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

from contextlib import asynccontextmanager

# ── Lifespan (mengganti on_event) ───────────────────────────────
@asynccontextmanager
async def lifespan(app):
    """Setup & teardown lifecycle untuk FastAPI."""
    # Awal aplikasi
    yield
    # Penyelesaian (opsional)

app = FastAPI(title="Scribd PDF Converter API", lifespan=lifespan)

# ── CORS middleware (izin akses dari frontend) ─────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ──────────────────────────────────────────────
class ConvertRequest(BaseModel):
    url: str

class TaskStatus(BaseModel):
    task_id: str
    status: str
    message: str
    progress: int = 0
    file_path: Optional[str] = None

# ── In-memory task store ────────────────────────────────
tasks = {}
executor = ThreadPoolExecutor(max_workers=2)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIBD_SCRIPT = os.path.join(SCRIPT_DIR, "scribd_downloader.py")
DOWNLOADS_DIR = os.path.join(SCRIPT_DIR, "downloads")
BACKUP_DIR = os.path.join(SCRIPT_DIR, "downloads_backup")

# ── Konfigurasi ─────────────────────────────────────────
CLEANUP_DAYS = 1       # Hapus file > 1 hari
MAX_BACKUPS = 5        # Maksimal backup

os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)


def cleanup_old_files():
    """Hapus folder > CLEANUP_DAYS hari."""
    if not os.path.exists(DOWNLOADS_DIR):
        return

    cutoff = datetime.now() - timedelta(days=CLEANUP_DAYS)
    for folder in os.listdir(DOWNLOADS_DIR):
        folder_path = os.path.join(DOWNLOADS_DIR, folder)
        if os.path.isdir(folder_path):
            try:
                folder_time = datetime.fromtimestamp(os.path.getmtime(folder_path))
                if folder_time < cutoff:
                    shutil.rmtree(folder_path)
                    print(f"  🗑️ Hapus folder: {folder_path}")
            except Exception as e:
                print(f"  ⚠️ Gagal hapus {folder_path}: {e}")


def rotate_backups():
    """Hapus PDF tertua jika > MAX_BACKUPS."""
    if not os.path.exists(DOWNLOADS_DIR):
        return

    backups = []
    for folder in os.listdir(DOWNLOADS_DIR):
        folder_path = os.path.join(DOWNLOADS_DIR, folder)
        if os.path.isdir(folder_path):
            for f in os.listdir(folder_path):
                if f.endswith(".pdf"):
                    backups.append((folder_path, f))

    if len(backups) > MAX_BACKUPS:
        backups.sort(key=lambda x: os.path.getmtime(x[0]), reverse=True)
        for old_folder, old_file in backups[MAX_BACKUPS:]:
            try:
                os.remove(os.path.join(old_folder, old_file))
                print(f"  🗑️ Hapus backup: {old_file}")
            except Exception as e:
                print(f"  ⚠️ Gagal hapus backup {old_file}: {e}")


def run_conversion(url: str, task_id: str) -> None:
    """Jalankan script Python sebagai subprocess dalam background."""
    if not os.path.exists(SCRIBD_SCRIPT):
        tasks[task_id] = {
            "task_id": task_id,
            "status": "failed",
            "message": f"Script tidak ditemukan: {SCRIBD_SCRIPT}",
            "progress": 0,
        }
        return

    task = tasks[task_id]
    task.update({"status": "running", "message": "Membuka browser Chrome..."})

    try:
        proc = subprocess.run(
            [sys.executable, SCRIBD_SCRIPT],
            input=url + "\n",
            capture_output=True,
            text=True,
            cwd=SCRIPT_DIR,
            timeout=600,
        )

        lines = (proc.stderr or "").splitlines()
        if not lines:
            lines = (proc.stdout or "").splitlines()

        for line in lines:
            if "Scrolled" in line or "Found" in line:
                p = extract_progress(line)
                tasks[task_id]["progress"] = max(tasks[task_id].get("progress", 0), p)

        if proc.returncode == 0:
            # Cari PDF yang baru dibuat (terakhir diubah)
            pdf_files = []
            for folder in os.listdir(DOWNLOADS_DIR):
                folder_path = os.path.join(DOWNLOADS_DIR, folder)
                if os.path.isdir(folder_path):
                    for f in os.listdir(folder_path):
                        if f.endswith(".pdf"):
                            pdf_files.append((folder_path, f))

            if pdf_files:
                # Ambil PDF yang paling baru
                pdf_files.sort(key=lambda x: os.path.getmtime(x[0]))
                file_path = pdf_files[-1][0]

                # Backup rotasi
                rotate_backups()

                tasks[task_id] = {
                    "task_id": task_id,
                    "status": "completed",
                    "message": "PDF berhasil diunduh.",
                    "progress": 100,
                    "file_path": file_path,
                }
            else:
                tasks[task_id] = {
                    "task_id": task_id,
                    "status": "failed",
                    "message": "Tidak ada PDF yang dihasilkan.",
                    "progress": 100,
                }
        else:
            error_line = lines[-1] if lines else "Unknown error"
            tasks[task_id] = {
                "task_id": task_id,
                "status": "failed",
                "message": f"Gagal: {error_line}",
                "progress": 100,
            }
    except subprocess.TimeoutExpired:
        tasks[task_id] = {
            "task_id": task_id,
            "status": "failed",
            "message": "Waktu eksekusi kedaluwarsa (600 detik).",
            "progress": 100,
        }
    except Exception as e:
        tasks[task_id] = {
            "task_id": task_id,
            "status": "failed",
            "message": f"Error: {str(e)}",
            "progress": 100,
        }


@app.post("/api/convert", response_model=TaskStatus)
async def convert_scribd(request: ConvertRequest):
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "task_id": task_id,
        "status": "queued",
        "message": "Menyiapkan konversi...",
        "progress": 0,
    }
    asyncio.get_event_loop().run_in_executor(executor, run_conversion, request.url, task_id)
    return TaskStatus(**tasks[task_id])


@app.get("/api/status")
async def get_status(task_id: str):
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")
    return TaskStatus(**task)


@app.get("/api/files", response_model=list[dict])
async def list_files():
    """Daftar PDF yang tersimpan."""
    files = []
    if not os.path.exists(DOWNLOADS_DIR):
        return files

    for folder in os.listdir(DOWNLOADS_DIR):
        folder_path = os.path.join(DOWNLOADS_DIR, folder)
        if os.path.isdir(folder_path):
            for f in os.listdir(folder_path):
                if f.endswith(".pdf"):
                    file_path = os.path.join(folder_path, f)
                    files.append({
                        "folder": folder,
                        "filename": f,
                        "file_path": file_path,
                        "size": os.path.getsize(file_path),
                        "modified": datetime.fromtimestamp(
                            os.path.getmtime(file_path)
                        ).isoformat(),
                    })

    files.sort(key=lambda x: x["modified"], reverse=True)
    return files


@app.delete("/api/files/{folder}/{filename}")
async def delete_file(folder: str, filename: str):
    """Hapus file PDF."""
    file_path = os.path.join(DOWNLOADS_DIR, folder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File tidak ditemukan")

    os.remove(file_path)
    return {"message": "File dihapus", "file_path": file_path}


@app.get("/api/download/{folder}/{filename}")
async def download_file(folder: str, filename: str):
    """Download file PDF."""
    file_path = os.path.join(DOWNLOADS_DIR, folder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF tidak ditemukan")
    return FileResponse(file_path, filename=filename)


@app.get("/api/downloads")
async def list_all_downloads():
    """Daftar semua file PDF (untuk UI)."""
    files = []
    if not os.path.exists(DOWNLOADS_DIR):
        return files

    for folder in os.listdir(DOWNLOADS_DIR):
        folder_path = os.path.join(DOWNLOADS_DIR, folder)
        if os.path.isdir(folder_path):
            for f in os.listdir(folder_path):
                if f.endswith(".pdf"):
                    file_path = os.path.join(folder_path, f)
                    files.append({
                        "folder": folder,
                        "filename": f,
                        "file_path": file_path,
                        "size": os.path.getsize(file_path),
                        "modified": datetime.fromtimestamp(
                            os.path.getmtime(file_path)
                        ).isoformat(),
                    })

    files.sort(key=lambda x: x["modified"], reverse=True)
    return files


@app.on_event("shutdown")
def shutdown():
    executor.shutdown(wait=False)


if __name__ == "__main__":
    import uvicorn
    import sys
    
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run(app, host="0.0.0.0", port=port)
