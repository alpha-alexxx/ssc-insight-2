import { defineRoute } from "@/lib/route-handler";
import { readBody, RequestError } from "@/lib/api";
import { aiConnectionSchema } from "@/lib/ai/connection-input";
import { resolveDraftConnection } from "@/lib/ai/draft-connection";
import { fetchModelCatalog, ModelDiscoveryError } from "@/lib/ai/models";

export const runtime = "nodejs";
export const maxDuration = 30;

export const POST = defineRoute(
  { kind: "write" },
  async ({ request, user }) => {
    const parsed = aiConnectionSchema.safeParse(await readBody(request));
    if (!parsed.success)
      throw new RequestError(
        parsed.error.issues[0]?.message ?? "Check the provider details.",
        400,
      );
    const connection = await resolveDraftConnection(user.id, parsed.data);
    try {
      const models = await fetchModelCatalog(
        connection,
        AbortSignal.timeout(15_000),
      );
      return { data: { models } };
    } catch (error) {
      if (error instanceof ModelDiscoveryError)
        throw new RequestError(error.message, error.status);
      throw new RequestError(
        "Could not reach the provider in time. Try again or enter a model ID manually.",
        502,
      );
    }
  },
);
