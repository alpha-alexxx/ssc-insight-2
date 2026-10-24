import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

// Only OAuth completion uses session middleware. The dashboard and all mock
// APIs intentionally remain public and shared.
export async function proxy(request: NextRequest) {
  try {
    return await auth().middleware({ loginUrl: "/sign-in" })(request);
  } catch {
    return NextResponse.redirect(
      new URL("/sign-in?error=unavailable", request.url),
    );
  }
}

export const config = { matcher: ["/auth/complete"] };
