import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Page } from "@/components/system";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { ViewPicker } from "@/components/shell/ViewPicker";
import { cn } from "@/lib/utils";
import {
  createBacklogItem,
  getBacklogItem,
  listBacklog,
  approveBacklogItem,
  updateBacklogItem,
  type BacklogItem,
  type BacklogType,
} from "@/api/backlog";
import { getBoard } from "@/api/board";
import { errorText } from "@/api/homelab";
import type { CardStage, ProjectCard } from "@/api/projects";
import { JobSheet } from "@/features/jobs/JobSheet";
import { SUB_CHOICES, useNavStore, useSub, type SubValue } from "@/store/navStore";
import { BacklogSheet } from "./BacklogSheet";
import { CardRow, CardTile, type CardView } from "./BoardCards";
import { TYPE_LABEL, ageLabel, isOpenStatus } from "./format";
import { NEXT_LIMIT, STAGES, backlogId, groupByStage, olderDone, openingStage, shownNext, type StageInfo } from "./stages";

const REFRESH_MS = 15_000;
const OPEN_REFRESH_MS = 60_000;
const WIDE_QUERY = "(min-width: 1100px)";
const STAGE_KEY = "sazed-board-stage";
const STOPPED = new Set(["failed", "timed_out", "cancelled"]);

const TYPE_CHOICES = SUB_CHOICES["work:board.type"].map((id) => ({
  id,
  label: id === "all" ? "All" : TYPE_LABEL[id],
}));

const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function savedStage(): CardStage | null {
  try {
    const id = sessionStorage.getItem(STAGE_KEY);
    return STAGES.some((s) => s.id === id) ? (id as CardStage) : null;
  } catch {
    return null;
  }
}

function saveStage(id: CardStage) {
  try {
    sessionStorage.setItem(STAGE_KEY, id);
  } catch {
    return;
  }
}

const shortRepo = (repo: string | undefined) => repo?.split("/").pop() ?? null;

function matchesType(item: BacklogItem, type: SubValue<"work:board.type">) {
  return type === "all" || item.type === type;
}

export function BacklogPage() {
  const navItem = useNavStore((s) => s.open["work:board"]);
  const openId = navItem?.kind === "backlog" ? navItem.id : null;
  const typeChoice = useSub("work:board.type");
  const wide = useWide();
  const [cards, setCards] = useState<ProjectCard[] | null>(null);
  // Open backlog items carry what a board card lacks: status, every repo, and when it was filed.
  const [openItems, setOpenItems] = useState<BacklogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  // A stage picked by hand holds for the session; otherwise the opening rule picks one per visit.
  const [stage, setStage] = useState<CardStage | null>(savedStage);
  const [showAllNext, setShowAllNext] = useState(false);
  const [older, setOlder] = useState<{ done: BacklogItem[]; dismissed: BacklogItem[] } | null>(null);
  const [olderShown, setOlderShown] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  // Held apart from the board so the sheet stays on an item that just moved to another stage.
  const [fetched, setFetched] = useState<BacklogItem | null>(null);
  const openItem = fetched && fetched.id === openId ? fetched : null;
  const [jobId, setJobId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ type: BacklogType; title: string; summary: string }>({
    type: "bug",
    title: "",
    summary: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const requestId = useRef(0);
  const olderRequestId = useRef(0);
  const openRequestId = useRef(0);
  const openFetchedAt = useRef(0);
  const olderShownRef = useRef(false);

  useEffect(() => {
    if (!openId) return;
    let live = true;
    getBacklogItem(openId)
      .then((item) => live && setFetched(item))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [openId]);

  const loadOlder = useCallback(async () => {
    const id = ++olderRequestId.current;
    try {
      const [done, dismissed] = await Promise.all([listBacklog("done", undefined, 500), listBacklog("dismissed", undefined, 500)]);
      if (id !== olderRequestId.current) return;
      setOlder({ done, dismissed });
      setOlderError(null);
    } catch (err) {
      if (id === olderRequestId.current) setOlderError(errorText(err));
    }
  }, []);

  const loadOpen = useCallback(async () => {
    const id = ++openRequestId.current;
    openFetchedAt.current = Date.now();
    try {
      const open = await listBacklog("open", undefined, 500);
      if (id === openRequestId.current) setOpenItems(open);
    } catch (err) {
      if (id === openRequestId.current) setError(errorText(err));
    }
  }, []);

  // Only the newest request of each kind may land, so a slow poll never replaces a later answer.
  // The board is small and carries the stages, so it polls; the open list and the older lists are
  // large and change mostly through actions taken here, so they refresh far less often.
  const load = useCallback(
    async ({ open = false, older = false }: { open?: boolean; older?: boolean } = {}) => {
      const id = ++requestId.current;
      const jobs: Promise<unknown>[] = [];
      if (open || Date.now() - openFetchedAt.current >= OPEN_REFRESH_MS) jobs.push(loadOpen());
      if (older && olderShownRef.current) jobs.push(loadOlder());
      try {
        const board = await getBoard();
        if (id !== requestId.current) return;
        setCards(board.cards);
        setError(null);
      } catch (err) {
        if (id === requestId.current) setError(errorText(err));
      }
      await Promise.all(jobs);
    },
    [loadOpen, loadOlder]
  );
  const reload = useCallback(() => load({ open: true, older: true }), [load]);

  useEffect(() => {
    load({ open: true });
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden) load({ open: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const groups = useMemo(() => (cards ? groupByStage(cards, typeChoice) : null), [cards, typeChoice]);
  const shownStage = stage ?? (groups ? openingStage(groups) : null);

  // The opening stage is fixed once the first answer lands, so a poll never moves the screen.
  useEffect(() => {
    if (stage === null && groups) setStage(openingStage(groups));
  }, [stage, groups]);

  async function add() {
    setAddError(null);
    try {
      await createBacklogItem({ type: draft.type, title: draft.title.trim(), summary: draft.summary.trim() });
      setDraft({ type: draft.type, title: "", summary: "" });
      setAdding(false);
      await reload();
    } catch (err) {
      setAddError(errorText(err));
    }
  }

  async function act(fn: () => Promise<unknown>) {
    setActing(true);
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setActing(false);
    }
  }

  function openBacklog(id: string) {
    useNavStore.getState().openItem({ kind: "backlog", id });
  }

  function close() {
    useNavStore.getState().closeItem("backlog");
  }

  function pickStage(id: CardStage) {
    saveStage(id);
    setStage(id);
  }

  function revealOlder() {
    olderShownRef.current = true;
    setOlderShown(true);
    loadOlder();
  }

  const openById = useMemo(() => new Map(openItems.map((i) => [i.id, i])), [openItems]);

  function boardView(card: ProjectCard): CardView {
    const id = backlogId(card);
    const item = id ? openById.get(id) : undefined;
    const dismissible = item !== undefined && isOpenStatus(item.status);
    const approvable = dismissible && item.repos.length === 1 && (card.stage === "inbox" || card.stage === "next");
    const type = card.item_type ? TYPE_LABEL[card.item_type as BacklogType] ?? card.item_type : null;
    return {
      key: card.id,
      title: card.title,
      next: card.next,
      meta: [type, card.repo, ageLabel(item?.created_at ?? card.updated_at)].filter(Boolean).join(" · "),
      place: card.stage,
      rank: card.rank,
      failed: card.job_status !== null && STOPPED.has(card.job_status),
      onOpen: () => {
        if (id) openBacklog(id);
        else if (card.job_id) setJobId(card.job_id);
      },
      onApprove: approvable ? () => act(() => approveBacklogItem(item.id, item.repos[0], "")) : undefined,
      onDismiss: dismissible ? () => act(() => updateBacklogItem(item.id, { status: "dismissed" })) : undefined,
    };
  }

  function itemView(item: BacklogItem, place: "older" | "dismissed"): CardView {
    return {
      key: item.id,
      title: item.title,
      next: place === "older" ? "Done" : "Dismissed",
      meta: [TYPE_LABEL[item.type], shortRepo(item.repos[0]), ageLabel(item.decided_at ?? item.updated_at)]
        .filter(Boolean)
        .join(" · "),
      place,
      rank: null,
      failed: false,
      onOpen: () => openBacklog(item.id),
    };
  }

  const count = (id: CardStage) => groups?.[id].length ?? 0;

  function stageCards(id: CardStage): CardView[] {
    if (!groups) return [];
    return (id === "next" ? shownNext(groups.next, showAllNext) : groups[id]).map(boardView);
  }

  function nextToggle(className: string): ReactNode {
    const total = count("next");
    if (total <= NEXT_LIMIT) return null;
    return (
      <button type="button" onClick={() => setShowAllNext((v) => !v)} className={className}>
        {showAllNext ? `Show the top ${NEXT_LIMIT} only` : `Show all ${total}`}
      </button>
    );
  }

  function doneTail(
    render: (card: CardView) => ReactNode,
    linkClass: string,
    headClass: string,
    listClass: string
  ): ReactNode {
    if (!olderShown) {
      return (
        <button type="button" onClick={revealOlder} className={linkClass}>
          Show older done and dismissed cards
        </button>
      );
    }
    if (olderError) return <p className={cn(headClass, "text-destructive")}>Couldn't load older cards: {olderError}</p>;
    if (!older) return <p className={headClass}>Loading older cards…</p>;
    const oldDone = olderDone(cards ?? [], older.done).filter((i) => matchesType(i, typeChoice));
    const dismissed = older.dismissed.filter((i) => matchesType(i, typeChoice));
    return (
      <>
        <p className={headClass}>Older{oldDone.length === 0 && ": none"}</p>
        <div className={listClass}>{oldDone.map((i) => render(itemView(i, "older")))}</div>
        <p className={headClass}>Dismissed, outside the stages{dismissed.length === 0 && ": none"}</p>
        <div className={listClass}>{dismissed.map((i) => render(itemView(i, "dismissed")))}</div>
      </>
    );
  }

  const typePicker = (
    <ViewPicker
      title="Board type"
      prefix="Type"
      choices={TYPE_CHOICES}
      value={typeChoice}
      onChange={(id) => useNavStore.getState().setSub("work:board.type", id as typeof typeChoice)}
      compact={wide}
    />
  );

  const summary = (
    <span className="truncate text-meta text-muted">
      {STAGES.map((s, i) => {
        const att = s.id === "needs_me" && count(s.id) > 0;
        return (
          <span key={s.id} className={cn(att && "text-warn")}>
            {i > 0 && " · "}
            <b className={cn("font-medium", att ? "text-warn" : "text-ink")}>{count(s.id)}</b> {s.name.toLowerCase()}
          </span>
        );
      })}
    </span>
  );

  const notices = (
    <>
      {adding && (
        <section aria-label="Add a card" className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex gap-2">
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as BacklogType })}
              aria-label="Type"
              className={cn(field, "w-auto")}
            >
              {(Object.keys(TYPE_LABEL) as BacklogType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              aria-label="Title"
              placeholder="Short title"
              className={field}
            />
          </div>
          <textarea
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            rows={3}
            aria-label="Details"
            placeholder="Details (optional, markdown)"
            className={cn(field, "resize-y")}
          />
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <Button className="h-11 self-end px-4 sm:h-7 sm:px-2.5" disabled={draft.title.trim().length < 3} onClick={add}>
            Add
          </Button>
        </section>
      )}
      {actionError && <p className="text-sm text-destructive">That didn't go through: {actionError}</p>}
      {error && <p className="text-sm text-destructive">Couldn't load the board: {error}</p>}
      {!cards && !error && <p className="text-sm text-muted">Loading…</p>}
    </>
  );

  const addAction = { label: "Add card", onClick: () => setAdding((v) => !v) };

  return (
    <Page>
      {wide ? (
        <>
          <div className="flex flex-none flex-col gap-2 px-6 pt-3.5">
            {/* From 640px ToolsRow only portals the action into the title row; the row here is the board's own. */}
            <ToolsRow action={addAction} />
            <div className="mb-1 flex min-w-0 items-center gap-2">
              {summary}
              <span className="flex-1" />
              {typePicker}
            </div>
            {notices}
          </div>
          {groups && (
            <div className="flex min-h-0 flex-1 gap-3 px-6 pb-4">
              {STAGES.map((s) => (
                <Column key={s.id} stage={s} count={count(s.id)}>
                  {stageCards(s.id).map((c) => (
                    <CardTile key={c.key} card={c} acting={acting} />
                  ))}
                  {s.id === "next" && nextToggle(COLUMN_LINK)}
                  {s.id === "done" &&
                    doneTail(
                      (c) => <CardTile key={c.key} card={c} acting={acting} />,
                      COLUMN_LINK,
                      "px-1 pt-2.5 pb-0.5 text-caption text-muted",
                      "grid gap-1.5"
                    )}
                </Column>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {groups && shownStage && (
            <StageBar groups={groups} value={shownStage} onPick={pickStage} />
          )}
          <div className="flex flex-none flex-col gap-2 px-3 pt-2.5 sm:px-6">
            <ToolsRow picker={typePicker} action={addAction} />
            {notices}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
            {groups && shownStage && (
              <StageList
                stage={STAGES.find((s) => s.id === shownStage)!}
                count={count(shownStage)}
                cards={stageCards(shownStage)}
                acting={acting}
                tail={
                  shownStage === "next"
                    ? nextToggle(LIST_LINK)
                    : shownStage === "done"
                      ? doneTail(
                          (c) => <CardRow key={c.key} card={c} acting={acting} />,
                          LIST_LINK,
                          "px-1 pt-3.5 pb-0.5 text-caption text-muted",
                          "divide-y divide-line"
                        )
                      : null
                }
              />
            )}
          </div>
        </>
      )}

      <BacklogSheet
        item={openItem}
        card={openId ? (cards?.find((c) => backlogId(c) === openId) ?? null) : null}
        rankedCount={openItems.filter((i) => i.rank != null && isOpenStatus(i.status)).length}
        onClose={close}
        onChanged={(updated) => {
          // An action that finishes after the sheet closed or moved to another card must not bring it back.
          setFetched((cur) => (cur?.id === updated.id ? updated : cur));
          reload();
        }}
        onOpenJob={(id) => {
          close();
          setJobId(id);
        }}
      />
      <JobSheet jobId={jobId} onClose={() => setJobId(null)} onChanged={reload} onOpenJob={setJobId} />
    </Page>
  );
}

const LIST_LINK =
  "mt-0.5 flex min-h-11 w-full items-center rounded-lg pr-1 pl-9 text-left text-meta text-muted transition-colors hover:bg-surface hover:text-ink";
const COLUMN_LINK =
  "rounded-md px-1 py-1.5 text-left text-meta text-muted transition-colors hover:bg-surface hover:text-ink";

function StageBar({
  groups,
  value,
  onPick,
}: {
  groups: Record<CardStage, ProjectCard[]>;
  value: CardStage;
  onPick: (id: CardStage) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Stages"
      className="mx-3 mt-2 grid flex-none grid-cols-5 gap-0.5 rounded-[10px] border border-line bg-surface p-0.5 sm:mx-6 sm:mt-3.5"
    >
      {STAGES.map((s) => {
        const n = groups[s.id].length;
        const on = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={`${s.name}, ${n}`}
            onClick={() => onPick(s.id)}
            className={cn(
              "grid min-h-[50px] min-w-0 content-center justify-items-center rounded-lg py-0.5 text-ink-2 transition-colors",
              on ? "bg-raised text-ink" : "hover:bg-raised/60"
            )}
          >
            <b
              className={cn(
                "font-mono text-[15px] leading-5",
                n === 0 ? "font-normal text-muted" : s.id === "needs_me" ? "font-medium text-warn" : "font-medium text-ink"
              )}
            >
              {n}
            </b>
            <span className={cn("text-caption whitespace-nowrap", on && "font-medium")}>{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function StageList({
  stage,
  count,
  cards,
  acting,
  tail,
}: {
  stage: StageInfo;
  count: number;
  cards: CardView[];
  acting: boolean;
  tail: ReactNode;
}) {
  return (
    <section role="tabpanel" aria-label={stage.name}>
      <div className="flex flex-wrap items-baseline gap-2 px-1 pt-1.5 pb-1.5">
        <h2 className="text-title font-semibold text-ink">{stage.name}</h2>
        <span className="font-mono text-meta text-muted">{count}</span>
        <p className="basis-full text-meta text-muted">{stage.say}</p>
      </div>
      {cards.length === 0 ? (
        <p className="py-3.5 pr-1 pl-9 text-meta text-muted">{stage.none}</p>
      ) : (
        <div className="divide-y divide-line">
          {cards.map((c) => (
            <CardRow key={c.key} card={c} acting={acting} />
          ))}
        </div>
      )}
      {tail}
    </section>
  );
}

function Column({ stage, count, children }: { stage: StageInfo; count: number; children: ReactNode }) {
  // An empty stage folds to a strip; Done stays open because older and dismissed cards hang off it.
  if (count === 0 && stage.id !== "done") {
    return (
      <section
        aria-label={`${stage.name}, 0 cards`}
        className="mt-1.5 flex w-[52px] flex-none flex-col items-center gap-2.5 rounded-[10px] border border-line bg-surface py-3 text-ink-2"
      >
        <span className="rotate-180 text-meta whitespace-nowrap [writing-mode:vertical-rl]">
          <b className="mb-1.5 inline-block font-mono font-normal text-muted">0</b> {stage.name}
        </span>
      </section>
    );
  }
  const att = stage.id === "needs_me";
  return (
    <section
      aria-label={stage.name}
      className="flex min-h-0 min-w-0 basis-0 flex-col"
      style={{ flexGrow: stage.id === "next" ? 1.35 : stage.id === "done" ? 0.8 : 1 }}
    >
      <div className="flex flex-none flex-wrap items-baseline gap-2 px-1 pt-1.5 pb-2">
        <h2 className="text-body font-medium text-ink">{stage.name}</h2>
        <span className={cn("font-mono text-meta", att ? "text-warn" : "text-muted")}>{count}</span>
        <small className="basis-full text-caption text-muted">{stage.say}</small>
      </div>
      {/* max-content rows: a tile clips its swipe offset, so an auto row would let it shrink to nothing. */}
      <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-1.5 overflow-y-auto p-0.5 pb-2">
        {count === 0 && (
          <p className="rounded-lg border border-dashed border-line px-2.5 py-3 text-meta text-muted">{stage.none}</p>
        )}
        {children}
      </div>
    </section>
  );
}
