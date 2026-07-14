import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { upsertIcsFeed, deleteIcsFeed } from "@/lib/ics-feed.functions";

const STORAGE_KEY = "ics_feed_token";

export function useIcsSubscription(ics: string | null) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null,
  );
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lastPushedRef = useRef<string | null>(null);

  const upsertFn = useServerFn(upsertIcsFeed);
  const deleteFn = useServerFn(deleteIcsFeed);

  const push = useCallback(
    async (t: string, content: string) => {
      setSyncing(true);
      try {
        await upsertFn({ data: { token: t, ics: content } });
        lastPushedRef.current = content;
        setLastSyncAt(Date.now());
        setDirty(false);
      } catch (e) {
        setDirty(true);
        throw e;
      } finally {
        setSyncing(false);
      }
    },
    [upsertFn],
  );

  // Auto-sync (debounced) when ICS changes and token exists
  useEffect(() => {
    if (!token || !ics) return;
    if (ics === lastPushedRef.current) return;
    setDirty(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!navigator.onLine) return;
      push(token, ics).catch(() => {
        /* stays dirty, retried on next change/online */
      });
    }, 1500);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [ics, token, push]);

  // Retry when coming back online
  useEffect(() => {
    const onOnline = () => {
      if (token && ics && dirty) {
        push(token, ics).catch(() => {});
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [token, ics, dirty, push]);

  const create = useCallback(async () => {
    if (!ics) {
      toast.error("Ajoutez au moins un cours avant de créer le lien");
      return;
    }
    const t = crypto.randomUUID();
    try {
      await push(t, ics);
      window.localStorage.setItem(STORAGE_KEY, t);
      setToken(t);
      toast.success("Lien d'abonnement créé");
    } catch (e) {
      toast.error("Impossible de créer le lien (vérifiez votre connexion)");
    }
  }, [ics, push]);

  const revoke = useCallback(async () => {
    if (!token) return;
    try {
      await deleteFn({ data: { token } });
    } catch {
      /* ignore, will 404 next fetch */
    }
    window.localStorage.removeItem(STORAGE_KEY);
    lastPushedRef.current = null;
    setToken(null);
    setDirty(false);
    setLastSyncAt(null);
    toast.success("Lien révoqué");
  }, [token, deleteFn]);

  return { token, syncing, dirty, lastSyncAt, create, revoke };
}
