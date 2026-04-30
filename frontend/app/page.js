"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "./components/AuthProvider";
import { useCart } from "./components/CartProvider";
import StickyHeader from "./components/StickyHeader";
import AppShell from "./components/ui/AppShell";
import InlineAlert from "./components/ui/InlineAlert";
import StatsGrid from "./components/ui/StatsGrid";
import SurfaceCard from "./components/ui/SurfaceCard";
import {
  apiBaseUrl,
  buildQueryString,
  getAuthHeaders,
  readErrorMessage
} from "./lib/api";

const PAGE_SIZE = 12;

const SearchIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.6-3.6" />
  </svg>
);

const FilterIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 5h18l-7 8v5l-4 1v-6L3 5z" />
  </svg>
);

const emptyCreateArtworkForm = {
  objectId: "",
  title: "",
  imageUrl: "",
  price: "",
  artistDisplayName: "",
  department: "",
  classification: ""
};

export default function ArtworksPage() {
  const { ready, token, isBuyer, isManager, isAuthenticated } = useAuth();
  const { addItem, hasItem, totalItems } = useCart();

  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(true);

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
    imageUrl: "",
    price: "",
    artistDisplayName: "",
    department: "",
    classification: "",
    isPublicDomain: false,
    tags: ""
  });
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [requestArtworkIds, setRequestArtworkIds] = useState(new Set());
  const [activeArtworkId, setActiveArtworkId] = useState("");


  const isFirstPage = pagination.page <= 1;
  const isLastPage = pagination.page >= pagination.totalPages;

  const queryString = useMemo(
    () =>
      buildQueryString({
        q: search,
        minPrice,
        maxPrice,
        page,
        limit: PAGE_SIZE,
        sortBy,
        order
      }),
    [search, minPrice, maxPrice, page, sortBy, order]
  );

  const visibleItems = useMemo(() => {
    if (!isBuyer) {
      return items;
    }
    return items.filter((item) => !hasItem(item._id) && !requestArtworkIds.has(item._id));
  }, [isBuyer, items, hasItem, requestArtworkIds]);

  const catalogueStats = useMemo(
    () => [
      { label: "Visible", value: visibleItems.length, tone: "primary" },
      { label: "Total (Page)", value: items.length, tone: "info" },
      { label: "Cart", value: totalItems, tone: "success" }
    ],
    [visibleItems.length, items.length, totalItems]
  );

  const activeArtwork = useMemo(
    () => items.find((item) => item._id === activeArtworkId) || null,
    [items, activeArtworkId]
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

  useEffect(() => {
    if (activeArtworkId && !activeArtwork) {
      setActiveArtworkId("");
      setEditingId("");
    }
  }, [activeArtworkId, activeArtwork]);


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
        imageUrl: createForm.imageUrl.trim(),
        ...(createForm.price.trim() !== ""
          ? { price: Number.parseFloat(createForm.price) }
          : {}),
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
      imageUrl: item.imageUrl || "",
      price: item.price !== undefined && item.price !== null ? String(item.price) : "",
      artistDisplayName: item.artistDisplayName || "",
      department: item.department || "",
      classification: item.classification || "",
      isPublicDomain: Boolean(item.isPublicDomain),
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : ""
    });
  };

  const openArtworkModal = (item) => {
    setActiveArtworkId(item._id);
  };

  const closeArtworkModal = () => {
    setActiveArtworkId("");
    setEditingId("");
  };

  const saveEdit = async (item) => {
    setActionError("");
    setActionMessage("");
    setUpdatingId(item._id);

    try {
      const payload = {
        title: editForm.title.trim(),
        imageUrl: editForm.imageUrl.trim(),
        ...(editForm.price.trim() !== ""
          ? { price: Number.parseFloat(editForm.price) }
          : {}),
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
      if (activeArtworkId === item._id) {
        closeArtworkModal();
      }
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
      <AppShell>
        <SurfaceCard className="!border-[#d9c7ad]/70 !bg-base-100/76">
          <h1 className="text-3xl font-bold tracking-tight">Artwork Catalogue</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-base-content/80">
            Managers can edit/remove artworks. Buyers can add artworks to cart.
          </p>
          {ready && isBuyer && <p className="mt-2 text-sm">Cart items: {totalItems}</p>}
          {ready && !isAuthenticated && (
            <p className="mt-2 text-sm">Login as buyer or manager to unlock actions.</p>
          )}
          <InlineAlert message={actionError} tone="error" className="mt-3" />
          <InlineAlert message={actionMessage} tone="success" className="mt-3" />
          <InlineAlert message={error} tone="error" className="mt-3" />
          <div className="mt-3">
            <StatsGrid items={catalogueStats} />
          </div>
        </SurfaceCard>

        {isManager && (
          <SurfaceCard title="Create Artwork">
            <form className="grid gap-2 md:grid-cols-3" onSubmit={handleCreate}>
              <input
                className="input input-bordered ui-input"
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
                className="input input-bordered ui-input"
                type="text"
                required
                placeholder="title"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
              <input
                className="input input-bordered ui-input"
                type="url"
                placeholder="image URL (optional)"
                value={createForm.imageUrl}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
              />
              <input
                className="input input-bordered ui-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="price (optional)"
                value={createForm.price}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, price: event.target.value }))
                }
              />
              <input
                className="input input-bordered ui-input"
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
                className="input input-bordered ui-input"
                type="text"
                placeholder="department"
                value={createForm.department}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, department: event.target.value }))
                }
              />
              <input
                className="input input-bordered ui-input"
                type="text"
                placeholder="classification"
                value={createForm.classification}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, classification: event.target.value }))
                }
              />
              <button className="ui-btn-primary" type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
          </SurfaceCard>
        )}

        <SurfaceCard className="!border-[#d9c7ad]/70 !bg-base-100/72">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(draftSearch.trim());
              setMinPrice(draftMinPrice.trim());
              setMaxPrice(draftMaxPrice.trim());
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <label className="input input-bordered ui-input flex w-full max-w-md items-center gap-2">
                <SearchIcon />
                <input
                  className="w-full bg-transparent outline-none"
                  type="text"
                  value={draftSearch}
                  placeholder="Search artworks..."
                  onChange={(event) => setDraftSearch(event.target.value)}
                />
              </label>
              <button className="ui-btn-primary" type="submit">
                Search
              </button>
              <button
                className="ui-btn-secondary"
                type="button"
                onClick={() => {
                  setDraftSearch("");
                  setSearch("");
                  setDraftMinPrice("");
                  setDraftMaxPrice("");
                  setMinPrice("");
                  setMaxPrice("");
                  setPage(1);
                }}
              >
                Reset
              </button>
            </div>

            <div>
              <button
                type="button"
                className="ui-btn-secondary icon-chip"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-expanded={filtersOpen}
              >
                <FilterIcon />
                Filter {filtersOpen ? "Hide" : "Show"}
              </button>
            </div>

            {filtersOpen && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="input input-bordered ui-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Min price"
                    value={draftMinPrice}
                    onChange={(event) => setDraftMinPrice(event.target.value)}
                  />
                  <input
                    className="input input-bordered ui-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max price"
                    value={draftMaxPrice}
                    onChange={(event) => setDraftMaxPrice(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Sort By:</span>
                  <div className="w-full overflow-x-auto pb-1">
                    <div className="filter w-max">
                      <input
                        className="btn btn-sm filter-reset"
                        type="radio"
                        name="sortBy"
                        aria-label="Title"
                        checked={sortBy === "title"}
                        onChange={() => {
                          setPage(1);
                          setSortBy("title");
                        }}
                      />
                      <input
                        className="btn btn-sm"
                        type="radio"
                        name="sortBy"
                        aria-label="Artist"
                        checked={sortBy === "artist"}
                        onChange={() => {
                          setPage(1);
                          setSortBy("artist");
                        }}
                      />
                      <input
                        className="btn btn-sm"
                        type="radio"
                        name="sortBy"
                        aria-label="Date Acquired"
                        checked={sortBy === "dateAcquired"}
                        onChange={() => {
                          setPage(1);
                          setSortBy("dateAcquired");
                        }}
                      />
                      <input
                        className="btn btn-sm"
                        type="radio"
                        name="sortBy"
                        aria-label="Price"
                        checked={sortBy === "price"}
                        onChange={() => {
                          setPage(1);
                          setSortBy("price");
                        }}
                      />
                      <input
                        className="btn btn-sm"
                        type="radio"
                        name="sortBy"
                        aria-label="Created"
                        checked={sortBy === "createdAt"}
                        onChange={() => {
                          setPage(1);
                          setSortBy("createdAt");
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Order:</span>
                  <div className="filter">
                    <input
                      className="btn btn-sm filter-reset"
                      type="radio"
                      name="sortOrder"
                      aria-label="Asc"
                      checked={order === "asc"}
                      onChange={() => {
                        setPage(1);
                        setOrder("asc");
                      }}
                    />
                    <input
                      className="btn btn-sm"
                      type="radio"
                      name="sortOrder"
                      aria-label="Desc"
                      checked={order === "desc"}
                      onChange={() => {
                        setPage(1);
                        setOrder("desc");
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </form>
        </SurfaceCard>

        <section className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="surface-card border border-base-200/70 p-4">
                <div className="skeleton mb-2 h-5 w-3/4" />
                <div className="skeleton mb-2 h-4 w-2/3" />
                <div className="skeleton mb-2 h-4 w-1/2" />
                <div className="skeleton h-8 w-24" />
              </div>
            ))}
          {!loading &&
            visibleItems.map((item, index) => {
              const isDark = index % 2 === 0;
              const cardToneClass = isDark
                ? "!border-black/80 !bg-black/95 !text-white"
                : "!border-white/90 !bg-white/95 !text-black";
              const emptyToneClass = isDark ? "text-white/70" : "text-base-content/70";
              const titleToneClass = isDark ? "text-white" : "text-black";
              const priceToneClass = isDark ? "text-white/80" : "text-black/80";

              return (
                <article
                  key={item._id}
                className={`card surface-card surface-card-hover h-[22rem] self-start border transition-all duration-300 ${cardToneClass}`}
              >
                  <button
                    type="button"
                    className="card-body h-full cursor-pointer p-4 text-left"
                    onClick={() => openArtworkModal(item)}
                    aria-label={`Open details for ${item.title || "Untitled"}`}
                  >
                    <div className="h-56 w-full overflow-hidden rounded-lg bg-base-200">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={`Artwork preview: ${item.title || "Untitled"}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center text-xs ${emptyToneClass}`}>
                          No image available
                        </div>
                      )}
                    </div>
                    <h3 className={`card-title mt-2 line-clamp-2 text-lg ${titleToneClass}`}>
                      {item.title || "Untitled"}
                    </h3>
                    <p className={`text-sm font-medium ${priceToneClass}`}>
                      ${Number(item.price ?? 0).toFixed(2)}
                    </p>
                  </button>
                </article>
              );
            })}
        </section>

        {activeArtwork && (
          <div className="modal modal-open p-2 sm:p-4" role="dialog" aria-modal="true">
            <div className="modal-box modal-pop w-full max-w-2xl p-4 sm:p-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-black">{activeArtwork.title || "Untitled"}</h3>
                <button type="button" className="btn btn-sm btn-circle" onClick={closeArtworkModal}>
                  x
                </button>
              </div>

              <div className="mb-3 h-56 w-full overflow-hidden rounded-md bg-base-200 sm:h-72">
                {activeArtwork.imageUrl ? (
                  <img
                    src={activeArtwork.imageUrl}
                    alt={`Artwork preview: ${activeArtwork.title || "Untitled"}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-base-content/70">
                    No image available
                  </div>
                )}
              </div>

              {editingId === activeArtwork._id && isManager ? (
                <div className="grid gap-2">
                  <input
                    className="input input-bordered ui-input"
                    type="text"
                    value={editForm.title}
                    placeholder="Title"
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                  <input
                    className="input input-bordered ui-input"
                    type="url"
                    value={editForm.imageUrl}
                    placeholder="Image URL"
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        imageUrl: event.target.value
                      }))
                    }
                  />
                  <input
                    className="input input-bordered ui-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    placeholder="Price"
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        price: event.target.value
                      }))
                    }
                  />
                  <input
                    className="input input-bordered ui-input"
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
                    className="input input-bordered ui-input"
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
                    className="input input-bordered ui-input"
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
                  <div className="modal-action mt-1 flex-wrap">
                    <button
                      type="button"
                      className="ui-btn-primary"
                      disabled={updatingId === activeArtwork._id}
                      onClick={() => saveEdit(activeArtwork)}
                    >
                      {updatingId === activeArtwork._id ? "Saving..." : "Save"}
                    </button>
                    <button type="button" className="ui-btn-secondary" onClick={() => setEditingId("")}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1 text-sm text-black">
                    <p>Artist: {activeArtwork.artistDisplayName || "Unknown"}</p>
                    <p>Department: {activeArtwork.department || "Unknown"}</p>
                    <p>Classification: {activeArtwork.classification || "Unknown"}</p>
                    <p>Price: ${Number(activeArtwork.price ?? 0).toFixed(2)}</p>
                    <p>Object ID: {activeArtwork.objectId}</p>
                  </div>
                  <div className="modal-action mt-3 flex-wrap">
                    {isBuyer && (
                      <button
                        type="button"
                        className="ui-btn-primary"
                        disabled={hasItem(activeArtwork._id)}
                        onClick={() => {
                          addItem(activeArtwork);
                          setActionMessage("Artwork added to cart.");
                          closeArtworkModal();
                        }}
                      >
                        {hasItem(activeArtwork._id) ? "Added" : "Add To Cart"}
                      </button>
                    )}
                    {isManager && (
                      <button
                        type="button"
                        className="ui-btn-secondary"
                        onClick={() => startEdit(activeArtwork)}
                      >
                        Edit
                      </button>
                    )}
                    {isManager && (
                      <button
                        type="button"
                        className="btn btn-error"
                        disabled={deletingId === activeArtwork._id}
                        onClick={() => removeArtwork(activeArtwork)}
                      >
                        {deletingId === activeArtwork._id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                    <button type="button" className="ui-btn-secondary" onClick={closeArtworkModal}>
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              aria-label="Close artwork details"
              className="modal-backdrop"
              onClick={closeArtworkModal}
            />
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && (
          <SurfaceCard tone="light">
            <p className="text-sm">No artworks matched your query.</p>
          </SurfaceCard>
        )}

        <SurfaceCard tone="light">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2">
            <button
              type="button"
              className="ui-btn-secondary btn-sm justify-self-start"
              disabled={isFirstPage || loading}
              onClick={() => setPage(1)}
            >
              First
            </button>

            <div className="grid min-w-0 grid-cols-[auto,1fr,auto] items-center gap-1 sm:gap-2">
              <button
                type="button"
                className="ui-btn-secondary btn-sm"
                disabled={isFirstPage || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </button>

              <div className="min-w-0 px-1 text-center">
                <p className="truncate text-xs sm:hidden">
                  Page {pagination.page}/{pagination.totalPages}
                </p>
                <p className="hidden truncate text-sm sm:block">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
                </p>
              </div>

              <button
                type="button"
                className="ui-btn-secondary btn-sm"
                disabled={isLastPage || loading}
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              >
                Next
              </button>
            </div>

            <button
              type="button"
              className="ui-btn-secondary btn-sm justify-self-end"
              disabled={isLastPage || loading}
              onClick={() => setPage(pagination.totalPages)}
            >
              Last
            </button>
          </div>
        </SurfaceCard>
      </AppShell>
    </>
  );
}



