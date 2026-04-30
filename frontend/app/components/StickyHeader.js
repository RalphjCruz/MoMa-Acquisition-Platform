"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";
import { apiBaseUrl } from "../lib/api";

export default function StickyHeader({ active }) {
  const { user, isAuthenticated, isManager, isBuyer, login, register, logout } =
    useAuth();
  const { items, totalItems, removeItem, clearCart, submitPendingPurchase } =
    useCart();

  const [mode, setMode] = useState("login");
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [cartLoading, setCartLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "buyer"
  });

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

  const openAuth = (nextMode) => {
    setMode(nextMode);
    setAuthError("");
    setShowAuth(true);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (mode === "login") {
        await login({ email: form.email.trim().toLowerCase(), password: form.password });
      } else {
        await register({
          displayName: form.displayName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role
        });
      }
      setShowAuth(false);
      setForm({ displayName: "", email: "", password: "", role: "buyer" });
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

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
    <header className="border-b border-base-300 bg-base-100">
      <div className="navbar mx-auto max-w-6xl px-4">
        <div className="navbar-start">
          <Link href="/" className="text-sm font-semibold">
            MoMA Acquisition Platform
          </Link>
        </div>

        <div className="navbar-center">
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
              <button type="button" tabIndex={0} className="btn btn-sm">
                Cart ({totalItems})
              </button>
              <div
                tabIndex={0}
                className="dropdown-content z-[1000] mt-2 w-80 rounded-box border border-base-300 bg-base-100 p-3 shadow"
              >
                <p className="mb-2 font-medium">Buyer Cart</p>
                {items.length === 0 && <p className="text-sm">Cart is empty.</p>}
                {items.map((item) => (
                  <div key={item._id} className="mb-2 border-b border-base-200 pb-2">
                    <p className="text-sm">
                      {item.title} (#{item.objectId}) qty {item.quantity}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="btn btn-xs btn-error"
                        onClick={() => removeItem(item._id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {items.length > 0 && (
                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={cartLoading}
                      onClick={handleSubmitPurchase}
                    >
                      {cartLoading ? "Submitting..." : "Purchase (Pending)"}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={clearCart}>
                      Clear Cart
                    </button>
                  </div>
                )}
                {cartError && <p className="mt-2 text-sm text-error">{cartError}</p>}
                {cartMessage && <p className="mt-2 text-sm text-success">{cartMessage}</p>}
              </div>
            </div>
          )}

          {isAuthenticated ? (
            <>
              <span className="hidden text-xs md:inline">
                {user.displayName} ({user.role === "admin" ? "manager" : user.role})
              </span>
              <button type="button" className="btn btn-sm" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-sm" onClick={() => openAuth("login")}>
                Login
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => openAuth("register")}
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>

      {showAuth && (
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <form className="grid gap-2 rounded-box border border-base-300 p-3" onSubmit={handleAuthSubmit}>
            <p className="font-medium">{mode === "login" ? "Login" : "Register"}</p>
            {mode === "register" && (
              <>
                <input
                  className="input input-bordered input-sm"
                  type="text"
                  required
                  placeholder="Display Name"
                  value={form.displayName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                />
                <select
                  className="select select-bordered select-sm"
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, role: event.target.value }))
                  }
                >
                  <option value="buyer">buyer</option>
                  <option value="manager">manager</option>
                </select>
              </>
            )}
            <input
              className="input input-bordered input-sm"
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <input
              className="input input-bordered input-sm"
              type="password"
              required
              minLength={8}
              placeholder="Password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
            {authError && <p className="text-sm text-error">{authError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn btn-sm btn-primary" disabled={authLoading}>
                {authLoading
                  ? "Submitting..."
                  : mode === "login"
                    ? "Login"
                    : "Register"}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowAuth(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
