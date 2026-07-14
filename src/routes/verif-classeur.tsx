import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/verif-classeur")({
  component: VerifClasseurLayout,
  head: () => ({
    meta: [{ title: "A son classeur — ClasseScan" }],
  }),
});

function VerifClasseurLayout() {
  return <Outlet />;
}
