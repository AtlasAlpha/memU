import { createEffect, createSignal } from "solid-js";
import { listCategories } from "~/lib/api";
import type { MemoryCategory } from "~/types";

export default function CategoriesPage() {
  const [categories, setCategories] = createSignal<MemoryCategory[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    loadCategories();
  });

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCategories();
      setCategories(res.categories);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div class="page-header">
        <h2>Categories</h2>
        <p>Memory categories and their summaries</p>
      </div>

      {error() && <div class="alert alert-error">{error()}</div>}

      {loading() ? (
        <div class="flex items-center gap-2 text-secondary" style="padding: 2rem;">
          <div class="spinner" /> Loading categories...
        </div>
      ) : categories().length === 0 ? (
        <div class="empty-state">
          <p>No categories yet. Categories are created automatically when you store memories.</p>
        </div>
      ) : (
        <div class="grid grid-3">
          {categories().map((cat) => (
            <div class="card">
              <div class="card-header">
                <h3 style="text-transform: capitalize;">{cat.name.replace(/_/g, " ")}</h3>
              </div>
              {cat.description && <p class="text-sm text-secondary mb-2">{cat.description}</p>}
              {cat.summary ? (
                <p class="text-sm" style="color: var(--text-primary); line-height: 1.6;">
                  {cat.summary}
                </p>
              ) : (
                <p class="text-sm text-muted">No summary yet.</p>
              )}
              <div class="text-xs text-muted mt-2">
                Created: {new Date(cat.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
