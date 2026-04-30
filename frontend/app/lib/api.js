export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export const getAuthHeaders = (token, headers = {}) => {
  const nextHeaders = { ...headers };
  if (token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }
  return nextHeaders;
};

export const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  return query.toString();
};

export const readErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (payload?.error?.message) {
      return payload.error.message;
    }
  } catch (_error) {
    // ignore parse errors and fallback below
  }

  return `Request failed with status ${response.status}.`;
};

export const getStoredSession = () => {
  if (typeof window === "undefined") {
    return { token: "", user: null };
  }

  try {
    const token = localStorage.getItem("auth_token") ?? "";
    const userRaw = localStorage.getItem("auth_user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user };
  } catch (_error) {
    return { token: "", user: null };
  }
};
