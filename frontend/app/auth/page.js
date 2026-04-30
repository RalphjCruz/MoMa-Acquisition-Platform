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
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
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

    const handler = (event) => {
      const nextMode = event?.detail === "register" ? "register" : "login";
      setMode(nextMode);
      router.replace(`/auth?mode=${nextMode}`);
    };
    window.addEventListener("auth-mode-change", handler);
    return () => window.removeEventListener("auth-mode-change", handler);
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
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (!/[A-Z]/.test(form.password)) {
          throw new Error("Password must include at least one uppercase letter.");
        }
        if (!/[^A-Za-z0-9]/.test(form.password)) {
          throw new Error("Password must include at least one special character.");
        }

        await register({
          username: form.username.trim(),
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

  const changeMode = (nextMode) => {
    setMode(nextMode);
    router.replace(`/auth?mode=${nextMode}`);
  };

  return (
    <>
      <StickyHeader active={mode === "register" ? "auth-register" : "auth"} />
      <AppShell>
        <SurfaceCard className="mx-auto w-full max-w-xl">
          <h1 className="text-3xl font-bold tracking-tight">Account Access</h1>
          <p className="muted-text mt-1">Sign in or create an account to continue.</p>

          <div className="tabs tabs-boxed mt-4 grid w-full grid-cols-2">
            <button
              type="button"
              className={`tab ${mode === "login" ? "tab-active" : ""}`}
              onClick={() => changeMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`tab ${mode === "register" ? "tab-active" : ""}`}
              onClick={() => changeMode("register")}
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
                  minLength={3}
                  maxLength={30}
                  placeholder="Username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, username: event.target.value }))
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
            {mode === "register" && (
              <>
                <ul className="ml-5 list-disc text-xs text-base-content/75">
                  <li>At least 8 characters</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one special character</li>
                </ul>
                <input
                  className="input input-bordered ui-input"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value
                    }))
                  }
                />
              </>
            )}

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
