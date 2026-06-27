import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // Auth is best-effort: never let a misconfigured/unreachable Supabase
    // hard-fail the whole site (which would surface as
    // MIDDLEWARE_INVOCATION_FAILED). Let the request through; page-level
    // guards still protect the authenticated areas.
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest, service worker, icons (PWA assets)
     * - Any file with an extension (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
