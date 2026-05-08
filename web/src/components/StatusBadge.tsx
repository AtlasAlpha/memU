interface StatusBadgeProps {
  type: string;
}

const badgeClass = (type: string) => {
  const t = type.toLowerCase();
  if (["profile", "event", "knowledge", "behavior", "skill", "tool"].includes(t)) {
    return `badge badge-${t}`;
  }
  return "badge badge-profile";
};

export default function StatusBadge(props: StatusBadgeProps) {
  return <span class={badgeClass(props.type)}>{props.type}</span>;
}
