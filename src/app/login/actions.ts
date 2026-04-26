"use server";

import { z } from "zod";

import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

export type LoginState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string };

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Ungültige E-Mail-Adresse.");

export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }
  const email = parsed.data;

  // Single-user gate. Always return "sent" on mismatch to prevent
  // someone probing which address is the owner's.
  if (email !== serverEnv.ALLOWED_EMAIL) {
    return { status: "sent" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { status: "error", message: "E-Mail konnte nicht gesendet werden." };
  }

  return { status: "sent" };
}
