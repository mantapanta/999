import { Flag, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function RacesPage() {
  return (
    <>
      <PageHeader
        title="Rennen"
        subtitle="Alle erfassten Wettfahrten"
        action={
          <Button size="icon" aria-label="Neues Rennen" disabled>
            <Plus className="h-5 w-5" />
          </Button>
        }
      />
      <EmptyState
        icon={Flag}
        title="Demnächst"
        description="Hier erscheint die Liste deiner Rennen mit Setup, Wind und Ergebnis."
      />
    </>
  );
}
