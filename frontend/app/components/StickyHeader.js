"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";
import InlineAlert from "./ui/InlineAlert";
import { apiBaseUrl } from "../lib/api";

const CartIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7" />
    <circle cx="10" cy="19" r="1.2" />
    <circle cx="17" cy="19" r="1.2" />
  </svg>
);

export default function StickyHeader({ active }) {
  const { user, isAuthenticated, isManager, isBuyer, logout } = useAuth();
  const { items, totalItems, removeItem, clearCart, submitPendingPurchase } = useCart();
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [cartLoading, setCartLoading] = useState(false);

  const navItems = useMemo(() => {
    const base = [{ key: "artworks", href: "/", label: "Artwork Catalogue" }];
    if (isBuyer) {
      return [
        ...base,
        { key: "buyer-cart", href: "/buyer/cart", label: "My Cart" },
        { key: "buyer-requests", href: "/buyer/requests", label: "My Requests" }
      ];
    }
    if (isManager) {
      return [
        ...base,
        { key: "users", href: "/users", label: "User Profiles" },
        { key: "acquisitions", href: "/acquisitions", label: "Acquisition Tracking" }
      ];
    }
    return base;
  }, [isBuyer, isManager]);

  const handleSubmitPurchase = async () => {
    setCartMessage("");
    setCartError("");
    setCartLoading(true);

    try {
      const result = await submitPendingPurchase();
      const skippedCount = Array.isArray(result.skipped) ? result.skipped.length : 0;
      setCartMessage(
        `Pending purchase sent. Created ${result.created}, unchanged ${result.unchanged}, skipped ${skippedCount}.`
      );
    } catch (error) {
      setCartError(error.message || "Failed to submit purchase.");
    } finally {
      setCartLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/30 bg-base-100/88 shadow-sm backdrop-blur-md">
      <div className="navbar mx-auto max-w-6xl px-2 sm:px-3 md:px-4">
        <div className="navbar-start gap-2">
          <div className="dropdown md:hidden">
            <button type="button" tabIndex={0} className="btn btn-ghost btn-sm" aria-label="Menu">
              Menu
            </button>
            <ul
              tabIndex={0}
              className="menu dropdown-content z-[1000] mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow"
            >
              {navItems.map((item) => (
                <li key={`mobile-${item.key}`}>
                  <Link className={active === item.key ? "active" : ""} href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={`${apiBaseUrl}/about`} target="_blank" rel="noreferrer">
                  About This Page
                </a>
              </li>
            </ul>
          </div>
          <Link href="/" className="text-xs font-semibold tracking-wide md:text-sm">
            <span className="sm:hidden">MoMA Platform</span>
            <span className="hidden sm:inline">MoMA Acquisition Platform</span>
          </Link>
        </div>

        <div className="navbar-center hidden md:flex">
          <ul className="menu menu-horizontal gap-1 px-1">
            {navItems.map((item) => (
              <li key={item.key}>
                <Link className={active === item.key ? "active" : ""} href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={`${apiBaseUrl}/about`} target="_blank" rel="noreferrer">
                About This Page
              </a>
            </li>
          </ul>
        </div>

        <div className="navbar-end gap-2">
          {isBuyer && (
            <div className="dropdown dropdown-end">
              <button type="button" tabIndex={0} className="btn btn-sm gap-1">
                <CartIcon />
                <span>{totalItems}</span>
              </button>
              <div
                tabIndex={0}
                className="dropdown-content z-[1000] mt-2 w-[90vw] max-w-80 rounded-box border border-base-300 bg-base-100 p-3 shadow"
              >
                <p className="mb-2 font-medium">Buyer Cart</p>
                {items.length === 0 && <p className="text-sm">Cart is empty.</p>}
                {items.map((item) => (
                  <div key={item._id} className="mb-2 border-b border-base-200 pb-2">
                    <p className="text-sm">
                      {item.title} (#{item.objectId}) qty {item.quantity}
                    </p>
                    <button
                      type="button"
                      className="btn btn-sm btn-error mt-2"
                      onClick={() => removeItem(item._id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {items.length > 0 && (
                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      className="ui-btn-primary btn-sm"
                      disabled={cartLoading}
                      onClick={handleSubmitPurchase}
                    >
                      {cartLoading ? "Submitting..." : "Purchase (Pending)"}
                    </button>
                    <button type="button" className="ui-btn-secondary btn-sm" onClick={clearCart}>
                      Clear Cart
                    </button>
                  </div>
                )}
                <InlineAlert message={cartError} tone="error" className="mt-2" />
                <InlineAlert message={cartMessage} tone="success" className="mt-2" />
              </div>
            </div>
          )}

          {isAuthenticated ? (
            <>
              <span className="hidden text-xs md:inline">
                {user.displayName} ({user.role === "admin" ? "manager" : user.role})
              </span>
              <button type="button" className="ui-btn-secondary btn-sm" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="ui-btn-primary btn-sm" href="/auth?mode=login">
                Login
              </Link>
              <Link className="ui-btn-secondary btn-sm" href="/auth?mode=register">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
