export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

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
