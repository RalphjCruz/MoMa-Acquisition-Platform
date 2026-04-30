"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "../components/AuthProvider";
import StickyHeader from "../components/StickyHeader";
import AppShell from "../components/ui/AppShell";
import InlineAlert from "../components/ui/InlineAlert";
import SurfaceCard from "../components/ui/SurfaceCard";

const emptyForm = {
  displayName: "",
  email: "",
  password: "",
  role: "buyer"
};

export default function AuthPage() {
  const router = useRouter();
  const { ready, isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const queryMode = new URLSearchParams(window.location.search).get("mode");
    setMode(queryMode === "register" ? "register" : "login");
  }, []);

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/");
    }
  }, [ready, isAuthenticated, router]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: form.email.trim().toLowerCase(), password: form.password });
      } else {
        await register({
          displayName: form.displayName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role
        });
      }
      router.replace("/");
    } catch (nextError) {
      setError(nextError.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StickyHeader active="auth" />
      <AppShell>
        <SurfaceCard className="mx-auto w-full max-w-xl">
          <h1 className="text-3xl font-bold tracking-tight">Account Access</h1>
          <p className="muted-text mt-1">Sign in or create an account to continue.</p>

          <div className="tabs tabs-boxed mt-4 grid w-full grid-cols-2">
            <button
              type="button"
              className={`tab ${mode === "login" ? "tab-active" : ""}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`tab ${mode === "register" ? "tab-active" : ""}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <form className="mt-4 grid gap-2" onSubmit={onSubmit}>
            {mode === "register" && (
              <>
                <input
                  className="input input-bordered ui-input"
                  type="text"
                  required
                  placeholder="Display Name"
                  value={form.displayName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                />
                <select
                  className="select select-bordered ui-select"
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                >
                  <option value="buyer">buyer</option>
                  <option value="manager">manager</option>
                </select>
              </>
            )}

            <input
              className="input input-bordered ui-input"
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />

            <input
              className="input input-bordered ui-input"
              type="password"
              required
              minLength={8}
              placeholder="Password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />

            <InlineAlert message={error} tone="error" className="mt-1" />

            <div className="mt-2 flex flex-wrap gap-2">
              <button type="submit" className="ui-btn-primary" disabled={loading}>
                {loading
                  ? "Submitting..."
                  : mode === "login"
                    ? "Login"
                    : "Register"}
              </button>
              <Link className="ui-btn-secondary" href="/">
                Back To Catalogue
              </Link>
            </div>
          </form>
        </SurfaceCard>
      </AppShell>
    </>
  );
}
