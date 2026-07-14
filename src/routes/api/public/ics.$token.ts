import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/ics/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.replace(/\.ics$/i, "");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: {
              storage: undefined,
              persistSession: false,
              autoRefreshToken: false,
            },
          },
        );
        const { data, error } = await supabase
          .from("ics_feeds")
          .select("ics_text")
          .eq("token", token)
          .maybeSingle();
        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(data.ics_text, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Content-Disposition": 'inline; filename="emploi-du-temps.ics"',
          },
        });
      },
    },
  },
});
