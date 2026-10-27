/** Never forward a saved key to a newly selected provider or endpoint. */
export function sameCredentialTarget(
  a: { provider: string; baseUrl: string },
  b: { provider: string; baseUrl: string },
): boolean {
  return (
    a.provider === b.provider &&
    a.baseUrl.trim().replace(/\/+$/, "") ===
      b.baseUrl.trim().replace(/\/+$/, "")
  );
}
