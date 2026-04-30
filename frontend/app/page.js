"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "./components/AuthProvider";
import { useCart } from "./components/CartProvider";
import StickyHeader from "./components/StickyHeader";
import {
  apiBaseUrl,
  buildQueryString,
  getAuthHeaders,
  readErrorMessage
} from "./lib/api";

const PAGE_SIZE = 12;

const emptyCreateArtworkForm = {
  objectId: "",
  title: "",
  artistDisplayName: "",
  department: "",
  classification: ""
};

export default function ArtworksPage() {
  const { ready, token, isBuyer, isManager, isAuthenticated } = useAuth();
  const { addItem, hasItem, totalItems } = useCart();

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
  const [requestArtworkIds, setRequestArtworkIds] = useState(new Set());


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

  const visibleItems = useMemo(() => {
    if (!isBuyer) {
      return items;
    }
    return items.filter((item) => !hasItem(item._id) && !requestArtworkIds.has(item._id));
  }, [isBuyer, items, hasItem, requestArtworkIds]);

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

        setItems(payload.data ?? []);
        setPagination(nextPagination);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            "Failed to load artworks. Check backend is running and NEXT_PUBLIC_API_BASE_URL is correct."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [queryString]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchArtworks(controller.signal);
    return () => controller.abort();
  }, [fetchArtworks]);

  const fetchBuyerRequestArtworkIds = useCallback(async () => {
    if (!isBuyer || !token) {
      setRequestArtworkIds(new Set());
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/acquisitions/my?limit=500&sortBy=createdAt&order=desc`,
        { headers: getAuthHeaders(token) }
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      const ids = new Set(
        (payload.data ?? [])
          .map((request) => request?.artworkId?._id)
          .filter(Boolean)
      );
      setRequestArtworkIds(ids);
    } catch (_error) {
      // silent fallback keeps catalogue usable even if requests fail to load
    }
  }, [isBuyer, token]);

  useEffect(() => {
    if (ready) {
      fetchBuyerRequestArtworkIds();
    }
  }, [ready, fetchBuyerRequestArtworkIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = () => fetchBuyerRequestArtworkIds();
    window.addEventListener("buyer-purchase-submitted", handler);
    return () => window.removeEventListener("buyer-purchase-submitted", handler);
  }, [fetchBuyerRequestArtworkIds]);


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
        headers: getAuthHeaders(token, { "Content-Type": "application/json" }),
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
        headers: getAuthHeaders(token, { "Content-Type": "application/json" }),
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
    if (!window.confirm(`Delete "${item.title}" (objectId ${item.objectId})?`)) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setDeletingId(item._id);

    try {
      const response = await fetch(`${apiBaseUrl}/api/artworks/${item.objectId}`, {
        method: "DELETE",
        headers: getAuthHeaders(token)
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
      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <section className="rounded-box border border-base-300 bg-base-100 p-4">
          <h1 className="text-2xl font-bold">Artwork Catalogue</h1>
          <p className="text-sm text-base-content/80">
            Managers can edit/remove artworks. Buyers can add artworks to cart.
          </p>
          {ready && isBuyer && <p className="mt-2 text-sm">Cart items: {totalItems}</p>}
          {ready && !isAuthenticated && (
            <p className="mt-2 text-sm">Login as buyer or manager to unlock actions.</p>
          )}
          {actionError && <p className="mt-2 text-sm text-error">{actionError}</p>}
          {actionMessage && <p className="mt-2 text-sm text-success">{actionMessage}</p>}
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </section>

        {isManager && (
          <section className="rounded-box border border-base-300 bg-base-100 p-4">
            <h2 className="mb-2 font-semibold">Create Artwork</h2>
            <form className="grid gap-2 md:grid-cols-3" onSubmit={handleCreate}>
              <input
                className="input input-bordered input-sm"
                type="number"
                min="1"
                required
                placeholder="objectId"
                value={createForm.objectId}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, objectId: event.target.value }))
                }
              />
              <input
                className="input input-bordered input-sm"
                type="text"
                required
                placeholder="title"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
              <input
                className="input input-bordered input-sm"
                type="text"
                placeholder="artist"
                value={createForm.artistDisplayName}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    artistDisplayName: event.target.value
                  }))
                }
              />
              <input
                className="input input-bordered input-sm"
                type="text"
                placeholder="department"
                value={createForm.department}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, department: event.target.value }))
                }
              />
              <input
                className="input input-bordered input-sm"
                type="text"
                placeholder="classification"
                value={createForm.classification}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, classification: event.target.value }))
                }
              />
              <button className="btn btn-sm btn-primary" type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-box border border-base-300 bg-base-100 p-4">
          <h2 className="mb-2 font-semibold">Filters</h2>
          <form
            className="grid gap-2 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(draftSearch.trim());
            }}
          >
            <input
              className="input input-bordered input-sm md:col-span-2"
              type="text"
              value={draftSearch}
              placeholder="Search..."
              onChange={(event) => setDraftSearch(event.target.value)}
            />
            <button className="btn btn-sm" type="submit">
              Search
            </button>
            <button
              className="btn btn-sm btn-outline"
              type="button"
              onClick={() => {
                setDraftSearch("");
                setSearch("");
                setPage(1);
              }}
            >
              Reset
            </button>
            <select
              className="select select-bordered select-sm"
              value={sortBy}
              onChange={(event) => {
                setPage(1);
                setSortBy(event.target.value);
              }}
            >
              <option value="title">Sort: Title</option>
              <option value="artist">Sort: Artist</option>
              <option value="dateAcquired">Sort: Date Acquired</option>
              <option value="createdAt">Sort: Created</option>
            </select>
            <select
              className="select select-bordered select-sm"
              value={order}
              onChange={(event) => {
                setPage(1);
                setOrder(event.target.value);
              }}
            >
              <option value="asc">Order: Asc</option>
              <option value="desc">Order: Desc</option>
            </select>
          </form>
        </section>

        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {loading && <p>Loading artworks...</p>}
          {!loading &&
            visibleItems.map((item) => (
              <article key={item._id} className="card border border-base-300 bg-base-100">
                <div className="card-body p-4">
                  {editingId === item._id && isManager ? (
                    <div className="grid gap-2">
                      <input
                        className="input input-bordered input-sm"
                        type="text"
                        value={editForm.title}
                        placeholder="Title"
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                      />
                      <input
                        className="input input-bordered input-sm"
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
                        className="input input-bordered input-sm"
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
                        className="input input-bordered input-sm"
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
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={updatingId === item._id}
                          onClick={() => saveEdit(item)}
                        >
                          {updatingId === item._id ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setEditingId("")}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="card-title text-base">{item.title || "Untitled"}</h3>
                      <p className="text-sm">Artist: {item.artistDisplayName || "Unknown"}</p>
                      <p className="text-sm">Department: {item.department || "Unknown"}</p>
                      <p className="text-sm">
                        Classification: {item.classification || "Unknown"}
                      </p>
                      <p className="text-sm">Object ID: {item.objectId}</p>
                      <div className="card-actions mt-2">
                        {isBuyer && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={hasItem(item._id)}
                            onClick={() => {
                              addItem(item);
                              setActionMessage("Artwork added to cart.");
                            }}
                          >
                            {hasItem(item._id) ? "Added" : "Add To Cart"}
                          </button>
                        )}
                        {isManager && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => startEdit(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-error"
                              disabled={deletingId === item._id}
                              onClick={() => removeArtwork(item)}
                            >
                              {deletingId === item._id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
        </section>

        {!loading && !error && visibleItems.length === 0 && (
          <p className="text-sm">No artworks matched your query.</p>
        )}

        <section className="rounded-box border border-base-300 bg-base-100 p-4">
          <p className="mb-2 text-sm">
            Page {pagination.page} of {pagination.totalPages} | {pagination.totalItems} total
          </p>
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item"
              disabled={isFirstPage || loading}
              onClick={() => setPage(1)}
            >
              First
            </button>
            <button
              type="button"
              className="btn btn-sm join-item"
              disabled={isFirstPage || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-sm join-item"
              disabled={isLastPage || loading}
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            >
              Next
            </button>
            <button
              type="button"
              className="btn btn-sm join-item"
              disabled={isLastPage || loading}
              onClick={() => setPage(pagination.totalPages)}
            >
              Last
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
