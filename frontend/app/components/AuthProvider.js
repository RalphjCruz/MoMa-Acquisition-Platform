"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiBaseUrl, getStoredSession, readErrorMessage } from "../lib/api";

const AuthContext = createContext(null);

const persistSession = (token, user) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!token || !user) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    return;
  }

  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    setToken(session.token);
    setUser(session.user);
    setReady(true);
  }, []);

  const login = async ({ email, password }) => {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const payload = await response.json();
    const nextToken = payload?.data?.token ?? "";
    const nextUser = payload?.data?.user ?? null;

    if (!nextToken || !nextUser) {
      throw new Error("Invalid login response from server.");
    }

    persistSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  };

  const register = async ({ username, email, password, role }) => {
    const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, role })
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const payload = await response.json();
    const nextToken = payload?.data?.token ?? "";
    const nextUser = payload?.data?.user ?? null;

    if (!nextToken || !nextUser) {
      throw new Error("Invalid registration response from server.");
    }

    persistSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    persistSession("", null);
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      isAuthenticated: Boolean(token && user),
      isManager: user?.role === "manager" || user?.role === "admin",
      isBuyer: user?.role === "buyer",
      login,
      register,
      logout
    }),
    [token, user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return value;
};
