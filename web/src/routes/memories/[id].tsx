import { createEffect, createSignal } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { listItems, deleteItem } from "~/lib/api";
import StatusBadge from "~/components/StatusBadge";
import type { MemoryItem } from "~/types";

export default function MemoryDetailPage() {
  const params = useParams();
  const nav = useNavigate();
  const [item, setItem] = createSignal<MemoryItem | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    loadItem();
  });

  const loadItem = async () => {
    setLoading(true);
    try {
      const res = await listItems();
      const found = res.items.find((i) => i.id === params.id);
      setItem(found ?? null);
      if (!found) setError("Memory not found");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this memory?")) return;
    try {
      await deleteItem(params.id);
      nav("/memories");
    } catch (e) {
      setError(String(e));
    }
  };

  if (loading()) {
    return <div class="flex items-center gap-2 text-secondary" style="padding: 2rem;"><div class="spinner" /> Loading...</div>;
  }

  if (error() && !item()) {
    return <div class="alert alert-error">{error()}</div>;
  }

  const i = item()!;
  return (
    <div>
      <div class="page-header">
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost" onClick={() => nav("/memories")}>← Back</button>
          <h2>Memory Detail</h2>
        </div>
      </div>

      <div class="card" style="max-width: 720px;">
        <div class="flex justify-between items-center mb-4">
          <StatusBadge type={i.memory_type} />
          <div class="flex gap-2">
            <button class="btn btn-sm btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </div>

        <div class="text-sm" style="line-height: 2;">
          <div><span class="text-muted">ID:</span> <span style="font-family: var(--font-mono); font-size: 0.75rem;">{i.id}</span></div>
          <div><span class="text-muted">Type:</span> {i.memory_type}</div>
          <div><span class="text-muted">Created:</span> {new Date(i.created_at).toLocaleString()}</div>
          <div><span class="text-muted">Updated:</span> {new Date(i.updated_at).toLocaleString()}</div>
          {i.happened_at && <div><span class="text-muted">Happened At:</span> {new Date(i.happened_at).toLocaleString()}</div>}
        </div>

        <div style="margin-top: 1.5rem;">
          <div class="form-label">Content</div>
          <div class="text-sm" style="line-height: 1.7; color: var(--text-primary); background: var(--bg-elevated); padding: 1rem; border-radius: var(--radius-sm);">
            {i.summary}
          </div>
        </div>

        {i.resource_id && (
          <div class="mt-4 text-sm">
            <span class="text-muted">Resource ID:</span> {i.resource_id}
          </div>
        )}

        {Object.keys(i.extra).length > 0 && (
          <div class="mt-4">
            <div class="form-label">Extra Metadata</div>
            <pre style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-elevated); padding: 0.75rem; border-radius: var(--radius-sm); overflow-x: auto;">
              {JSON.stringify(i.extra, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
