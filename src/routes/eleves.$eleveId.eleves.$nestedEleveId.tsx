import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/eleves/$eleveId/eleves/$nestedEleveId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/eleves/$eleveId",
      params: { eleveId: params.nestedEleveId },
      replace: true,
    });
  },
});