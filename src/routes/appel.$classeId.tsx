import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  coursId: z.string().optional(),
  groupe: z.union([z.literal(1), z.literal(2)]).optional(),
});

// L'appel basé sur une liste a été supprimé. On redirige vers l'appel
// via le plan de classe (unique interface d'appel).
export const Route = createFileRoute("/appel/$classeId")({
  validateSearch: searchSchema,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/appel-plan/$classeId",
      params: { classeId: params.classeId },
      search: {
        coursId: search.coursId,
        scope:
          search.groupe === 1 ? "g1" : search.groupe === 2 ? "g2" : undefined,
      },
    });
  },
});
