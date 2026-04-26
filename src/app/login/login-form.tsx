"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestMagicLink, type LoginState } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "Diese E-Mail-Adresse ist nicht berechtigt.",
  callback: "Login-Link ist abgelaufen oder ungültig. Bitte erneut anfordern.",
};

const initialState: LoginState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Sende Link…" : "Magic Link senden"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(requestMagicLink, initialState);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const queryError = errorParam ? ERROR_MESSAGES[errorParam] : null;

  if (state.status === "sent") {
    return (
      <div className="rounded-lg border bg-card p-4 text-center text-sm">
        <p className="font-medium">E-Mail unterwegs</p>
        <p className="mt-1 text-muted-foreground">
          Falls die Adresse berechtigt ist, findest du den Link in deinem
          Postfach. Öffne ihn auf diesem Gerät.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Input
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="deine@email.de"
      />
      <SubmitButton />
      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : queryError ? (
        <p className="text-sm text-destructive">{queryError}</p>
      ) : null}
    </form>
  );
}
