import { createFileRoute } from "@tanstack/react-router";
import { PlanVerifView } from "@/components/PlanVerifView";

export const Route = createFileRoute("/bavardages/$classeId")({
  component: BavardagesPage,
  head: () => ({ meta: [{ title: "Bavardages — ClasseScan" }] }),
});

function BavardagesPage() {
  const { classeId } = Route.useParams();
  return <PlanVerifView classeId={classeId} mode="bavardages" />;
}
