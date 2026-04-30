"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "../../components/AuthProvider";
import { useCart } from "../../components/CartProvider";
import StickyHeader from "../../components/StickyHeader";

export default function BuyerCartPage() {
  const { ready, isAuthenticated, isBuyer } = useAuth();
  const { items, totalItems, removeItem, clearCart, submitPendingPurchase } = useCart();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitPurchase = async () => {
    setMessage("");
    setError("");
    setSubmitting(true);
    try {
      const result = await submitPendingPurchase();
      const skippedCount = Array.isArray(result.skipped) ? result.skipped.length : 0;
      setMessage(
        `Pending purchase sent. Created ${result.created}, unchanged ${result.unchanged}, skipped ${skippedCount}.`
      );
    } catch (err) {
      setError(err.message || "Failed to submit purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <StickyHeader active="buyer-cart" />
      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <section className="rounded-box border border-base-300 bg-base-100 p-4">
          <h1 className="text-2xl font-bold">My Cart</h1>
          {!ready && <p className="text-sm">Loading session...</p>}
          {ready && (!isAuthenticated || !isBuyer) && (
            <p className="text-sm text-warning">Buyer access required.</p>
          )}
        </section>

        {ready && isAuthenticated && isBuyer && (
          <>
            <section className="rounded-box border border-base-300 bg-base-100 p-4">
              <p className="text-sm">Items in cart: {totalItems}</p>
              <p className="mt-1 text-sm text-base-content/80">
                Rule: one of each artwork maximum.
              </p>
              {error && <p className="mt-2 text-sm text-error">{error}</p>}
              {message && <p className="mt-2 text-sm text-success">{message}</p>}
            </section>

            <section className="rounded-box border border-base-300 bg-base-100 p-4">
              {items.length === 0 && (
                <p className="text-sm">
                  Cart is empty. Go back to{" "}
                  <Link className="link" href="/">
                    Artwork Catalogue
                  </Link>
                  .
                </p>
              )}

              <div className="grid gap-2 md:grid-cols-2">
                {items.map((item) => (
                  <article key={item._id} className="rounded-box border border-base-300 p-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-base-content/80">Object ID: {item.objectId}</p>
                    <button
                      type="button"
                      className="btn btn-xs btn-error mt-2"
                      onClick={() => removeItem(item._id)}
                    >
                      Remove (returns to catalogue list)
                    </button>
                  </article>
                ))}
              </div>

              {items.length > 0 && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={submitting}
                    onClick={handleSubmitPurchase}
                  >
                    {submitting ? "Submitting..." : "Purchase (Pending)"}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={clearCart}>
                    Clear Cart
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
