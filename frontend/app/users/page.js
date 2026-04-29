"use client";

import { useCallback, useEffect, useState } from "react";

import StickyHeader from "../components/StickyHeader";
import { apiBaseUrl, readErrorMessage } from "../lib/api";

const ROLE_OPTIONS = ["buyer", "manager", "admin"];

const emptyCreateUserForm = {
  displayName: "",
  email: "",
  role: "buyer"
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userActionError, setUserActionError] = useState("");
  const [userActionMessage, setUserActionMessage] = useState("");
  const [userForm, setUserForm] = useState(emptyCreateUserForm);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");

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
      setUsers(payload.data ?? []);
    } catch (err) {
      setUsersError(err.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    } catch (err) {
      setUserActionError(err.message || "Failed to delete user.");
    } finally {
      setDeletingUserId("");
    }
  };

  return (
    <>
      <StickyHeader active="users" />
      <main className="page">
        <header className="hero">
          <div>
            <h1>User Profiles</h1>
            <p className="heroSubtitle">No Login Mode</p>
            <p className="subtext">
              Manage buyers and staff profiles used by acquisition workflows.
            </p>
          </div>
        </header>

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
          {!usersLoading && userActionError && (
            <p className="error">{userActionError}</p>
          )}
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
      </main>
    </>
  );
}
