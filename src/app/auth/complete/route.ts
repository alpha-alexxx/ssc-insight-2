import { NextResponse, type NextRequest } from "next/server";
import { publicUrl } from "@/lib/public-url";

export function GET(request: NextRequest) {
  return NextResponse.redirect(publicUrl("/dashboard", request));
}
