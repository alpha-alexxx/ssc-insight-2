import { NextResponse, type NextRequest } from "next/server";
import { publicUrl } from "@/lib/public-url";

export function GET(request: NextRequest) {
  // OAuth failures land here whenever an error redirect is missing; forward
  // the reason to the landing page instead of a silent 401 bounce later.
  if (
    request.nextUrl.searchParams.has("error") ||
    request.nextUrl.searchParams.has("error_description")
  ) {
    return NextResponse.redirect(publicUrl("/?error=oauth", request));
  }
  return NextResponse.redirect(publicUrl("/dashboard", request));
}
