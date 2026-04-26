import { Lightbulb } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function LearningsPage() {
  return (
    <>
      <PageHeader
        title="Erkenntnisse"
        subtitle="Muster und Hypothesen"
      />
      <EmptyState
        icon={Lightbulb}
        title="Demnächst"
        description="Wiederkehrende Muster aus Rennen und Debriefs werden hier gesammelt."
      />
    </>
  );
}
