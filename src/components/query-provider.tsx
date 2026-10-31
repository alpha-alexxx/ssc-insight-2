"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, type ReactNode } from "react";
import { getQueryClient } from "@/lib/query-client";

/**
 * Workspace-scoped TanStack Query provider. Mounted once by WorkspaceShell
 * (not in the root layout): the landing page needs no query cache, and
 * scoping the client to the shell means sign-out — which unmounts the
 * workspace — drops every cached resource with the session. The listener
 * below is defense in depth for the same guarantee while the shell lives.
 *
 * Devtools render only in development builds and never ship to production.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  useEffect(() => {
    // The session ended while the shell is still mounted (sign-out button,
    // a stale 401 from any call): drop every cached resource immediately —
    // user-specific data must never outlive its session in the cache.
    const clear = () => queryClient.clear();
    window.addEventListener("ssc:session-ended", clear);
    return () => window.removeEventListener("ssc:session-ended", clear);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
