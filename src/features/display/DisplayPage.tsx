import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { gib, statusOf } from "@/features/homelab/format";
import { AnswerCard, AskBar, Card, Carousel, Chips, Empty, Row } from "./parts";
import { chips, firstThing, mailFrom, nextUp, senderName, subjectLine, week, type Item } from "./items";
import { useDisplayFeed, type DisplayFeed } from "./useDisplayFeed";
import { useVoice } from "./useVoice";

type Mode = "landscape" | "portrait" | "wide" | "widget" | "tiny";

/** Laid out by the size of its own box, not the device, so the same page is the phone kiosk,
 * a desktop homepage and a desktop widget. */
function modeFor(w: number, h: number): Mode {
  if (w < 300 || h < 170) return "tiny";
  if (h > w * 1.15 && h >= 520) return "portrait";
  if (w < 520 || h < 300) return "widget";
  if (w >= 1100 && h >= 600) return "wide";
  return "landscape";
}

function clockPx(mode: Mode, w: number, h: number): number {
  const px = {
    landscape: Math.min(h * 0.32, w * 0.16),
    portrait: Math.min(w * 0.3, h * 0.15),
    wide: Math.min(h * 0.21, w * 0.12),
    widget: Math.min(h * 0.32, w * 0.17),
    tiny: Math.min(h * 0.29, w * 0.29),
  }[mode];
  return Math.round(px);
}

function useBox(ref: React.RefObject<HTMLElement | null>) {
  const [box, setBox] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

function useNow(ms: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Keeps the screen on while the page is visible; Android drops the lock when hidden. */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    const acquire = () => {
      if (!nav.wakeLock || document.hidden) return;
      nav.wakeLock.request("screen").then((l) => (lock = l), () => undefined);
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, []);
}

/** Installing from /display gets its own app: starts here, landscape, full screen. */
function useDisplayManifest() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const previous = link.href;
    link.href = "/display.webmanifest";
    return () => {
      link.href = previous;
    };
  }, []);
}

const DRIFT_PX = 6;

/** Moves everything a few pixels each minute so no pixel of the OLED shows the same thing all day. */
function useDrift(): { x: number; y: number } {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      const r = () => Math.round((Math.random() * 2 - 1) * DRIFT_PX);
      setOffset({ x: r(), y: r() });
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return offset;
}

const NIGHT_FROM = 22;
const NIGHT_UNTIL = 7;
const WAKE_MS = 30_000;
const ANSWER_LINGER_MS = 90_000;

function isNight(now: Date): boolean {
  const h = now.getHours();
  return h >= NIGHT_FROM || h < NIGHT_UNTIL;
}

function clockText(now: Date): string {
  return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/, "");
}

function dateText(now: Date, short = false): string {
  return now.toLocaleDateString("en-US", short ? { weekday: "short", month: "short", day: "numeric" } : { weekday: "long", month: "long", day: "numeric" });
}

function weatherText(feed: DisplayFeed, short = false): string | null {
  const w = feed.weather;
  if (!w) return null;
  return short ? `${w.temp}°` : `${w.temp}° ${w.condition.toLowerCase()}, high ${w.high}`;
}

function NextUpCard({ items }: { items: Item[] }) {
  return (
    <Card title="Next up">
      {items.length ? items.map((i) => <Row key={i.key} item={i} />) : <Empty>Nothing coming up this week.</Empty>}
    </Card>
  );
}

function WeekCard({ feed, now }: { feed: DisplayFeed; now: Date }) {
  const groups = week(feed, now);
  return (
    <Card title="This week">
      {groups.length ? (
        groups.map((g) => (
          <div key={g.label} className="mb-1">
            <div data-fit="label" className="pt-1.5 text-[14px] text-muted">{g.label}</div>
            {g.items.map((i) => (
              <Row key={i.key} item={i} />
            ))}
          </div>
        ))
      ) : (
        <Empty>Nothing on the calendar this week.</Empty>
      )}
    </Card>
  );
}

function MailCard({ feed }: { feed: DisplayFeed }) {
  const messages = feed.mail?.messages ?? [];
  const from = mailFrom(messages);
  const title = feed.mail ? `Mail · ${feed.mail.count} unread${from ? `, mostly ${from}` : ""}` : "Mail";
  return (
    <Card title={title}>
      {messages.length ? (
        messages.slice(0, 5).map((m) => (
          <Row key={m.id} item={{ key: m.id, when: senderName(m.sender), title: subjectLine(m), tone: "normal" }} />
        ))
      ) : (
        <Empty>{feed.mail ? "Inbox clear." : "Loading…"}</Empty>
      )}
    </Card>
  );
}

function HomelabCard({ feed }: { feed: DisplayFeed }) {
  const services = feed.services ?? [];
  const down = services.filter((s) => statusOf(s) === "down");
  const maintenance = services.filter((s) => statusOf(s) === "maintenance");
  const up = services.filter((s) => statusOf(s) === "up").length;
  const rows: Item[] = [
    ...down.map((s) => ({ key: `d-${s.id}`, when: "Down", title: s.name, tone: "problem" as const })),
    ...maintenance.map((s) => ({ key: `m-${s.id}`, when: "Upkeep", title: s.name, tone: "attention" as const })),
    {
      key: "up",
      when: "Services",
      title: down.length || maintenance.length ? `${up} of ${services.length} up` : `All ${up} up`,
      tone: "normal",
    },
  ];
  if (feed.mediaFree != null) rows.push({ key: "media", when: "Media", title: `${gib(feed.mediaFree)} GB free`, tone: "normal" });
  return <Card title="Homelab">{feed.services ? rows.map((i) => <Row key={i.key} item={i} />) : <Empty>Loading…</Empty>}</Card>;
}

function Clock({ now, px, className }: { now: Date; px: number; className?: string }) {
  return (
    <div
      className={cn("font-extralight leading-[0.9] tracking-[-0.04em] tabular-nums", className)}
      style={{ fontSize: px }}
      aria-label={`The time is ${clockText(now)}`}
    >
      {clockText(now)}
    </div>
  );
}

function NightFace({ now, px, line }: { now: Date; px: number; line: string | null }) {
  return (
    <div className="flex h-full flex-col items-start justify-center px-[12%]">
      <Clock now={now} px={px} className="text-[oklch(0.42_0.006_265)]" />
      {line && <div className="mt-4 text-[18px] text-[oklch(0.34_0.006_265)]">{line}</div>}
    </div>
  );
}

export function DisplayPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w, h } = useBox(rootRef);
  const mode = modeFor(w, h);
  const now = useNow(10_000);
  const feed = useDisplayFeed();
  const voice = useVoice();
  const drift = useDrift();
  const [wokeAt, setWokeAt] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchKiosk = useRef(window.matchMedia("(pointer: coarse)").matches).current;

  useWakeLock();
  useDisplayManifest();

  const { exchange, phase, conversation, dismiss } = voice;
  useEffect(() => {
    if (!exchange || phase !== "idle" || conversation) return;
    const id = setTimeout(dismiss, ANSWER_LINGER_MS);
    return () => clearTimeout(id);
  }, [exchange, phase, conversation, dismiss]);

  const px = clockPx(mode, w, h);
  const talking = Boolean(exchange) || phase !== "idle";
  const night =
    touchKiosk &&
    (mode === "landscape" || mode === "portrait") &&
    isNight(now) &&
    !talking &&
    now.getTime() - wokeAt > WAKE_MS;

  // Odd hours put the clock on the right, so its big digits don't sit on the same OLED pixels all day.
  const clockOnRight = now.getHours() % 2 === 1;
  const compact = mode === "landscape" || mode === "widget" || mode === "tiny";
  const chipList = chips(feed, compact);
  const items = nextUp(feed, now, mode === "widget" ? 2 : 8);

  const cards = [
    { key: "Next up", node: <NextUpCard items={items} /> },
    { key: "This week", node: <WeekCard feed={feed} now={now} /> },
    { key: "Mail", node: <MailCard feed={feed} /> },
    { key: "Homelab", node: <HomelabCard feed={feed} /> },
  ];
  const cardArea = exchange ? <AnswerCard exchange={exchange} phase={phase} onDone={dismiss} /> : <Carousel cards={cards} />;
  const dateLine = [dateText(now), weatherText(feed)].filter(Boolean);

  let face: ReactNode;
  if (night) {
    face = <NightFace now={now} px={px} line={firstThing(feed, now)} />;
  } else if (mode === "tiny") {
    const waiting = chipList.find((c) => c.key === "waiting");
    const next = items.find((i) => i.tone === "normal");
    face = (
      <div className="flex h-full flex-col p-4">
        <Clock now={now} px={px} />
        <div className="mt-2 text-[14px] text-ink-2">{[dateText(now, true), weatherText(feed, true)].filter(Boolean).join(" · ")}</div>
        <div className="mt-auto text-[14px]">
          {waiting && <div className="text-warn">{waiting.label}</div>}
          {next && (
            <div className="truncate text-muted">
              {next.when === "Now" ? "Now" : "Next"}: {next.title}
            </div>
          )}
        </div>
      </div>
    );
  } else if (mode === "widget") {
    face = (
      <div className="grid h-full grid-cols-[auto_minmax(0,1fr)] gap-5 p-4">
        <div className="flex flex-col">
          <Clock now={now} px={px} />
          <div className="mt-2 text-[14px] text-ink-2">{[dateText(now, true), weatherText(feed, true)].filter(Boolean).join(" · ")}</div>
          <div className="mt-auto">
            <Chips chips={chipList.filter((c) => c.key !== "lab")} small />
          </div>
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="text-[13px] text-muted">Next up</div>
          {items.map((i) => (
            <Row key={i.key} item={i} size="sm" />
          ))}
        </div>
      </div>
    );
  } else if (mode === "portrait") {
    face = (
      <div className="flex h-full flex-col px-5 pb-4 pt-[6vh]">
        <Clock now={now} px={talking ? Math.round(px * 0.55) : px} className={cn(talking && "text-ink-2")} />
        <div className="mt-3 text-[18px] text-ink-2">{dateLine.join(" · ")}</div>
        {!talking && (
          <div className="mt-4">
            <Chips chips={chipList} />
          </div>
        )}
        <div className="mt-5 min-h-0 flex-1">{cardArea}</div>
        <div className="mt-4">
          <AskBar voice={voice} />
        </div>
      </div>
    );
  } else if (mode === "wide") {
    face = (
      <div className="grid h-full grid-cols-[minmax(0,0.75fr)_minmax(0,1.6fr)] gap-10 p-12">
        <div>
          <Clock now={now} px={px} />
          <div className="mt-5 text-[22px] leading-[30px] text-ink-2">
            {dateLine.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
          <div className="mt-5">
            <Chips chips={chipList} />
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1">
            {exchange ? (
              cardArea
            ) : (
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
                {cards.map((c) => (
                  <div key={c.key} className="min-h-0 [&>*]:h-full">
                    {c.node}
                  </div>
                ))}
              </div>
            )}
          </div>
          <AskBar voice={voice} />
        </div>
      </div>
    );
  } else {
    face = (
      <div
        className={cn(
          "grid h-full gap-6 p-6",
          clockOnRight ? "grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]" : "grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
        )}
      >
        <div className={cn("flex min-w-0 flex-col pt-3", clockOnRight && "order-2")}>
          <Clock now={now} px={px} />
          <div className="mt-4 text-[18px] leading-[26px] text-ink-2">
            {dateLine.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
          <div className="mt-4">
            <Chips chips={chipList} />
          </div>
          <div className="mt-auto pt-3">
            <AskBar voice={voice} />
          </div>
        </div>
        <div className="min-h-0">{cardArea}</div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="dark fixed inset-0 select-none overflow-hidden bg-black font-sans text-ink"
      onClick={() => night && setWokeAt(Date.now())}
      onTouchStart={(e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || start.y > h * 0.4) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (dy > 90 && Math.abs(dx) < 40) window.location.reload();
      }}
    >
      <div
        className="absolute inset-0 transition-transform duration-[2000ms]"
        style={{ transform: `translate(${drift.x}px, ${drift.y}px)` }}
      >
        {face}
      </div>
    </div>
  );
}
