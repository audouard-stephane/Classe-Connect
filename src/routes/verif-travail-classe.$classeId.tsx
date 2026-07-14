import { createFileRoute } from "@tanstack/react-router";
import { PlanVerifView } from "@/components/PlanVerifView";

export const Route = createFileRoute("/verif-travail-classe/$classeId")({
  component: VerifTravailClasseSalle,
  head: () => ({ meta: [{ title: "Travail en classe — ClasseScan" }] }),
});

function VerifTravailClasseSalle() {
  const { classeId } = Route.useParams();
  return <PlanVerifView classeId={classeId} mode="travail-classe" />;
}
