import { createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { listItems, deleteItem } from "~/lib/api";
import MemoryCard from "~/components/MemoryCard";
import type { MemoryItem } from "~/types";

export default function MemoriesPage() {
  const nav = useNavigate();
  const [items, setItems] = createSignal<MemoryItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [filter, setFilter] = createSignal("");

  createEffect(() => {
    loadItems();
  });

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listItems();
      setItems(res.items);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this memory?")) return;
    try {
      await deleteItem(id);
      setItems(items().filter((i) => i.id !== id));
    } catch (e) {
      setError(String(e));
    }
  };

  const filteredItems = () => {
    const f = filter().toLowerCase();
    if (!f) return items();
    return items().filter(
      (i) => i.summary.toLowerCase().includes(f) || i.memory_type.toLowerCase().includes(f),
    );
  };

  return (
    <div>
      <div class="page-header">
        <h2>Memories</h2>
        <p>All stored memory items</p>
      </div>

      {error() && <div class="alert alert-error">{error()}</div>}

      <div class="flex gap-2 mb-4 items-center">
        <input
          class="form-input"
          type="text"
          placeholder="Filter by type or content..."
          value={filter()}
          onInput={(e) => setFilter(e.currentTarget.value)}
          style="max-width: 320px;"
        />
        <button class="btn btn-sm btn-secondary" onClick={loadItems}>
          Refresh
        </button>
        <button class="btn btn-sm btn-primary" onClick={() => nav("/memorize")}>
          + New
        </button>
      </div>

      {loading() ? (
        <div class="flex items-center gap-2 text-secondary" style="padding: 2rem;">
          <div class="spinner" /> Loading memories...
        </div>
      ) : filteredItems().length === 0 ? (
        <div class="empty-state">
          <p>{filter() ? "No memories match your filter." : "No memories stored yet."}</p>
          {!filter() && <button class="btn btn-primary" onClick={() => nav("/memorize")}>Create your first memory</button>}
        </div>
      ) : (
        <div class="grid grid-2">
          {filteredItems().map((item) => (
            <MemoryCard item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
