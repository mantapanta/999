import "server-only";

import { z } from "zod";

// Server-only env vars. Importing this module from a client component will
// fail at build time thanks to `server-only`.
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  ALLOWED_EMAIL: z
    .string()
    .email("ALLOWED_EMAIL must be a valid email address")
    .transform((s) => s.toLowerCase()),
  // AI keys: required only in Phase 3. Optional now so Phase 1 dev still works.
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

const parsed = serverSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ALLOWED_EMAIL: process.env.ALLOWED_EMAIL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(
    `[env] Invalid server environment variables:\n${issues}\n\nCheck .env.local against .env.example.`,
  );
}

export const serverEnv = parsed.data;
