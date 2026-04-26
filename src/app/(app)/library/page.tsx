import { Library } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        title="Bibliothek"
        subtitle="Ampel-Setups: LW1 · LW2 · MW · SW"
      />
      <EmptyState
        icon={Library}
        title="Demnächst"
        description="Die vier Basis-Setups für Leicht-, Mittel- und Starkwind erscheinen hier."
      />
    </>
  );
}
