"use client";

import { useState } from "react";
import { Sailboat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 safe-pt safe-pb">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sailboat className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Drachen Trimmlog
          </h1>
          <p className="text-sm text-muted-foreground">
            Anmelden per Magic Link
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg border bg-card p-4 text-center text-sm">
            <p className="font-medium">E-Mail gesendet</p>
            <p className="mt-1 text-muted-foreground">
              Prüfe dein Postfach und öffne den Link auf diesem Gerät.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={status === "loading" || email.length === 0}
            >
              {status === "loading" ? "Sende Link…" : "Magic Link senden"}
            </Button>
            {status === "error" && errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
