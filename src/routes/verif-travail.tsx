import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/verif-travail")({
  component: VerifTravailLayout,
  head: () => ({
    meta: [{ title: "Vérification du travail — ClasseScan" }],
  }),
});

function VerifTravailLayout() {
  return <Outlet />;
}
