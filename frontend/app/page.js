"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 12;
const ROLE_OPTIONS = ["buyer", "manager", "admin"];
const ACQUISITION_STATUS_OPTIONS = [
  "considering",
  "approved",
  "acquired",
  "rejected"
];

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  return query.toString();
};

const readErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (payload?.error?.message) {
      return payload.error.message;
    }
  } catch (_error) {
    // ignore parse errors and fallback below
  }

  return `Request failed with status ${response.status}.`;
};

const emptyCreateArtworkForm = {
  objectId: "",
  title: "",
  artistDisplayName: "",
  department: "",
  classification: ""
};

const emptyCreateUserForm = {
  displayName: "",
  email: "",
  role: "buyer"
};

const emptyCreateAcquisitionForm = {
  userId: "",
  artworkId: "",
  status: "considering",
  proposedPrice: "",
  currency: "EUR",
  notes: ""
};

export default function Page() {
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [createForm, setCreateForm] = useState(emptyCreateArtworkForm);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    artistDisplayName: "",
    department: "",
    classification: "",
    isPublicDomain: false,
    tags: ""
  });
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userActionError, setUserActionError] = useState("");
  const [userActionMessage, setUserActionMessage] = useState("");
  const [userForm, setUserForm] = useState(emptyCreateUserForm);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");

  const [acquisitions, setAcquisitions] = useState([]);
  const [acquisitionsLoading, setAcquisitionsLoading] = useState(false);
  const [acquisitionsError, setAcquisitionsError] = useState("");
  const [acquisitionActionError, setAcquisitionActionError] = useState("");
  const [acquisitionActionMessage, setAcquisitionActionMessage] = useState("");
  const [acquisitionForm, setAcquisitionForm] = useState(emptyCreateAcquisitionForm);
  const [creatingAcquisition, setCreatingAcquisition] = useState(false);
  const [updatingAcquisitionId, setUpdatingAcquisitionId] = useState("");
  const [deletingAcquisitionId, setDeletingAcquisitionId] = useState("");

  const isFirstPage = pagination.page <= 1;
  const isLastPage = pagination.page >= pagination.totalPages;
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

  const queryString = useMemo(
    () =>
      buildQueryString({
        q: search,
        page,
        limit: PAGE_SIZE,
        sortBy,
        order
      }),
    [search, page, sortBy, order]
  );

  const fetchArtworks = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${apiBaseUrl}/api/artworks?${queryString}`, {
          signal
        });

        if (!response.ok) {
          throw new Error(`Backend responded with ${response.status}`);
        }

        const payload = await response.json();
        const nextPagination = payload.pagination ?? {
          page: 1,
          limit: PAGE_SIZE,
          totalItems: 0,
          totalPages: 1
        };

        if (nextPagination.totalPages < page) {
          setPage(nextPagination.totalPages);
          return;
        }

        setItems(payload.data ?? []);
        setPagination(nextPagination);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setError(
          "Failed to load artworks. Check backend is running and NEXT_PUBLIC_API_BASE_URL is correct."
        );
      } finally {
        setLoading(false);
      }
    },
    [page, queryString]
  );

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
    const controller = new AbortController();
    fetchArtworks(controller.signal);
    return () => controller.abort();
  }, [fetchArtworks]);

  useEffect(() => {
    fetchUsers();
    fetchAcquisitions();
  }, [fetchUsers, fetchAcquisitions]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setActionError("");
    setActionMessage("");
    setCreating(true);

    try {
      const parsedObjectId = Number.parseInt(createForm.objectId, 10);
      if (!Number.isInteger(parsedObjectId) || parsedObjectId <= 0) {
        throw new Error("objectId must be a positive integer.");
      }

      const payload = {
        objectId: parsedObjectId,
        title: createForm.title.trim(),
        artistDisplayName: createForm.artistDisplayName.trim(),
        department: createForm.department.trim(),
        classification: createForm.classification.trim()
      };

      const response = await fetch(`${apiBaseUrl}/api/artworks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setCreateForm(emptyCreateArtworkForm);
      setActionMessage("Artwork created.");
      setPage(1);
      await fetchArtworks();
    } catch (err) {
      setActionError(err.message || "Failed to create artwork.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (item) => {
    setActionError("");
    setActionMessage("");
    setEditingId(item._id);
    setEditForm({
      title: item.title || "",
      artistDisplayName: item.artistDisplayName || "",
      department: item.department || "",
      classification: item.classification || "",
      isPublicDomain: Boolean(item.isPublicDomain),
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : ""
    });
  };

  const cancelEdit = () => {
    setEditingId("");
    setUpdatingId("");
  };

  const saveEdit = async (item) => {
    setActionError("");
    setActionMessage("");
    setUpdatingId(item._id);

    try {
      const payload = {
        title: editForm.title.trim(),
        artistDisplayName: editForm.artistDisplayName.trim(),
        department: editForm.department.trim(),
        classification: editForm.classification.trim(),
        isPublicDomain: Boolean(editForm.isPublicDomain),
        tags: editForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      };

      const response = await fetch(`${apiBaseUrl}/api/artworks/${item.objectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setEditingId("");
      setActionMessage("Artwork updated.");
      await fetchArtworks();
    } catch (err) {
      setActionError(err.message || "Failed to update artwork.");
    } finally {
      setUpdatingId("");
    }
  };

  const removeArtwork = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.title}" (objectId ${item.objectId})?`
    );
    if (!confirmed) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setDeletingId(item._id);

    try {
      const response = await fetch(`${apiBaseUrl}/api/artworks/${item.objectId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setActionMessage("Artwork deleted.");
      await fetchArtworks();
    } catch (err) {
      setActionError(err.message || "Failed to delete artwork.");
    } finally {
      setDeletingId("");
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    setUserActionError("");
    setUserActionMessage("");
    setCreatingUser(true);

    try {
      const payload = {
        displayName: userForm.displayName.trim(),
        email: userForm.email.trim(),
        role: userForm.role
      };

      const response = await fetch(`${apiBaseUrl}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setUserForm(emptyCreateUserForm);
      setUserActionMessage("User created.");
      await fetchUsers();
    } catch (err) {
      setUserActionError(err.message || "Failed to create user.");
    } finally {
      setCreatingUser(false);
    }
  };

  const removeUser = async (user) => {
    const confirmed = window.confirm(`Delete user "${user.displayName}"?`);
    if (!confirmed) {
      return;
    }

    setUserActionError("");
    setUserActionMessage("");
    setDeletingUserId(user._id);

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${user._id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setUserActionMessage("User deleted.");
      await fetchUsers();
      await fetchAcquisitions();
    } catch (err) {
      setUserActionError(err.message || "Failed to delete user.");
    } finally {
      setDeletingUserId("");
    }
  };

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
      <header className="stickyHeader">
        <div className="stickyHeaderInner">
          <div className="stickyBrand">
            <p className="stickyKicker">Acquisition Section</p>
            <p className="stickyTitle">MoMA Acquisition Intelligence Platform</p>
          </div>
          <nav className="stickyNav" aria-label="Acquisition section navigation">
            <a href="#users">User Profiles</a>
            <a href="#acquisitions">Acquisition Tracking</a>
            <a href={`${apiBaseUrl}/about`} target="_blank" rel="noreferrer">
              About This Page
            </a>
          </nav>
        </div>
      </header>

      <main className="page">
        <header className="hero">
          <div>
            <h1>MoMA Acquisition Intelligence Platform</h1>
            <p className="heroSubtitle">Artwork Viewer</p>
            <p className="subtext">
              Simple frontend to validate backend REST services from any laptop.
            </p>
          </div>
        </header>

      <section className="summaryBar" aria-label="Platform summary">
        <article className="summaryCard">
          <p className="summaryLabel">Artworks</p>
          <p className="summaryValue">{pagination.totalItems}</p>
        </article>
        <article className="summaryCard">
          <p className="summaryLabel">Buyers</p>
          <p className="summaryValue">{users.length}</p>
        </article>
        <article className="summaryCard">
          <p className="summaryLabel">Acquired</p>
          <p className="summaryValue">{acquisitionSummary.acquired}</p>
        </article>
        <article className="summaryCard">
          <p className="summaryLabel">Pending Approval</p>
          <p className="summaryValue">{acquisitionSummary.considering}</p>
        </article>
      </section>

      <section id="artworks" className="controls">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={draftSearch}
            placeholder="Search title, artist, medium..."
            onChange={(event) => setDraftSearch(event.target.value)}
          />
          <button type="submit">Search</button>
          <button
            type="button"
            className="ghostButton"
            onClick={() => {
              setDraftSearch("");
              setSearch("");
              setPage(1);
            }}
          >
            Reset
          </button>
        </form>

        <div className="selects">
          <label>
            Sort
            <select
              value={sortBy}
              onChange={(event) => {
                setPage(1);
                setSortBy(event.target.value);
              }}
            >
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="dateAcquired">Date Acquired</option>
              <option value="createdAt">Created</option>
            </select>
          </label>

          <label>
            Order
            <select
              value={order}
              onChange={(event) => {
                setPage(1);
                setOrder(event.target.value);
              }}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>
      </section>

      <section className="createPanel">
        <h2>Quick Create Artwork</h2>
        <form className="createForm" onSubmit={handleCreate}>
          <input
            type="number"
            min="1"
            required
            placeholder="objectId (required)"
            value={createForm.objectId}
            onChange={(event) => handleCreateChange("objectId", event.target.value)}
          />
          <input
            type="text"
            required
            placeholder="title (required)"
            value={createForm.title}
            onChange={(event) => handleCreateChange("title", event.target.value)}
          />
          <input
            type="text"
            placeholder="artist"
            value={createForm.artistDisplayName}
            onChange={(event) =>
              handleCreateChange("artistDisplayName", event.target.value)
            }
          />
          <input
            type="text"
            placeholder="department"
            value={createForm.department}
            onChange={(event) => handleCreateChange("department", event.target.value)}
          />
          <input
            type="text"
            placeholder="classification"
            value={createForm.classification}
            onChange={(event) =>
              handleCreateChange("classification", event.target.value)
            }
          />
          <button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      </section>

      <section className="status" aria-live="polite">
        {loading && <p>Loading artworks...</p>}
        {!loading && error && <p className="error">{error}</p>}
        {!loading && actionError && <p className="error">{actionError}</p>}
        {!loading && !actionError && actionMessage && (
          <p className="ok">{actionMessage}</p>
        )}
        {!loading && !error && (
          <p>
            Showing page {pagination.page} of {pagination.totalPages} (
            {pagination.totalItems} total artworks)
          </p>
        )}
      </section>

      <section className="grid">
        {loading &&
          items.length === 0 &&
          Array.from({ length: 6 }).map((_, index) => (
            <article key={`skeleton-${index}`} className="card skeletonCard">
              <div className="skeletonLine skeletonTitle" />
              <div className="skeletonLine" />
              <div className="skeletonLine" />
              <div className="skeletonLine short" />
            </article>
          ))}
        {items.map((item) => (
          <article key={item._id} className="card">
            {editingId === item._id ? (
              <div className="editForm">
                <input
                  type="text"
                  value={editForm.title}
                  placeholder="Title"
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <input
                  type="text"
                  value={editForm.artistDisplayName}
                  placeholder="Artist"
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      artistDisplayName: event.target.value
                    }))
                  }
                />
                <input
                  type="text"
                  value={editForm.department}
                  placeholder="Department"
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      department: event.target.value
                    }))
                  }
                />
                <input
                  type="text"
                  value={editForm.classification}
                  placeholder="Classification"
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      classification: event.target.value
                    }))
                  }
                />
                <input
                  type="text"
                  value={editForm.tags}
                  placeholder="Tags (comma separated)"
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
                />
                <label className="checkboxLabel">
                  <input
                    type="checkbox"
                    checked={editForm.isPublicDomain}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        isPublicDomain: event.target.checked
                      }))
                    }
                  />
                  Public Domain
                </label>
                <div className="cardActions">
                  <button
                    type="button"
                    disabled={updatingId === item._id}
                    onClick={() => saveEdit(item)}
                  >
                    {updatingId === item._id ? "Saving..." : "Save"}
                  </button>
                  <button type="button" className="ghost" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2>{item.title || "Untitled"}</h2>
                <p>
                  <strong>Artist:</strong> {item.artistDisplayName || "Unknown Artist"}
                </p>
                <p>
                  <strong>Department:</strong> {item.department || "Unknown"}
                </p>
                <p>
                  <strong>Classification:</strong> {item.classification || "Unknown"}
                </p>
                <p>
                  <strong>Object ID:</strong> {item.objectId}
                </p>
                <div className="cardActions">
                  <button type="button" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={deletingId === item._id}
                    onClick={() => removeArtwork(item)}
                  >
                    {deletingId === item._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </section>

      {!loading && !error && items.length === 0 && (
        <section className="empty">
          <p>No artworks matched your query.</p>
        </section>
      )}

      <section className="pagination">
        <button
          type="button"
          disabled={isFirstPage || loading}
          onClick={() => setPage(1)}
        >
          First
        </button>
        <button
          type="button"
          disabled={isFirstPage || loading}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} / {pagination.totalPages}
        </span>
        <button
          type="button"
          disabled={isLastPage || loading}
          onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
        >
          Next
        </button>
        <button
          type="button"
          disabled={isLastPage || loading}
          onClick={() => setPage(pagination.totalPages)}
        >
          Last
        </button>
      </section>

      <section id="users" className="modulePanel">
        <h2>User Profiles (No Login)</h2>
        <form className="moduleForm" onSubmit={createUser}>
          <input
            type="text"
            required
            placeholder="displayName"
            value={userForm.displayName}
            onChange={(event) =>
              setUserForm((prev) => ({ ...prev, displayName: event.target.value }))
            }
          />
          <input
            type="email"
            required
            placeholder="email"
            value={userForm.email}
            onChange={(event) =>
              setUserForm((prev) => ({ ...prev, email: event.target.value }))
            }
          />
          <select
            value={userForm.role}
            onChange={(event) =>
              setUserForm((prev) => ({ ...prev, role: event.target.value }))
            }
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit" disabled={creatingUser}>
            {creatingUser ? "Creating..." : "Create User"}
          </button>
        </form>
        {usersLoading && <p>Loading users...</p>}
        {!usersLoading && usersError && <p className="error">{usersError}</p>}
        {!usersLoading && userActionError && <p className="error">{userActionError}</p>}
        {!usersLoading && !userActionError && userActionMessage && (
          <p className="ok">{userActionMessage}</p>
        )}
        {!usersLoading && users.length === 0 && (
          <p className="emptyHint">
            No buyers yet. Create one buyer first before creating acquisitions.
          </p>
        )}

        <div className="moduleList">
          {users.map((user) => (
            <article key={user._id} className="miniCard">
              <p>
                <strong>{user.displayName}</strong> ({user.role})
              </p>
              <p>{user.email}</p>
              <button
                type="button"
                className="danger"
                disabled={deletingUserId === user._id}
                onClick={() => removeUser(user)}
              >
                {deletingUserId === user._id ? "Deleting..." : "Delete User"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="acquisitions" className="modulePanel">
        <h2>Acquisition Tracking</h2>
        {users.length === 0 && (
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
        {acquisitionsLoading && <p>Loading acquisitions...</p>}
        {!acquisitionsLoading && acquisitionsError && (
          <p className="error">{acquisitionsError}</p>
        )}
        {!acquisitionsLoading && acquisitionActionError && (
          <p className="error">{acquisitionActionError}</p>
        )}
        {!acquisitionsLoading && !acquisitionActionError && acquisitionActionMessage && (
          <p className="ok">{acquisitionActionMessage}</p>
        )}
        {!acquisitionsLoading && acquisitions.length === 0 && (
          <p className="emptyHint">
            No acquisition records yet. Create one to start tracking approvals and purchases.
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
                  {deletingAcquisitionId === acquisition._id
                    ? "Deleting..."
                    : "Delete"}
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
