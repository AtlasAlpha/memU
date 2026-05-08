import { createSignal } from "solid-js";
import { retrieve } from "~/lib/api";
import MemoryCard from "~/components/MemoryCard";
import StatusBadge from "~/components/StatusBadge";
import type { MemoryItem, MemoryCategory, RetrieveResult } from "~/types";

export default function RetrievePage() {
  const [query, setQuery] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [result, setResult] = createSignal<RetrieveResult | null>(null);

  const handleSearch = async (e: Event) => {
    e.preventDefault();
    if (!query().trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await retrieve([{ role: "user", content: query().trim() }]);
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div class="page-header">
        <h2>Retrieve</h2>
        <p>Search your memory store</p>
      </div>

      {error() && <div class="alert alert-error">{error()}</div>}

      <div class="card" style="max-width: 640px; margin-bottom: 2rem;">
        <form onSubmit={handleSearch}>
          <div class="form-group">
            <label class="form-label" for="query">Search Query</label>
            <input
              id="query"
              class="form-input"
              type="text"
              placeholder="What are you looking for?"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              required
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" disabled={loading() || !query().trim()}>
              {loading() ? <span class="spinner" style="margin-right: 0.5rem;" /> : "Search"}
            </button>
          </div>
        </form>
      </div>

      {result() && (
        <div>
          {result()!.needs_retrieval === false && (
            <div class="alert alert-info">No retrieval needed for this query.</div>
          )}

          {result()!.rewritten_query !== result()!.original_query && (
            <div class="text-sm text-secondary mb-2">
              Rewritten query: <span style="color: var(--accent);">{result()!.rewritten_query}</span>
            </div>
          )}

          {result()!.categories.length > 0 && (
            <div class="mb-4">
              <h3 class="text-sm text-secondary mb-2">Categories ({result()!.categories.length})</h3>
              <div class="grid grid-3">
                {result()!.categories.map((cat: MemoryCategory) => (
                  <div class="result-card">
                    <h4 style="font-weight: 600; margin-bottom: 0.25rem;">{cat.name}</h4>
                    <p class="text-sm text-secondary">{cat.summary || cat.description}</p>
                    {cat.score !== undefined && (
                      <span class="text-xs text-muted mt-2">score: {cat.score.toFixed(3)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result()!.items.length > 0 && (
            <div class="mb-4">
              <h3 class="text-sm text-secondary mb-2">Memories ({result()!.items.length})</h3>
              <div class="grid grid-2">
                {result()!.items.map((item: MemoryItem) => (
                  <MemoryCard item={item} />
                ))}
              </div>
            </div>
          )}

          {result()!.resources.length > 0 && (
            <div>
              <h3 class="text-sm text-secondary mb-2">Resources ({result()!.resources.length})</h3>
              <div class="grid grid-3">
                {result()!.resources.map((res: any) => (
                  <div class="result-card">
                    <p class="text-sm">{res.url}</p>
                    <span class="text-xs text-muted">{res.modality}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result()!.needs_retrieval && !result()!.categories.length && !result()!.items.length && !result()!.resources.length && (
            <div class="empty-state">
              <p>No memories found for this query.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
