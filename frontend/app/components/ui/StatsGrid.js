export default function StatsGrid({ items = [], className = "" }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div
      className={`stats stats-vertical w-full border border-base-300/60 bg-base-100/65 shadow-sm md:stats-horizontal ${className}`.trim()}
    >
      {items.map((item) => (
        <div key={item.label} className="stat">
          <div className="stat-title text-base-content/65">{item.label}</div>
          <div className="stat-value text-2xl text-black">{item.value}</div>
          {item.description && <div className="stat-desc">{item.description}</div>}
        </div>
      ))}
    </div>
  );
}
