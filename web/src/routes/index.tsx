import { createEffect, createSignal, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { health, getConfig, listItems, listCategories } from "~/lib/api";
import type { HealthStatus, ServerConfig, MemoryItem, MemoryCategory } from "~/types";

export default function Dashboard() {
  const nav = useNavigate();
  const [healthStatus, setHealthStatus] = createSignal<HealthStatus | null>(null);
  const [config, setConfig] = createSignal<ServerConfig | null>(null);
  const [items, setItems] = createSignal<MemoryItem[]>([]);
  const [categories, setCategories] = createSignal<MemoryCategory[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  let intervalId: ReturnType<typeof setInterval> | undefined;

  createEffect(() => {
    const fetchData = async () => {
      try {
        const [h, c, i, cats] = await Promise.all([
          health(),
          getConfig(),
          listItems(),
          listCategories(),
        ]);
        setHealthStatus(h);
        setConfig(c);
        setItems(i.items);
        setCategories(cats.categories);
        setError(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    intervalId = setInterval(fetchData, 15000);
    onCleanup(() => clearInterval(intervalId));
  });

  const typeCounts = () => {
    const counts: Record<string, number> = {};
    items().forEach((item) => {
      counts[item.memory_type] = (counts[item.memory_type] || 0) + 1;
    });
    return counts;
  };

  return (
    <div>
      <div class="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your memU memory system</p>
      </div>

      {loading() && (
        <div class="flex items-center gap-2 text-secondary" style="padding: 2rem;">
          <div class="spinner" /> Loading...
        </div>
      )}

      {error() && !loading() && (
        <div class="alert alert-error">
          <strong>Connection Error:</strong> {error()}
          <p class="text-sm mt-2">
            Make sure the memU server is running: <code>memu-server</code>
          </p>
        </div>
      )}

      {!loading() && !error() && (
        <>
          <div class="stats-grid">
            <div class="stat-card accent">
              <div class="stat-label">Memory Items</div>
              <div class="stat-value">{items().length}</div>
            </div>
            <div class="stat-card cyan">
              <div class="stat-label">Categories</div>
              <div class="stat-value">{categories().length}</div>
            </div>
            <div class="stat-card green">
              <div class="stat-label">LLM Profiles</div>
              <div class="stat-value">{config()?.llm_profiles.length ?? 0}</div>
            </div>
            <div class="stat-card orange">
              <div class="stat-label">Server Status</div>
              <div class="stat-value" style="font-size: 1.5rem;">
                {healthStatus()?.memory_service_initialized ? "Online" : "Offline"}
              </div>
            </div>
          </div>

          <div class="grid grid-2">
            <div class="card">
              <div class="card-header">
                <h3>Storage</h3>
              </div>
              <div class="text-sm" style="line-height: 2;">
                <div><span class="text-muted">Metadata Store:</span> {config()?.storage.metadata_store ?? "-"}</div>
                <div><span class="text-muted">Vector Index:</span> {config()?.storage.vector_index ?? "-"}</div>
                <div><span class="text-muted">Memory Types:</span> {config()?.memory_types.join(", ") ?? "-"}</div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3>Memory Distribution</h3>
              </div>
              {Object.keys(typeCounts()).length === 0 ? (
                <p class="text-muted text-sm">No memories stored yet.</p>
              ) : (
                <div class="text-sm" style="line-height: 2;">
                  {Object.entries(typeCounts()).map(([type, count]) => (
                    <div class="flex justify-between">
                      <span>{type}</span>
                      <span class="text-muted">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {items().length > 0 && (
            <div class="card mt-4">
              <div class="card-header">
                <h3>Recent Memories</h3>
                <button class="btn btn-sm btn-secondary" onClick={() => nav("/memories")}>View All</button>
              </div>
              <div style="max-height: 300px; overflow-y: auto;">
                {items().slice(-5).reverse().map((item) => (
                  <div class="flex justify-between items-center py-2" style="border-bottom: 1px solid var(--border);">
                    <div>
                      <span class={`badge badge-${item.memory_type}`} style="margin-right: 0.5rem;">
                        {item.memory_type}
                      </span>
                      <span class="text-sm">{item.summary.length > 80 ? item.summary.slice(0, 80) + "..." : item.summary}</span>
                    </div>
                    <span class="text-xs text-muted">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
