const joinClasses = (...parts) => parts.filter(Boolean).join(" ");

export default function SurfaceCard({
  title,
  subtitle,
  children,
  className = "",
  tone = "light",
  ...rest
}) {
  const toneClass =
    tone === "dark"
      ? "bg-neutral text-neutral-content"
      : "bg-base-100 text-base-content";
  const subtitleToneClass =
    tone === "dark" ? "text-neutral-content/70" : "text-base-content/70";

  return (
    <section
      className={joinClasses("surface-card section-enter p-4 md:p-6", toneClass, className)}
      {...rest}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h2 className="section-title">{title}</h2>}
          {subtitle && <p className={joinClasses("mt-1 text-sm", subtitleToneClass)}>{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
