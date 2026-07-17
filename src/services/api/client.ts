const DEFAULT_API_URL = typeof window !== "undefined"
  ? `${window.location.protocol}//${window.location.hostname}:3001/api`
  : "/api";

const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
