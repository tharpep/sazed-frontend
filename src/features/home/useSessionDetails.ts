import { useEffect, useRef, useState } from "react";

import { getSession, type Session, type SessionDetail } from "@/api/sessions";

const EVERY_MS = 10_000;

/** Each listed session's agents and steps. A session is fetched again only once Sazed has heard
 * from it since the last fetch, and at most every 10 s, so a quiet session costs nothing. Driven
 * by the command poll, so it stops whenever that poll does. */
export function useSessionDetails(sessions: readonly Session[] | undefined): Record<string, SessionDetail> {
  const [details, setDetails] = useState<Record<string, SessionDetail>>({});
  const fetched = useRef(new Map<string, { at: number; heard: string }>());
  const listed = useRef(new Set<string>());

  useEffect(() => {
    const list = sessions ?? [];
    listed.current = new Set(list.map((s) => s.session_id));
    for (const id of fetched.current.keys()) if (!listed.current.has(id)) fetched.current.delete(id);
    const now = Date.now();
    for (const s of list) {
      const prev = fetched.current.get(s.session_id);
      if (prev && (prev.heard === s.last_heard_at || now - prev.at < EVERY_MS)) continue;
      fetched.current.set(s.session_id, { at: now, heard: s.last_heard_at });
      getSession(s.session_id).then(
        (detail) => {
          if (!listed.current.has(s.session_id)) return;
          setDetails((cur) => {
            const kept = Object.fromEntries(Object.entries(cur).filter(([k]) => listed.current.has(k)));
            return { ...kept, [s.session_id]: detail };
          });
        },
        // A failed fetch is tried again after the same 10 s.
        () => fetched.current.set(s.session_id, { at: Date.now(), heard: "" })
      );
    }
  }, [sessions]);

  return details;
}
