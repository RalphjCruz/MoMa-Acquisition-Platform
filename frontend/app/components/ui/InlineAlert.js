const toneMap = {
  success: "alert-success",
  error: "alert-error",
  warning: "alert-warning",
  info: "alert-info"
};

export default function InlineAlert({ message, tone = "info", className = "" }) {
  if (!message) {
    return null;
  }

  const toneClass = toneMap[tone] ?? toneMap.info;
  return (
    <div className={`alert ${toneClass} py-2 text-sm ${className}`.trim()} role="status">
      <span>{message}</span>
    </div>
  );
}
