import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

// The page guard improves navigation; each API independently checks its session.
export async function proxy(request: NextRequest) {
  try {
    return await auth().middleware({ loginUrl: "/sign-in" })(request);
  } catch {
    return NextResponse.redirect(
      new URL("/sign-in?error=unavailable", request.url),
    );
  }
}

export const config = { matcher: ["/", "/auth/complete"] };
