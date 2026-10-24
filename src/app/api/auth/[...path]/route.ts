import { auth } from "@/lib/auth/server";
import { RequestError, readBody, apiError } from "@/lib/api";

export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: Context) {
  try {
    if (request.method !== "GET") {
      // Validate same-origin writes and the streamed size without consuming
      // the request that the Neon SDK forwards upstream.
      await readBody(request.clone());
    }
    const method = request.method as
      "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    return await auth().handler()[method](request, context);
  } catch (error) {
    if (error instanceof RequestError) return apiError(error);
    return Response.json(
      {
        error: {
          code: "AUTH_UNAVAILABLE",
          message: "Sign-in is temporarily unavailable. Please retry shortly.",
        },
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
