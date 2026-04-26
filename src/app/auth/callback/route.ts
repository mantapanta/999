import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

// Handles the magic-link callback. Supabase redirects here with ?code=...
// (PKCE). We exchange the code, then double-check the authenticated email
// against ALLOWED_EMAIL — defence-in-depth in case sign-up policies in the
// Supabase dashboard get loosened.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();

  if (!email || email !== serverEnv.ALLOWED_EMAIL) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=forbidden", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
