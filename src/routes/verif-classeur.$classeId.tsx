import { createFileRoute } from "@tanstack/react-router";
import { PlanVerifView } from "@/components/PlanVerifView";

export const Route = createFileRoute("/verif-classeur/$classeId")({
  component: VerifClasseurClassePage,
});

function VerifClasseurClassePage() {
  const { classeId } = Route.useParams();
  return <PlanVerifView classeId={classeId} mode="classeur" />;
}
