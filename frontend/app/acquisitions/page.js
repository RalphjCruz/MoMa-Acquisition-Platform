"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import StickyHeader from "../components/StickyHeader";
import { apiBaseUrl, readErrorMessage } from "../lib/api";

const ACQUISITION_STATUS_OPTIONS = [
  "considering",
  "approved",
  "acquired",
  "rejected"
];

const emptyCreateAcquisitionForm = {
  userId: "",
  artworkId: "",
  status: "considering",
  proposedPrice: "",
  currency: "EUR",
  notes: ""
};

export default function AcquisitionsPage() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [acquisitions, setAcquisitions] = useState([]);
  const [acquisitionsLoading, setAcquisitionsLoading] = useState(false);
  const [acquisitionsError, setAcquisitionsError] = useState("");
  const [acquisitionActionError, setAcquisitionActionError] = useState("");
  const [acquisitionActionMessage, setAcquisitionActionMessage] = useState("");
  const [acquisitionForm, setAcquisitionForm] = useState(emptyCreateAcquisitionForm);
  const [creatingAcquisition, setCreatingAcquisition] = useState(false);
  const [updatingAcquisitionId, setUpdatingAcquisitionId] = useState("");
  const [deletingAcquisitionId, setDeletingAcquisitionId] = useState("");

  const acquisitionSummary = useMemo(() => {
    const totals = {
      considering: 0,
      approved: 0,
      acquired: 0,
      rejected: 0
    };

    acquisitions.forEach((acquisition) => {
      if (totals[acquisition.status] !== undefined) {
        totals[acquisition.status] += 1;
      }
    });

    return totals;
  }, [acquisitions]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/users?limit=100&sortBy=createdAt&order=desc`
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      const nextUsers = payload.data ?? [];
      setUsers(nextUsers);

      setAcquisitionForm((prev) => {
        if (prev.userId) {
          return prev;
        }
        return {
          ...prev,
          userId: nextUsers[0]?._id ?? ""
        };
      });
    } catch (err) {
      setUsersError(err.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchAcquisitions = useCallback(async () => {
    setAcquisitionsLoading(true);
    setAcquisitionsError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/acquisitions?limit=100&sortBy=createdAt&order=desc`
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
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAcquisitions();
  }, [fetchUsers, fetchAcquisitions]);

  const handleAcquisitionFormChange = (field, value) => {
    setAcquisitionForm((prev) => ({ ...prev, [field]: value }));
  };

  const createAcquisition = async (event) => {
    event.preventDefault();
    setAcquisitionActionError("");
    setAcquisitionActionMessage("");
    setCreatingAcquisition(true);

    try {
      const artworkId = Number.parseInt(acquisitionForm.artworkId, 10);
      if (!Number.isInteger(artworkId) || artworkId <= 0) {
        throw new Error("artworkId must be a positive numeric objectId.");
      }

      if (!acquisitionForm.userId) {
        throw new Error("Please select a user.");
      }

      const payload = {
        userId: acquisitionForm.userId,
        artworkId,
        status: acquisitionForm.status,
        currency: acquisitionForm.currency.trim() || "EUR",
        notes: acquisitionForm.notes.trim()
      };

      if (acquisitionForm.proposedPrice.trim() !== "") {
        payload.proposedPrice = Number(acquisitionForm.proposedPrice);
      }

      const response = await fetch(`${apiBaseUrl}/api/acquisitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setAcquisitionForm((prev) => ({
        ...emptyCreateAcquisitionForm,
        userId: prev.userId,
        currency: "EUR"
      }));
      setAcquisitionActionMessage("Acquisition created.");
      await fetchAcquisitions();
    } catch (err) {
      setAcquisitionActionError(err.message || "Failed to create acquisition.");
    } finally {
      setCreatingAcquisition(false);
    }
  };

  const updateAcquisitionStatus = async (acquisition, nextStatus) => {
    setAcquisitionActionError("");
    setAcquisitionActionMessage("");
    setUpdatingAcquisitionId(acquisition._id);

    try {
      const response = await fetch(`${apiBaseUrl}/api/acquisitions/${acquisition._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setAcquisitionActionMessage(`Acquisition status updated to ${nextStatus}.`);
      await fetchAcquisitions();
    } catch (err) {
      setAcquisitionActionError(err.message || "Failed to update acquisition.");
    } finally {
      setUpdatingAcquisitionId("");
    }
  };

  const removeAcquisition = async (acquisition) => {
    const confirmed = window.confirm(
      `Delete acquisition for "${acquisition.artworkId?.title ?? "artwork"}"?`
    );
    if (!confirmed) {
      return;
    }

    setAcquisitionActionError("");
    setAcquisitionActionMessage("");
    setDeletingAcquisitionId(acquisition._id);

    try {
      const response = await fetch(`${apiBaseUrl}/api/acquisitions/${acquisition._id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setAcquisitionActionMessage("Acquisition deleted.");
      await fetchAcquisitions();
    } catch (err) {
      setAcquisitionActionError(err.message || "Failed to delete acquisition.");
    } finally {
      setDeletingAcquisitionId("");
    }
  };

  return (
    <>
      <StickyHeader active="acquisitions" />
      <main className="page">
        <header className="hero">
          <div>
            <h1>Acquisition Tracking</h1>
            <p className="heroSubtitle">Purchase Workflow Module</p>
            <p className="subtext">
              Track approval and acquisition status for artwork purchase records.
            </p>
          </div>
        </header>

        <section className="summaryBar" aria-label="Acquisition summary">
          <article className="summaryCard">
            <p className="summaryLabel">Considering</p>
            <p className="summaryValue">{acquisitionSummary.considering}</p>
          </article>
          <article className="summaryCard">
            <p className="summaryLabel">Approved</p>
            <p className="summaryValue">{acquisitionSummary.approved}</p>
          </article>
          <article className="summaryCard">
            <p className="summaryLabel">Acquired</p>
            <p className="summaryValue">{acquisitionSummary.acquired}</p>
          </article>
          <article className="summaryCard">
            <p className="summaryLabel">Rejected</p>
            <p className="summaryValue">{acquisitionSummary.rejected}</p>
          </article>
        </section>

        <section id="acquisitions" className="modulePanel">
          <h2>Acquisition Tracking</h2>
          {users.length === 0 && !usersLoading && (
            <p className="emptyHint">
              Acquisition creation is disabled until at least one buyer exists.
            </p>
          )}
          <form className="moduleForm" onSubmit={createAcquisition}>
            <select
              required
              disabled={users.length === 0}
              value={acquisitionForm.userId}
              onChange={(event) =>
                handleAcquisitionFormChange("userId", event.target.value)
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
              type="number"
              min="1"
              required
              placeholder="artworkId (numeric ObjectID)"
              value={acquisitionForm.artworkId}
              onChange={(event) =>
                handleAcquisitionFormChange("artworkId", event.target.value)
              }
            />
            <select
              value={acquisitionForm.status}
              onChange={(event) =>
                handleAcquisitionFormChange("status", event.target.value)
              }
            >
              {ACQUISITION_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="proposedPrice"
              value={acquisitionForm.proposedPrice}
              onChange={(event) =>
                handleAcquisitionFormChange("proposedPrice", event.target.value)
              }
            />
            <input
              type="text"
              placeholder="currency"
              value={acquisitionForm.currency}
              onChange={(event) =>
                handleAcquisitionFormChange("currency", event.target.value)
              }
            />
            <input
              type="text"
              placeholder="notes"
              value={acquisitionForm.notes}
              onChange={(event) =>
                handleAcquisitionFormChange("notes", event.target.value)
              }
            />
            <button type="submit" disabled={creatingAcquisition || users.length === 0}>
              {creatingAcquisition ? "Creating..." : "Create Acquisition"}
            </button>
          </form>

          {usersLoading && <p>Loading users...</p>}
          {!usersLoading && usersError && <p className="error">{usersError}</p>}
          {acquisitionsLoading && <p>Loading acquisitions...</p>}
          {!acquisitionsLoading && acquisitionsError && (
            <p className="error">{acquisitionsError}</p>
          )}
          {!acquisitionsLoading && acquisitionActionError && (
            <p className="error">{acquisitionActionError}</p>
          )}
          {!acquisitionsLoading &&
            !acquisitionActionError &&
            acquisitionActionMessage && <p className="ok">{acquisitionActionMessage}</p>}
          {!acquisitionsLoading && acquisitions.length === 0 && (
            <p className="emptyHint">
              No acquisition records yet. Create one to start tracking approvals and
              purchases.
            </p>
          )}

          <div className="moduleList">
            {acquisitions.map((acquisition) => (
              <article key={acquisition._id} className="miniCard">
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`statusPill status-${acquisition.status}`}>
                    {acquisition.status}
                  </span>
                </p>
                <p>
                  <strong>User:</strong>{" "}
                  {acquisition.userId?.displayName ?? acquisition.userId}
                </p>
                <p>
                  <strong>Artwork:</strong>{" "}
                  {acquisition.artworkId?.title ?? acquisition.artworkId} (
                  {acquisition.artworkId?.objectId ?? "n/a"})
                </p>
                <p>
                  <strong>Proposed:</strong>{" "}
                  {acquisition.proposedPrice ?? "n/a"} {acquisition.currency ?? ""}
                </p>
                <div className="cardActions">
                  <button
                    type="button"
                    disabled={updatingAcquisitionId === acquisition._id}
                    onClick={() => updateAcquisitionStatus(acquisition, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    title={
                      acquisition.status !== "approved"
                        ? "Only approved acquisitions can be marked as acquired."
                        : "Mark this acquisition as acquired."
                    }
                    disabled={
                      updatingAcquisitionId === acquisition._id ||
                      acquisition.status !== "approved"
                    }
                    onClick={() => updateAcquisitionStatus(acquisition, "acquired")}
                  >
                    Mark Acquired
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={deletingAcquisitionId === acquisition._id}
                    onClick={() => removeAcquisition(acquisition)}
                  >
                    {deletingAcquisitionId === acquisition._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
