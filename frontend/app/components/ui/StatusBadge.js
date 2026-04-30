const labelMap = {
  pending: "badge-warning",
  approved: "badge-info",
  acquired: "badge-success",
  rejected: "badge-error"
};

export default function StatusBadge({ status }) {
  const normalized = String(status ?? "pending").toLowerCase();
  const badgeClass = labelMap[normalized] ?? "badge-ghost";

  return <span className={`badge ${badgeClass} badge-sm capitalize`}>{normalized}</span>;
}
