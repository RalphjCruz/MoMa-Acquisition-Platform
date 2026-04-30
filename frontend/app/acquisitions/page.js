"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../components/AuthProvider";
import StickyHeader from "../components/StickyHeader";
import AppShell from "../components/ui/AppShell";
import InlineAlert from "../components/ui/InlineAlert";
import StatsGrid from "../components/ui/StatsGrid";
import StatusBadge from "../components/ui/StatusBadge";
import SurfaceCard from "../components/ui/SurfaceCard";
import { apiBaseUrl, getAuthHeaders, readErrorMessage } from "../lib/api";

export default function AcquisitionsPage() {
  const { token, ready, isAuthenticated, isManager } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [acquisitions, setAcquisitions] = useState([]);
  const [acquisitionsLoading, setAcquisitionsLoading] = useState(false);
  const [acquisitionsError, setAcquisitionsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const acquisitionSummary = useMemo(() => {
    const totals = { pending: 0, approved: 0, acquired: 0, rejected: 0 };
    acquisitions.forEach((acq) => {
      const status = acq.status === "considering" ? "pending" : acq.status;
      if (totals[status] !== undefined) {
        totals[status] += 1;
      }
    });
    return totals;
  }, [acquisitions]);

  const selectedUser = useMemo(
    () => users.find((user) => user._id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const selectedUserAcquisitions = useMemo(() => {
    if (!selectedUserId) {
      return [];
    }
    return acquisitions.filter((acq) => (acq.userId?._id ?? "") === selectedUserId);
  }, [acquisitions, selectedUserId]);

  const selectedUserSummary = useMemo(() => {
    const totals = {
      pending: 0,
      approved: 0,
      acquired: 0,
      rejected: 0,
      requested: 0
    };

    selectedUserAcquisitions.forEach((acq) => {
      const status = acq.status === "considering" ? "pending" : acq.status;
      totals.requested += 1;
      if (totals[status] !== undefined) {
        totals[status] += 1;
      }
    });

    return totals;
  }, [selectedUserAcquisitions]);

  const fetchUsers = useCallback(async () => {
    if (!token) {
      return;
    }

    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/users?limit=100&sortBy=createdAt&order=desc`,
        { headers: getAuthHeaders(token) }
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      const nextUsers = payload.data ?? [];
      setUsers(nextUsers);

      setSelectedUserId((prev) => {
        if (prev && nextUsers.some((user) => user._id === prev)) {
          return prev;
        }
        return nextUsers[0]?._id ?? "";
      });
    } catch (err) {
      setUsersError(err.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  const fetchAcquisitions = useCallback(async () => {
    if (!token) {
      return;
    }

    setAcquisitionsLoading(true);
    setAcquisitionsError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/acquisitions?limit=200&sortBy=createdAt&order=desc`,
        { headers: getAuthHeaders(token) }
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      setAcquisitions(payload.data ?? []);
    } catch (err) {
      setAcquisitionsError(err.message || "Failed to load acquisitions.");
    } finally {
      setAcquisitionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready && isManager) {
      fetchUsers();
      fetchAcquisitions();
    }
  }, [ready, isManager, fetchUsers, fetchAcquisitions]);

  const updateStatus = async (acquisition, status) => {
    setActionError("");
    setActionMessage("");
    setUpdatingId(acquisition._id);
    try {
      const response = await fetch(`${apiBaseUrl}/api/acquisitions/${acquisition._id}`, {
        method: "PATCH",
        headers: getAuthHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setActionMessage(`Status updated to ${status}.`);
      await fetchAcquisitions();
    } catch (err) {
      setActionError(err.message || "Failed to update acquisition.");
    } finally {
      setUpdatingId("");
    }
  };

  const removeAcquisition = async (acquisition) => {
    if (
      !window.confirm(`Delete acquisition for "${acquisition.artworkId?.title ?? "artwork"}"?`)
    ) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setDeletingId(acquisition._id);
    try {
      const response = await fetch(`${apiBaseUrl}/api/acquisitions/${acquisition._id}`, {
        method: "DELETE",
        headers: getAuthHeaders(token)
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setActionMessage("Acquisition deleted.");
      await fetchAcquisitions();
    } catch (err) {
      setActionError(err.message || "Failed to delete acquisition.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <>
      <StickyHeader active="acquisitions" />
      <AppShell>
        <SurfaceCard>
          <h1 className="text-3xl font-bold tracking-tight">Acquisition Tracking</h1>
          {!ready && <p className="text-sm">Loading session...</p>}
          {ready && (!isAuthenticated || !isManager) && (
            <p className="text-sm text-warning">Manager access required.</p>
          )}
        </SurfaceCard>

        {ready && isAuthenticated && isManager && (
          <>
            <SurfaceCard>
              <StatsGrid
                items={[
                  { label: "Pending", value: acquisitionSummary.pending, tone: "warning" },
                  { label: "Approved", value: acquisitionSummary.approved, tone: "info" },
                  { label: "Acquired", value: acquisitionSummary.acquired, tone: "success" },
                  { label: "Rejected", value: acquisitionSummary.rejected, tone: "error" }
                ]}
              />
            </SurfaceCard>

            <SurfaceCard title="User Purchase Overview">
              <div className="grid gap-2 md:grid-cols-[minmax(280px,1fr),2fr] md:items-end">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Select user</span>
                  <select
                    className="select select-bordered ui-select"
                    disabled={users.length === 0}
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.displayName} ({user.email})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-sm">
                  {selectedUser ? (
                    <p>
                      Viewing purchases for <strong>{selectedUser.displayName}</strong> (
                      {selectedUser.email})
                    </p>
                  ) : (
                    <p>Select a user to view their requested and acquired artworks.</p>
                  )}
                </div>
              </div>

              {usersLoading && <p className="mt-3 text-sm">Loading users...</p>}
              <InlineAlert message={usersError} tone="error" className="mt-3" />

              <div className="mt-3">
                <StatsGrid
                  items={[
                    {
                      label: "Total Requested",
                      value: selectedUserSummary.requested,
                      tone: "primary"
                    },
                    { label: "Approved", value: selectedUserSummary.approved, tone: "info" },
                    { label: "Acquired", value: selectedUserSummary.acquired, tone: "success" },
                    { label: "Rejected", value: selectedUserSummary.rejected, tone: "error" }
                  ]}
                />
              </div>
              <p className="mt-2 text-sm">
                Total items purchased (acquired): <strong>{selectedUserSummary.acquired}</strong>
              </p>

              <InlineAlert message={actionError} tone="error" className="mt-3" />
              <InlineAlert message={actionMessage} tone="success" className="mt-3" />
            </SurfaceCard>

            <SurfaceCard title="Selected User Acquisition Records">
              {acquisitionsLoading && <p className="text-sm">Loading acquisitions...</p>}
              <InlineAlert message={acquisitionsError} tone="error" className="mb-3" />

              {!acquisitionsLoading && selectedUserId && selectedUserAcquisitions.length === 0 && (
                <p className="text-sm">No acquisition records for this user yet.</p>
              )}
              {!selectedUserId && (
                <p className="text-sm">Select a user above to view their acquisition records.</p>
              )}

              <div className="grid gap-2 md:grid-cols-2">
                {selectedUserAcquisitions.map((acquisition) => {
                  const normalizedStatus =
                    acquisition.status === "considering" ? "pending" : acquisition.status;
                  const canApprove =
                    normalizedStatus !== "approved" &&
                    normalizedStatus !== "acquired" &&
                    normalizedStatus !== "rejected";
                  const canAcquire = normalizedStatus === "approved";
                  const canReject = normalizedStatus === "pending";

                  return (
                    <article
                      key={acquisition._id}
                      className="card surface-card surface-card-hover border border-base-200/70"
                    >
                      <div className="card-body p-3">
                        <p className="text-sm">
                          <strong>Status:</strong> <StatusBadge status={normalizedStatus} />
                        </p>
                        <p className="text-sm">
                          <strong>Artwork:</strong>{" "}
                          {acquisition.artworkId?.title ?? acquisition.artworkId} (
                          {acquisition.artworkId?.objectId ?? "n/a"})
                        </p>
                        <p className="text-sm">
                          <strong>Artist:</strong> {acquisition.artworkId?.artistDisplayName ?? "n/a"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {canApprove && (
                            <button
                              type="button"
                              className="ui-btn-secondary btn-sm min-w-24"
                              disabled={updatingId === acquisition._id}
                              onClick={() => updateStatus(acquisition, "approved")}
                            >
                              Approve
                            </button>
                          )}

                          <button
                            type="button"
                            className="ui-btn-secondary btn-sm"
                            disabled={updatingId === acquisition._id || !canAcquire}
                            onClick={() => updateStatus(acquisition, "acquired")}
                          >
                            Mark Acquired
                          </button>

                          {canReject && (
                            <button
                              type="button"
                              className="btn btn-sm btn-error min-w-24"
                              disabled={updatingId === acquisition._id}
                              onClick={() => updateStatus(acquisition, "rejected")}
                            >
                              Reject
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={deletingId === acquisition._id}
                            onClick={() => removeAcquisition(acquisition)}
                          >
                            {deletingId === acquisition._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </SurfaceCard>
          </>
        )}
      </AppShell>
    </>
  );
}
