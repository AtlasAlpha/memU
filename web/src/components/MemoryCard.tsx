import { useNavigate } from "@solidjs/router";
import StatusBadge from "./StatusBadge";
import type { MemoryItem } from "~/types";

interface MemoryCardProps {
  item: MemoryItem;
  onDelete?: (id: string) => void;
}

export default function MemoryCard(props: MemoryCardProps) {
  const nav = useNavigate();
  const { item } = props;

  const dateStr = () => {
    const d = new Date(item.created_at);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  return (
    <div class="result-card" onClick={() => nav(`/memories/${item.id}`)}>
      <div class="meta">
        <StatusBadge type={item.memory_type} />
        <span class="text-xs text-muted">{dateStr()}</span>
        {item.score !== undefined && (
          <span class="text-xs text-muted">score: {item.score.toFixed(2)}</span>
        )}
      </div>
      <div class="content">{item.summary}</div>
      {props.onDelete && (
        <div class="mt-2" onClick={(e) => { e.stopPropagation(); props.onDelete!(item.id); }}>
          <button class="btn btn-ghost btn-sm text-xs" style="color: var(--red);">Delete</button>
        </div>
      )}
    </div>
  );
}
