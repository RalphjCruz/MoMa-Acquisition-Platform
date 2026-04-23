"use client";

import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 12;

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

  useEffect(() => {
    const controller = new AbortController();

    const loadArtworks = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${apiBaseUrl}/api/artworks?${queryString}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Backend responded with ${response.status}`);
        }

        const payload = await response.json();
        setItems(payload.data ?? []);
        setPagination(
          payload.pagination ?? {
            page: 1,
            limit: PAGE_SIZE,
            totalItems: 0,
            totalPages: 1
          }
        );
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
    };

    loadArtworks();
    return () => controller.abort();
  }, [queryString]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">MoMA Acquisition Intelligence Platform</p>
          <h1>Artwork Viewer</h1>
          <p className="subtext">
            Simple frontend to validate backend REST services from any laptop.
          </p>
        </div>
        <div className="heroLinks">
          <a href={`${apiBaseUrl}/about`} target="_blank" rel="noreferrer">
            About This Page
          </a>
          <a href={`${apiBaseUrl}/api/health`} target="_blank" rel="noreferrer">
            Health
          </a>
        </div>
      </header>

      <section className="controls">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={draftSearch}
            placeholder="Search title, artist, medium..."
            onChange={(event) => setDraftSearch(event.target.value)}
          />
          <button type="submit">Search</button>
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

      <section className="status">
        {loading && <p>Loading artworks...</p>}
        {!loading && error && <p className="error">{error}</p>}
        {!loading && !error && (
          <p>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total artworks)
          </p>
        )}
      </section>

      <section className="grid">
        {items.map((item) => (
          <article key={item._id} className="card">
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
          disabled={pagination.page <= 1 || loading}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} / {pagination.totalPages}
        </span>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages || loading}
          onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
        >
          Next
        </button>
      </section>
    </main>
  );
}

