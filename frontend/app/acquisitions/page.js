"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../components/AuthProvider";
import StickyHeader from "../components/StickyHeader";
import { apiBaseUrl, getAuthHeaders, readErrorMessage } from "../lib/api";

const ACQUISITION_STATUS_OPTIONS = ["pending", "approved", "acquired", "rejected"];

const emptyCreateAcquisitionForm = {
  userId: "",
  artworkId: "",
  status: "pending",
  proposedPrice: "",
  currency: "EUR",
  notes: ""
};

export default function AcquisitionsPage() {
  const { token, ready, isAuthenticated, isManager } = useAuth();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [acquisitions, setAcquisitions] = useState([]);
  const [acquisitionsLoading, setAcquisitionsLoading] = useState(false);
  const [acquisitionsError, setAcquisitionsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [form, setForm] = useState(emptyCreateAcquisitionForm);
  const [creating, setCreating] = useState(false);
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
      setForm((prev) => (prev.userId ? prev : { ...prev, userId: nextUsers[0]?._id ?? "" }));
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
        `${apiBaseUrl}/api/acquisitions?limit=100&sortBy=createdAt&order=desc`,
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

  const createAcquisition = async (event) => {
    event.preventDefault();
    setActionError("");
    setActionMessage("");
    setCreating(true);

    try {
      const artworkId = Number.parseInt(form.artworkId, 10);
      if (!Number.isInteger(artworkId) || artworkId <= 0) {
        throw new Error("artworkId must be a positive numeric objectId.");
      }
      if (!form.userId) {
        throw new Error("Please select a user.");
      }

      const payload = {
        userId: form.userId,
        artworkId,
        status: form.status,
        currency: form.currency.trim() || "EUR",
        notes: form.notes.trim()
      };
      if (form.proposedPrice.trim() !== "") {
        payload.proposedPrice = Number(form.proposedPrice);
      }

      const response = await fetch(`${apiBaseUrl}/api/acquisitions`, {
        method: "POST",
        headers: getAuthHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setForm((prev) => ({
        ...emptyCreateAcquisitionForm,
        userId: prev.userId,
        currency: "EUR"
      }));
      setActionMessage("Acquisition created.");
      await fetchAcquisitions();
    } catch (err) {
      setActionError(err.message || "Failed to create acquisition.");
    } finally {
      setCreating(false);
    }
  };

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
      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <section className="rounded-box border border-base-300 bg-base-100 p-4">
          <h1 className="text-2xl font-bold">Acquisition Tracking</h1>
          {!ready && <p className="text-sm">Loading session...</p>}
          {ready && (!isAuthenticated || !isManager) && (
            <p className="text-sm text-warning">Manager access required.</p>
          )}
        </section>

        {ready && isAuthenticated && isManager && (
          <>
            <section className="rounded-box border border-base-300 bg-base-100 p-4">
              <p className="text-sm">
                Pending: {acquisitionSummary.pending} | Approved: {acquisitionSummary.approved} |
                Acquired: {acquisitionSummary.acquired} | Rejected:{" "}
                {acquisitionSummary.rejected}
              </p>
            </section>

            <section className="rounded-box border border-base-300 bg-base-100 p-4">
              <h2 className="mb-2 font-semibold">Create Acquisition</h2>
              <form className="grid gap-2 md:grid-cols-3" onSubmit={createAcquisition}>
                <select
                  className="select select-bordered select-sm"
                  required
                  disabled={users.length === 0}
                  value={form.userId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, userId: event.target.value }))
                  }
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.displayName} ({user.email})
                    </option>
                  ))}
                </select>
                <input
                  className="input input-bordered input-sm"
                  type="number"
                  min="1"
                  required
                  placeholder="artworkId"
                  value={form.artworkId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, artworkId: event.target.value }))
                  }
                />
                <select
                  className="select select-bordered select-sm"
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  {ACQUISITION_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  className="input input-bordered input-sm"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="proposedPrice"
                  value={form.proposedPrice}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, proposedPrice: event.target.value }))
                  }
                />
                <input
                  className="input input-bordered input-sm"
                  type="text"
                  placeholder="currency"
                  value={form.currency}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, currency: event.target.value }))
                  }
                />
                <input
                  className="input input-bordered input-sm"
                  type="text"
                  placeholder="notes"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
                <button className="btn btn-sm btn-primary" type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Acquisition"}
                </button>
              </form>
              {actionError && <p className="mt-2 text-sm text-error">{actionError}</p>}
              {actionMessage && <p className="mt-2 text-sm text-success">{actionMessage}</p>}
              {usersLoading && <p className="mt-2 text-sm">Loading users...</p>}
              {usersError && <p className="mt-2 text-sm text-error">{usersError}</p>}
            </section>

            <section className="rounded-box border border-base-300 bg-base-100 p-4">
              <h2 className="mb-2 font-semibold">Acquisitions</h2>
              {acquisitionsLoading && <p className="text-sm">Loading acquisitions...</p>}
              {acquisitionsError && <p className="text-sm text-error">{acquisitionsError}</p>}
              {!acquisitionsLoading && acquisitions.length === 0 && (
                <p className="text-sm">No acquisition records yet.</p>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                {acquisitions.map((acquisition) => {
                  const normalizedStatus =
                    acquisition.status === "considering" ? "pending" : acquisition.status;
                  return (
                    <article key={acquisition._id} className="rounded-box border border-base-300 p-3">
                      <p className="text-sm">
                        <strong>Status:</strong> {normalizedStatus}
                      </p>
                      <p className="text-sm">
                        <strong>User:</strong>{" "}
                        {acquisition.userId?.displayName ?? acquisition.userId}
                      </p>
                      <p className="text-sm">
                        <strong>Artwork:</strong>{" "}
                        {acquisition.artworkId?.title ?? acquisition.artworkId} (
                        {acquisition.artworkId?.objectId ?? "n/a"})
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {normalizedStatus !== "approved" &&
                          normalizedStatus !== "acquired" && (
                            <button
                              type="button"
                              className="btn btn-xs"
                              disabled={updatingId === acquisition._id}
                              onClick={() => updateStatus(acquisition, "approved")}
                            >
                              Approve
                            </button>
                          )}
                        <button
                          type="button"
                          className="btn btn-xs"
                          disabled={
                            updatingId === acquisition._id || normalizedStatus !== "approved"
                          }
                          onClick={() => updateStatus(acquisition, "acquired")}
                        >
                          Mark Acquired
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-error"
                          disabled={deletingId === acquisition._id}
                          onClick={() => removeAcquisition(acquisition)}
                        >
                          {deletingId === acquisition._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
