"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import StickyHeader from "./components/StickyHeader";
import { apiBaseUrl, buildQueryString, readErrorMessage } from "./lib/api";

const PAGE_SIZE = 12;

const emptyCreateArtworkForm = {
  objectId: "",
  title: "",
  artistDisplayName: "",
  department: "",
  classification: ""
};

export default function ArtworksPage() {
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

  const isFirstPage = pagination.page <= 1;
  const isLastPage = pagination.page >= pagination.totalPages;

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

  useEffect(() => {
    const controller = new AbortController();
    fetchArtworks(controller.signal);
    return () => controller.abort();
  }, [fetchArtworks]);

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

  return (
    <>
      <StickyHeader active="artworks" />
      <main className="page">
        <header className="hero">
          <div>
            <h1>Artwork Catalogue</h1>
            <p className="heroSubtitle">REST Testing Interface</p>
            <p className="subtext">
              Browse, create, update, and delete artworks from the MoMA subset.
            </p>
          </div>
        </header>

        <section className="summaryBar" aria-label="Artworks summary">
          <article className="summaryCard">
            <p className="summaryLabel">Total Artworks</p>
            <p className="summaryValue">{pagination.totalItems}</p>
          </article>
          <article className="summaryCard">
            <p className="summaryLabel">Current Page</p>
            <p className="summaryValue">{pagination.page}</p>
          </article>
          <article className="summaryCard">
            <p className="summaryLabel">Total Pages</p>
            <p className="summaryValue">{pagination.totalPages}</p>
          </article>
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

        <section id="artworks" className="controls">
          <div className="searchBlock">
            <form className="searchForm" onSubmit={handleSearch}>
              <input
                type="text"
                value={draftSearch}
                placeholder="Search title, artist, medium..."
                onChange={(event) => setDraftSearch(event.target.value)}
              />
              <div className="searchButtons">
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
              </div>
            </form>
          </div>

          <div className="sortControls">
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

        <section className="status" aria-live="polite">
          {loading && <p>Loading artworks...</p>}
          {!loading && error && <p className="error">{error}</p>}
          {!loading && actionError && <p className="error">{actionError}</p>}
          {!loading && !actionError && actionMessage && (
            <p className="ok">{actionMessage}</p>
          )}
          {!loading && !error && (
            <>
              <p>{pagination.totalItems} total artworks</p>
              <p className="statusPageSummary">
                Showing page {pagination.page} of {pagination.totalPages}
              </p>
            </>
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
                    <strong>Artist:</strong>{" "}
                    {item.artistDisplayName || "Unknown Artist"}
                  </p>
                  <p>
                    <strong>Department:</strong> {item.department || "Unknown"}
                  </p>
                  <p>
                    <strong>Classification:</strong>{" "}
                    {item.classification || "Unknown"}
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
      </main>
    </>
  );
}
