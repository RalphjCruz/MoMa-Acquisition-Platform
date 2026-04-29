import Link from "next/link";

import { apiBaseUrl } from "../lib/api";

const navItems = [
  { key: "artworks", href: "/", label: "Artwork Catalogue" },
  { key: "users", href: "/users#users", label: "User Profiles" },
  {
    key: "acquisitions",
    href: "/acquisitions#acquisitions",
    label: "Acquisition Tracking"
  }
];

export default function StickyHeader({ active }) {
  return (
    <header className="stickyHeader">
      <div className="stickyHeaderInner">
        <div className="stickyBrand">
          <p className="stickyKicker">Acquisition Section</p>
          <p className="stickyTitle">MoMA Acquisition Intelligence Platform</p>
        </div>
        <nav className="stickyNav" aria-label="Acquisition section navigation">
          {navItems.map((item) => (
            <Link
              key={item.key}
              className={`stickyNavLink ${active === item.key ? "active" : ""}`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
          <a
            className="stickyNavLink"
            href={`${apiBaseUrl}/about`}
            target="_blank"
            rel="noreferrer"
          >
            About This Page
          </a>
        </nav>
      </div>
    </header>
  );
}
