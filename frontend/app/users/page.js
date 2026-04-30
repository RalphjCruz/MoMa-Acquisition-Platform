"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../components/AuthProvider";
import StickyHeader from "../components/StickyHeader";
import { apiBaseUrl, getAuthHeaders, readErrorMessage } from "../lib/api";

const ROLE_OPTIONS = ["buyer", "manager"];

const emptyCreateUserForm = {
  displayName: "",
  email: "",
  role: "buyer"
};

export default function UsersPage() {
  const { token, ready, isAuthenticated, isManager } = useAuth();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userActionError, setUserActionError] = useState("");
  const [userActionMessage, setUserActionMessage] = useState("");
  const [userForm, setUserForm] = useState(emptyCreateUserForm);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");

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
        headers: getAuthHeaders(token, { "Content-Type": "application/json" }),
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
    if (!window.confirm(`Delete user "${user.displayName}"?`)) {
      return;
    }

    setUserActionError("");
    setUserActionMessage("");
    setDeletingUserId(user._id);
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${user._id}`, {
        method: "DELETE",
        headers: getAuthHeaders(token)
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setUserActionMessage("User deleted.");
      await fetchUsers();
    } catch (err) {
      setUserActionError(err.message || "Failed to delete user.");
    } finally {
      setDeletingUserId("");
    }
  };

  return (
    <>
      <StickyHeader active="users" />
      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <section className="rounded-box border border-base-300 bg-base-100 p-4">
          <h1 className="text-2xl font-bold">User Profiles</h1>
          {!ready && <p className="text-sm">Loading session...</p>}
          {ready && (!isAuthenticated || !isManager) && (
            <p className="text-sm text-warning">Manager access required.</p>
          )}
        </section>

        {ready && isAuthenticated && isManager && (
          <>
            <section className="rounded-box border border-base-300 bg-base-100 p-4">
              <h2 className="mb-2 font-semibold">Create User</h2>
              <form className="grid gap-2 md:grid-cols-4" onSubmit={createUser}>
                <input
                  className="input input-bordered input-sm"
                  type="text"
                  required
                  placeholder="displayName"
                  value={userForm.displayName}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                />
                <input
                  className="input input-bordered input-sm"
                  type="email"
                  required
                  placeholder="email"
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
                <select
                  className="select select-bordered select-sm"
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
                <button className="btn btn-sm btn-primary" type="submit" disabled={creatingUser}>
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </form>
              {userActionError && <p className="mt-2 text-sm text-error">{userActionError}</p>}
              {userActionMessage && <p className="mt-2 text-sm text-success">{userActionMessage}</p>}
            </section>

            <section className="rounded-box border border-base-300 bg-base-100 p-4">
              <h2 className="mb-2 font-semibold">Users</h2>
              {usersLoading && <p className="text-sm">Loading users...</p>}
              {usersError && <p className="text-sm text-error">{usersError}</p>}
              {!usersLoading && users.length === 0 && <p className="text-sm">No users yet.</p>}
              <div className="grid gap-2 md:grid-cols-2">
                {users.map((user) => (
                  <article key={user._id} className="rounded-box border border-base-300 p-3">
                    <p className="text-sm font-medium">
                      {user.displayName} ({user.role})
                    </p>
                    <p className="text-sm">{user.email}</p>
                    <button
                      type="button"
                      className="btn btn-xs btn-error mt-2"
                      disabled={deletingUserId === user._id}
                      onClick={() => removeUser(user)}
                    >
                      {deletingUserId === user._id ? "Deleting..." : "Delete User"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
