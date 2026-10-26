/**
 * Shared JSON fetch helper for the private workspace.
 *
 * Extracted from mock-form.tsx (Phase 13, maintainability): both the
 * dashboard and the mock form call the API, so the client belongs in lib/.
 * Dispatches global session events so PrivateWorkspace can react to
 * expired sessions and unavailable auth before showing stale data.
 */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json();
  if (response.status === 401)
    window.dispatchEvent(new Event("ssc:session-ended"));
  if (result.error?.code === "AUTH_UNAVAILABLE")
    window.dispatchEvent(new Event("ssc:auth-unavailable"));
  if (!response.ok)
    throw new Error(result.error?.message ?? "Request failed. Please retry.");
  return result.data;
}
