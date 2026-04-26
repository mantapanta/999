import { Mic } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function DebriefsPage() {
  return (
    <>
      <PageHeader
        title="Debriefs"
        subtitle="Audio-Aufnahmen vom Tag"
      />
      <EmptyState
        icon={Mic}
        title="Demnächst"
        description="Hier landen deine Sprachnotizen mit Transkript und KI-Analyse."
      />
    </>
  );
}
