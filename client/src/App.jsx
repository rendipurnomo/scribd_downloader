import { useState, useEffect } from "react";

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function App() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [downloads, setDownloads] = useState([]);

  const API_URL = "http://localhost:8000/api";

  // Fetch file list saat aplikasi load
  useEffect(() => {
    fetch(`${API_URL}/files`)
      .then((res) => res.json())
      .then((data) => setDownloads(data))
      .catch(() => {});
  }, []);

  const handleDelete = async (item) => {
    if (!confirm("Hapus file ini?")) return;
    try {
      await fetch(`${API_URL}/files/${item.folder}/${item.filename}`, {
        method: "DELETE",
      });
      setDownloads(downloads.filter((d) => d.file_path !== item.file_path));
    } catch (err) {
      setStatus("Gagal menghapus file");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      setTaskId(data.task_id);
      setTaskStatus(data);

      pollStatus(data.task_id);
    } catch (err) {
      setStatus("Gagal terhubung ke server");
      setIsLoading(false);
    }
  };

  const pollStatus = async (id) => {
    try {
      const res = await fetch(`${API_URL}/status?task_id=${id}`);
      const data = await res.json();

      setTaskStatus(data);
      setStatus(data.message);

      if (data.progress > 0) setProgress(data.progress);

      if (data.status === "running") {
        setTimeout(() => pollStatus(id), 2000);
      } else if (data.status === "completed") {
        setResult(data);
        setIsLoading(false);
      } else if (data.status === "failed") {
        setStatus(data.message);
        setIsLoading(false);
      }
    } catch (err) {
      setStatus("Koneksi ke server putus");
    }
  };

  const handleDownload = async (item) => {
    if (!item || !item.folder) return;
    try {
      const res = await fetch(
        `${API_URL}/download/${item.folder}/${item.filename}`,
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatus("Gagal mendownload PDF");
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Poppins', 'Segoe UI', system-ui, sans-serif",
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f0fdfa 0%, #d1fae5 50%, #a7f3d0 100%)",
        color: "#1e293b",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* ══ LOGO ══ */}
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          padding: "2rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #10B981, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(16, 185, 129, 0.35)",
              flexShrink: 0,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="12" y1="11" x2="12" y2="17" />
            </svg>
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Scribd<span style={{ color: "#10B981" }}>PDF</span>
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "#6B7280",
                fontWeight: 400,
                letterSpacing: "0.04em",
              }}
            >
              Download &amp; konversi dokumen
            </p>
          </div>
        </div>

        {/* ══ FORM INPUT ══ */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(16px)",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#6B7280",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              URL dokumen Scribd
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://id.scribd.com/document/123456789/Document-Title"
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "10px",
                border: "2px solid #E2E8F0",
                fontSize: "0.95rem",
                fontFamily: "'Poppins', sans-serif",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
                background: "#FFFFFF",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#10B981";
                e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#E2E8F0";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "0.85rem 1.5rem",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
              cursor: "pointer",
              opacity: isLoading ? 0.7 : 1,
              transition: "transform 0.15s, box-shadow 0.2s",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 14px rgba(16, 185, 129, 0.35)";
            }}
          >
            {isLoading ? "Memproses..." : "Unduh PDF"}
          </button>
        </form>
      </div>

      {/* ══ STATUS & PROGRESS ══ */}
      {(status || taskStatus) && (
        <div
          style={{
            width: "100%",
            maxWidth: "640px",
            padding: "1rem 1.5rem",
            marginTop: "1rem",
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: "12px",
            border: "1px solid rgba(16, 185, 129, 0.12)",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
            whiteSpace: "pre-wrap",
            fontSize: "0.9rem",
            color: "#374151",
          }}
        >
          {status}
        </div>
      )}

      {isLoading && (
        <div style={{ marginTop: "1rem", padding: "0 1.5rem 1.5rem" }}>
          <div
            style={{
              height: 6,
              backgroundColor: "rgba(16, 185, 129, 0.2)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #10B981, #059669)",
                borderRadius: "3px",
                transition: "width 0.25s ease",
                width: `${progress}%`,
              }}
            />
          </div>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.85rem",
              color: "#6B7280",
            }}
          >
            {progress > 0 ? `${progress}%` : "Memproses..."}
          </p>
        </div>
      )}

      {/* ══ RESULT ══ */}
      {result && (
        <div
          style={{
            width: "100%",
            maxWidth: "640px",
            marginTop: "1rem",
            background: "linear-gradient(135deg, #EFF6FF 0%, #CCFBF1 100%)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            borderRadius: "16px",
            padding: "1.5rem",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(16, 185, 129, 0.10)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>
          <h2 style={{ marginBottom: "0.4rem", fontWeight: 700 }}>
            <span style={{ color: "#10B981" }}>PDF</span> selesai!
          </h2>
          <p
            style={{
              color: "#374151",
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {result.message}
          </p>
          <button
            onClick={handleDownload}
            style={{
              padding: "0.85rem 1.5rem",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
              transition: "transform 0.15s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 14px rgba(16, 185, 129, 0.35)";
            }}
          >
            Download PDF
          </button>
        </div>
      )}

      {/* ══ FILE LIST ══ */}
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          marginTop: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: 700,
            color: "#1F293B",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10B981, #059669)",
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
            }}
          />
          Pola PDF
        </h3>

        {downloads.length === 0 ? (
          <p
            style={{
              color: "#9CA3AF",
              fontSize: "0.85rem",
              textAlign: "center",
              padding: "1rem 0",
            }}
          >
            Belum ada file PDF.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {downloads.map((item, idx) => (
              <li
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  background: "rgba(255, 255, 255, 0.70)",
                  backdropFilter: "blur(6px)",
                  borderRadius: "10px",
                  border: "1px solid rgba(16, 185, 129, 0.10)",
                  gap: "1rem",
                  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1F293B" }}>
                      {item.filename}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "#9CA3AF" }}>
                      PDF
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.72rem",
                      color: "#9CA3AF",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #10B981, #059669)",
                        boxShadow: "0 1px 3px rgba(16, 185, 129, 0.2)",
                      }}
                    />
                    📁 {item.folder}
                  </div>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatSize(item.size)}
                  </span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "#9CA3AF",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(item.modified).toLocaleString("id-ID", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <button
                  onClick={() => handleDownload(item)}
                  style={{
                    padding: "0.5rem 0.9rem",
                    background:
                      "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                    transition: "transform 0.15s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 14px rgba(16, 185, 129, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow =
                      "0 2px 8px rgba(16, 185, 129, 0.25)";
                  }}
                >
                  Buka
                </button>

                <button
                  onClick={() => handleDelete(item)}
                  style={{
                    padding: "0.5rem 0.7rem",
                    background: "rgba(239, 68, 68, 0.10)",
                    border: "2px solid rgba(239, 68, 68, 0.20)",
                    borderRadius: "8px",
                    color: "#DC2626",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(239, 68, 68, 0.18)";
                    e.target.style.borderColor = "rgba(239, 68, 68, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(239, 68, 68, 0.10)";
                    e.target.style.borderColor = "rgba(239, 68, 68, 0.20)";
                  }}
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <footer
        style={{
          width: "100%",
          maxWidth: "640px",
          marginTop: "3rem",
          padding: "1.5rem 1.5rem",
          textAlign: "center",
          color: "#6B7280",
          fontSize: "0.8rem",
          borderTop: "1px solid rgba(16, 185, 129, 0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            fontWeight: 700,
            color: "#10B981",
            letterSpacing: "0.04em",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20" />
            <path d="M19 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
          </svg>
          rendidev
        </div>
        <p
          style={{ margin: "0.2rem 0 0", color: "#9CA3AF", fontSize: "0.7rem" }}
        >
          &copy; {new Date().getFullYear()} Rendidev — all rights reserved.
        </p>
      </footer>
    </div>
  );
}
