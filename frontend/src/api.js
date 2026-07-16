// Central fetch wrapper. Every component talks to the API through this.
//
// The key trick: on a 401 (access token expired), it silently exchanges
// the refresh token for new tokens and replays the original request ONCE.
// The user never notices their 15-minute token expired.

const API = import.meta.env.VITE_API_URL;

function getTokens() {
  return {
    access: localStorage.getItem("access_token"),
    refresh: localStorage.getItem("refresh_token"),
  };
}

export function saveTokens({ access_token, refresh_token }) {
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshTokens() {
  const { refresh } = getTokens();
  if (!refresh) return false;
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return false;
  saveTokens(await res.json());
  return true;
}

export async function apiFetch(path, options = {}, retried = false) {
  const { access } = getTokens();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !retried) {
    const ok = await refreshTokens();
    if (ok) return apiFetch(path, options, true);
    clearTokens();
    window.location.href = "/login";
  }
  return res;
}

export { API };
