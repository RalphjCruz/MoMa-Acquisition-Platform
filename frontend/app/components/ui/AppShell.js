export default function AppShell({ children, fluid = false, className = "" }) {
  const shellClass = fluid ? "app-shell app-shell-fluid" : "app-shell";
  return <main className={`${shellClass} ${className}`.trim()}>{children}</main>;
}
