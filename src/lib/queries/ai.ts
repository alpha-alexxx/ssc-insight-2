import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AiStatus } from "@/lib/ai/client-types";

/**
 * AI domain keys. Only the status probe is a cacheable server resource —
 * chat and coach are streaming conversations whose state stays in
 * use-ai-workspace (a stream is not a query cache entry).
 */

export const aiKeys = {
  all: ["ai"] as const,
  status: () => [...aiKeys.all, "status"] as const,
};

export const aiStatusQueryOptions = queryOptions({
  queryKey: aiKeys.status(),
  // Status changes when the user edits AI settings or the quota flips; both
  // paths invalidate explicitly, so reads stay cheap and deduplicated.
  staleTime: 60_000,
  queryFn: ({ signal }) => api<AiStatus>("/api/ai/status", { signal }),
});
