
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ArrowLeft
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  // ==========================================
  // ADMIN API HELPER
  // ==========================================
  // Every admin request includes the secret key.
  // This is only suitable for a controlled demo.
  async function apiRequest(
    endpoint,
    options = {},
    key = adminKey
  ) {
    const response = await fetch(`${API}${endpoint}`, {
      ...options,

      headers: {
        "Content-Type": "application/json",
        "x-admin-key": key,
        ...options.headers
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Request failed");
    }

    return result;
  }

  // ==========================================
  // LOAD FAQ AND ANALYTICS DATA
  // ==========================================

  async function loadData(key = adminKey) {
    const [docs, stats] = await Promise.all([
      apiRequest("/api/documents", {}, key),
      apiRequest("/api/analytics", {}, key)
    ]);

    setDocuments(docs);
    setAnalytics(stats);
  }

  // ==========================================
  // LOGIN FOR DEVELOPMENT
  // ==========================================

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      // Validate key by requesting admin-only data.
      await loadData(adminKey);

      setAuthenticated(true);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // ADD OR EDIT FAQ
  // ==========================================

  async function handleSave(event) {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      // Editing uses PUT, creating uses POST.
      const endpoint = editingId
        ? `/api/documents/${editingId}`
        : "/api/documents/upload";

      const method = editingId ? "PUT" : "POST";

      await apiRequest(endpoint, {
        method,

        body: JSON.stringify({
          title,
          content
        })
      });

      // Reset form after successful save.
      setEditingId(null);
      setTitle("");
      setContent("");

      await loadData();

      setNotice("FAQ saved successfully.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // PREPARE DOCUMENT FOR EDITING
  // ==========================================

  function startEdit(doc) {
    setEditingId(doc.id);
    setTitle(doc.title);
    setContent(doc.content || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  // ==========================================
  // DELETE FAQ
  // ==========================================

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Delete this FAQ and all associated chunks?"
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/api/documents/${id}`, {
        method: "DELETE"
      });

      await loadData();

      setNotice("FAQ deleted.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  // ==========================================
  // REGENERATE EMBEDDINGS
  // ==========================================

  async function handleReembed(id) {
    setLoading(true);

    try {
      await apiRequest(
        `/api/documents/${id}/reembed`,
        { method: "POST" }
      );

      await loadData();

      setNotice("FAQ embeddings regenerated.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // ADMIN LOGIN SCREEN
  // ==========================================

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-pink-50 to-violet-100 p-5">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <BookOpen
            size={32}
            className="mb-4 text-pink-600"
          />

          <h1 className="text-2xl font-bold">
            Safari Connect Admin
          </h1>

          <p className="mb-6 mt-2 text-sm text-slate-500">
            Enter the development administrator key.
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Admin API key"
              required
              className="w-full rounded-xl border p-3"
            />

            <button
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 shadow-md shadow-pink-300/50 p-3 text-white"
            >
              {loading ? "Checking..." : "Open Dashboard"}
            </button>
          </form>

          {notice && (
            <p className="mt-3 text-sm text-red-600">
              {notice}
            </p>
          )}

          <Link
            to="/"
            className="mt-5 block text-sm text-pink-600"
          >
            Back to Chat
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN DASHBOARD
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-pink-50 to-violet-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div>
            <h1 className="text-xl font-bold">
              Safari Connect Admin
            </h1>

            <p className="text-sm text-slate-500">
              Knowledge Base Management
            </p>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-pink-600"
          >
            <ArrowLeft size={16} />
            Back to Chat
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-5">
        {/* Dashboard summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "FAQ Documents",
              value: documents.length
            },
            {
              label: "Customer Questions",
              value: analytics?.total_questions ?? 0
            },
            {
              label: "Escalation Rate",
              value: `${analytics?.escalation_rate ?? 0}%`
            }
          ].map(item => (
            <div
              key={item.label}
              className="rounded-xl border bg-white p-5"
            >
              <p className="text-sm text-slate-500">
                {item.label}
              </p>

              <h2 className="mt-2 text-3xl font-bold text-violet-700">
                {item.value}
              </h2>
            </div>
          ))}
        </div>

        {/* FAQ creation and editing form */}
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border bg-white p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {editingId
              ? <Pencil size={19} />
              : <Plus size={19} />
            }

            {editingId ? "Edit FAQ" : "Add New FAQ"}
          </h2>

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="FAQ title"
            required
            className="w-full rounded-xl border p-3"
          />

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="FAQ content"
            rows={6}
            required
            className="w-full rounded-xl border p-3"
          />

          <div className="flex gap-3">
            <button
              disabled={loading}
              className="rounded-lg bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 shadow-md shadow-pink-300/50 px-5 py-3 text-sm text-white"
            >
              {loading ? "Processing..." : "Save and Embed"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setTitle("");
                  setContent("");
                }}
                className="rounded-lg border px-5 py-3 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {notice && (
          <p
            role="status"
            className="rounded-lg bg-pink-50 p-3 text-sm text-violet-700"
          >
            {notice}
          </p>
        )}

        {/* Existing FAQ list */}
        <section className="rounded-xl border bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              FAQ Documents
            </h2>

            <button
              onClick={async () => {
                try {
                  await loadData();
                } catch (error) {
                  setNotice(error.message);
                }
              }}
              className="flex items-center gap-2 text-sm text-pink-600"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <h3 className="font-medium">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-500">
                    {doc.chunk_count} chunks ·{" "}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(doc)}
                    className="rounded-lg border p-2 text-pink-600"
                    title="Edit FAQ"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleReembed(doc.id)}
                    disabled={loading}
                    className="rounded-lg border p-2 text-fuchsia-600"
                    title="Regenerate embeddings"
                  >
                    <RefreshCw size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="rounded-lg border p-2 text-red-600"
                    title="Delete FAQ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bonus analytics */}
        {analytics && (
          <section className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Conversation Analytics
            </h2>

            <p className="mb-5 text-sm text-slate-600">
              Average response time:{" "}
              {analytics.average_response_ms == null
                ? "Not available"
                : `${analytics.average_response_ms} ms`
              }
            </p>

            <h3 className="mb-3 font-medium">
              Most Common Topics
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(analytics.topics).map(
                ([topic, count]) => (
                  <div
                    key={topic}
                    className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"
                  >
                    <span className="capitalize">
                      {topic}
                    </span>

                    <strong>{count}</strong>
                  </div>
                )
              )}
            </div>

            <h3 className="mb-3 mt-6 font-medium">
              Recent Questions
            </h3>

            {analytics.recent_questions.map((question, index) => (
              <p
                key={index}
                className="border-t py-3 text-sm"
              >
                {question.content}
              </p>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
