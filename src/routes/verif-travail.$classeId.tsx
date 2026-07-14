import { createFileRoute } from "@tanstack/react-router";
import { PlanVerifView } from "@/components/PlanVerifView";

export const Route = createFileRoute("/verif-travail/$classeId")({
  component: VerifTravailClassePage,
});

function VerifTravailClassePage() {
  const { classeId } = Route.useParams();
  return <PlanVerifView classeId={classeId} mode="travail" />;
}
