import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const upsertSchema = z.object({
  token: z.string().uuid(),
  ics: z.string().min(20).max(200_000),
});

export const upsertIcsFeed = createServerFn({ method: "POST" })
  .inputValidator((input) => upsertSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.from("ics_feeds").upsert(
      { token: data.token, ics_text: data.ics, updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteIcsFeed = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("ics_feeds")
      .delete()
      .eq("token", data.token);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
