"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../components/AuthProvider";
import StickyHeader from "../components/StickyHeader";
import AppShell from "../components/ui/AppShell";
import InlineAlert from "../components/ui/InlineAlert";
import StatsGrid from "../components/ui/StatsGrid";
import SurfaceCard from "../components/ui/SurfaceCard";
import { apiBaseUrl, getAuthHeaders, readErrorMessage } from "../lib/api";

export default function UsersPage() {
  const { token, ready, isAuthenticated, isManager } = useAuth();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

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
      setUsers(payload.data ?? []);
    } catch (err) {
      setUsersError(err.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready && isManager) {
      fetchUsers();
    }
  }, [ready, isManager, fetchUsers]);

  const summary = useMemo(() => {
    const managerCount = users.filter((user) => user.role === "manager").length;
    const buyerCount = users.filter((user) => user.role === "buyer").length;
    return {
      total: users.length,
      managers: managerCount,
      buyers: buyerCount
    };
  }, [users]);

  return (
    <>
      <StickyHeader active="users" />
      <AppShell>
        <SurfaceCard>
          <h1 className="text-3xl font-bold tracking-tight">User Profiles</h1>
          {!ready && <p className="text-sm">Loading session...</p>}
          {ready && (!isAuthenticated || !isManager) && (
            <p className="text-sm text-warning">Manager access required.</p>
          )}
        </SurfaceCard>

        {ready && isAuthenticated && isManager && (
          <SurfaceCard title="Users">
              <StatsGrid
                items={[
                  { label: "Total Users", value: summary.total, tone: "primary" },
                  { label: "Managers", value: summary.managers, tone: "info" },
                  { label: "Buyers", value: summary.buyers, tone: "success" }
                ]}
                className="mb-3"
              />
              {usersLoading && <p className="text-sm">Loading users...</p>}
              <InlineAlert message={usersError} tone="error" className="mb-3" />
              {!usersLoading && users.length === 0 && <p className="text-sm">No users yet.</p>}
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => (
                  <article
                    key={user._id}
                    className="card surface-card surface-card-hover border border-base-200/70"
                  >
                    <div className="card-body p-3">
                      <p className="text-sm font-medium">
                        {user.displayName} ({user.role})
                      </p>
                      <p className="text-sm">{user.email}</p>
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
