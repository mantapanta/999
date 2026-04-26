import { Suspense } from "react";
import { Sailboat } from "lucide-react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
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
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
