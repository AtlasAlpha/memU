import { createSignal } from "solid-js";
import { memorize } from "~/lib/api";

export default function MemorizePage() {
  const [content, setContent] = createSignal("");
  const [modality, setModality] = createSignal("text");
  const [userId, setUserId] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [result, setResult] = createSignal<{ status: string; items_created: number; categories: number } | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!content().trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await memorize(content().trim(), modality(), userId().trim() || undefined);
      setResult(res);
      if (res.status === "ok") {
        setContent("");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div class="page-header">
        <h2>Memorize</h2>
        <p>Store new information in long-term memory</p>
      </div>

      {error() && <div class="alert alert-error">{error()}</div>}

      {result() && (
        <div class="alert alert-success">
          Stored successfully — {result()!.items_created} items, {result()!.categories} categories
        </div>
      )}

      <div class="card" style="max-width: 640px;">
        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label class="form-label" for="content">Content</label>
            <textarea
              id="content"
              class="form-textarea"
              placeholder="What would you like memU to remember?"
              value={content()}
              onInput={(e) => setContent(e.currentTarget.value)}
              rows={6}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="modality">Modality</label>
            <select
              id="modality"
              class="form-select"
              value={modality()}
              onChange={(e) => setModality(e.currentTarget.value)}
            >
              <option value="text">Text</option>
              <option value="conversation">Conversation</option>
              <option value="document">Document</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="userId">User ID (optional)</label>
            <input
              id="userId"
              class="form-input"
              type="text"
              placeholder="default"
              value={userId()}
              onInput={(e) => setUserId(e.currentTarget.value)}
            />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" disabled={loading() || !content().trim()}>
              {loading() ? <span class="spinner" /> : "Memorize"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
