import Link from "next/link";

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer footer-center border-t border-black/10 bg-[#E6DFD2] p-4 text-base-content sm:p-6">
      <aside className="space-y-1">
        <p className="text-base font-semibold">MoMAFlow</p>
        <p className="text-sm text-base-content/75">Simple role-based acquisition workflow.</p>
      </aside>
      <nav className="grid grid-flow-col gap-4 text-sm">
        <Link className="link link-hover" href="/">
          Catalogue
        </Link>
        <Link className="link link-hover" href="/auth?mode=login">
          Login
        </Link>
        <Link className="link link-hover" href="/auth?mode=register">
          Register
        </Link>
      </nav>
      <p className="text-xs text-base-content/70">(c) {year} AppDev Project</p>
    </footer>
  );
}
