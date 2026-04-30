"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "../../components/AuthProvider";
import { useCart } from "../../components/CartProvider";
import StickyHeader from "../../components/StickyHeader";
import AppShell from "../../components/ui/AppShell";
import InlineAlert from "../../components/ui/InlineAlert";
import SurfaceCard from "../../components/ui/SurfaceCard";

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
      <AppShell>
        <SurfaceCard>
          <h1 className="text-3xl font-bold tracking-tight">My Cart</h1>
          {!ready && <p className="text-sm">Loading session...</p>}
          {ready && (!isAuthenticated || !isBuyer) && (
            <p className="text-sm text-warning">Buyer access required.</p>
          )}
        </SurfaceCard>

        {ready && isAuthenticated && isBuyer && (
          <>
            <SurfaceCard>
              <p className="text-sm">Items in cart: {totalItems}</p>
              <p className="mt-1 text-sm text-base-content/80">
                Rule: one of each artwork maximum.
              </p>
              <InlineAlert message={error} tone="error" className="mt-3" />
              <InlineAlert message={message} tone="success" className="mt-3" />
            </SurfaceCard>

            <SurfaceCard>
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
                  <article
                    key={item._id}
                    className="card surface-card surface-card-hover border border-base-200/70"
                  >
                    <div className="card-body p-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-sm text-base-content/80">Object ID: {item.objectId}</p>
                      <button
                        type="button"
                        className="btn btn-sm btn-error mt-2"
                        onClick={() => removeItem(item._id)}
                      >
                        Remove (returns to catalogue list)
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {items.length > 0 && (
                <div className="mt-4 flex gap-2">
                  <button type="button" className="ui-btn-primary" disabled={submitting} onClick={handleSubmitPurchase}>
                    {submitting ? "Submitting..." : "Purchase (Pending)"}
                  </button>
                  <button type="button" className="ui-btn-secondary" onClick={clearCart}>
                    Clear Cart
                  </button>
                </div>
              )}
            </SurfaceCard>
          </>
        )}
      </AppShell>
    </>
  );
}
