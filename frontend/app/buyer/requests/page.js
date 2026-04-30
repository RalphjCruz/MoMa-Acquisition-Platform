"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/AuthProvider";
import StickyHeader from "../../components/StickyHeader";
import AppShell from "../../components/ui/AppShell";
import InlineAlert from "../../components/ui/InlineAlert";
import RequestSteps from "../../components/ui/RequestSteps";
import StatusBadge from "../../components/ui/StatusBadge";
import SurfaceCard from "../../components/ui/SurfaceCard";
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
      <AppShell>
        <SurfaceCard>
          <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
          {!ready && <p className="text-sm">Loading session...</p>}
          {ready && (!isAuthenticated || !isBuyer) && (
            <p className="text-sm text-warning">Buyer access required.</p>
          )}
        </SurfaceCard>

        {ready && isAuthenticated && isBuyer && (
          <SurfaceCard>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-base-content/80">
                Track manager decisions. Approved items are shown here.
              </p>
              <button type="button" className="ui-btn-secondary btn-sm" onClick={fetchRequests} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <InlineAlert message={error} tone="error" className="mb-2" />
            {!loading && normalizedRequests.length === 0 && (
              <p className="text-sm">No requests yet.</p>
            )}

            <div className="grid gap-2 md:grid-cols-2">
              {normalizedRequests.map((request) => (
                <article
                  key={request._id}
                  className="card surface-card surface-card-hover border border-base-200/70"
                >
                  <div className="card-body p-3">
                    <p className="text-sm">
                      <strong>Status:</strong> <StatusBadge status={request.status} />
                    </p>
                    <RequestSteps status={request.status} />
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
                  </div>
                </article>
              ))}
            </div>
          </SurfaceCard>
        )}
      </AppShell>
    </>
  );
}
