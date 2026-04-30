"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/AuthProvider";
import StickyHeader from "../../components/StickyHeader";
import { apiBaseUrl, getAuthHeaders, readErrorMessage } from "../../lib/api";

export default function BuyerRequestsPage() {
  const { ready, token, isAuthenticated, isBuyer } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!token || !isBuyer) {
      setRequests([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/acquisitions/my?limit=50&sortBy=createdAt&order=desc`,
        { headers: getAuthHeaders(token) }
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      setRequests(payload.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, [token, isBuyer]);

  useEffect(() => {
    if (ready) {
      fetchRequests();
    }
  }, [ready, fetchRequests]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = () => fetchRequests();
    window.addEventListener("buyer-purchase-submitted", handler);
    return () => window.removeEventListener("buyer-purchase-submitted", handler);
  }, [fetchRequests]);

  const normalizedRequests = useMemo(
    () =>
      requests.map((request) => ({
        ...request,
        status: request.status === "considering" ? "pending" : request.status
      })),
    [requests]
  );

  return (
    <>
      <StickyHeader active="buyer-requests" />
      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <section className="rounded-box border border-base-300 bg-base-100 p-4">
          <h1 className="text-2xl font-bold">My Requests</h1>
          {!ready && <p className="text-sm">Loading session...</p>}
          {ready && (!isAuthenticated || !isBuyer) && (
            <p className="text-sm text-warning">Buyer access required.</p>
          )}
        </section>

        {ready && isAuthenticated && isBuyer && (
          <section className="rounded-box border border-base-300 bg-base-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-base-content/80">
                Track manager decisions. Approved items are shown here.
              </p>
              <button
                type="button"
                className="btn btn-xs"
                onClick={fetchRequests}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}
            {!loading && normalizedRequests.length === 0 && (
              <p className="text-sm">No requests yet.</p>
            )}

            <div className="grid gap-2 md:grid-cols-2">
              {normalizedRequests.map((request) => (
                <article key={request._id} className="rounded-box border border-base-300 p-3">
                  <p className="text-sm">
                    <strong>Status:</strong> {request.status}
                  </p>
                  <p className="text-sm">
                    <strong>Artwork:</strong> {request.artworkId?.title ?? "Unknown"} (
                    {request.artworkId?.objectId ?? "n/a"})
                  </p>
                  <p className="text-sm">
                    <strong>Requested Qty:</strong> {request.requestedQuantity ?? 1}
                  </p>
                  <p className="text-sm">
                    <strong>Updated:</strong>{" "}
                    {request.updatedAt ? new Date(request.updatedAt).toLocaleString() : "n/a"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
