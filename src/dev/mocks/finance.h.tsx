import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Page, PageBody } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Accounts } from "./finance/Accounts";
import {
  STATE_NAMES,
  STATES,
  type FinanceState,
  type ReviewId,
  type ReviewItem,
  type StateName,
} from "./finance/data";
import { DueSection } from "./finance/DueTimeline";
import { Chips, StaleNote, Toolbar } from "./finance/Header";
import { MaskProvider } from "./finance/Masked";
import { NetWorth } from "./finance/NetWorth";
import { CardStatements, NotActive, Purchases, Spending } from "./finance/Spending";
import { AccountSheet } from "./finance/sheets/AccountSheet";
import { AlertsSheet } from "./finance/sheets/AlertsSheet";
import { BillSheet } from "./finance/sheets/BillSheet";
import { CaptureSheet } from "./finance/sheets/CaptureSheet";
import { ManualSheet } from "./finance/sheets/ManualSheet";
import { OpenSheetContext, useOpenSheet, type SheetTarget } from "./finance/sheets/openSheet";
import { ReviewSheet } from "./finance/sheets/ReviewSheet";
import { ToCheck } from "./finance/ToCheck";

const PHONE_DAYS = 14;
const PHONE_ROWS = 3;
const DESK_DAYS = 30;
const DESK_ROWS = 7;

function readState(raw: string | null): StateName {
  return STATE_NAMES.find((s) => s === raw) ?? "month3";
}

/** On phones the two column wrappers are `contents`, so `order-*` interleaves both columns into one stack. */
function FinanceBody({ state, review, resolve }: {
  state: FinanceState;
  review: ReviewItem[];
  resolve: (id: ReviewId) => void;
}) {
  const openSheet = useOpenSheet();
  const openIds = review.map((r) => r.id);
  const looseFrom = (days: number, rows: number) => {
    const attached = state.dues.filter((d) => d.inDays <= days).slice(0, rows);
    return review.filter((r) => !attached.some((d) => d.reviewId === r.id));
  };

  return (
    <div className="flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:items-start md:gap-8">
      <div className="contents md:flex md:flex-col md:gap-5">
        <p className="order-0 text-meta text-muted md:hidden">{state.label}</p>
        {state.staleNote && (
          <div className="order-1">
            <StaleNote note={state.staleNote} />
          </div>
        )}
        <div className="order-2">
          <NetWorth state={state} />
        </div>
        <Chips toCheck={review.length} next={state.dues[0]} className="order-3 flex md:hidden" />
        <div className="order-4">
          <Accounts accounts={state.accounts} openReview={openIds} />
        </div>
        <div className="order-8 flex flex-col gap-2">
          {state.purchases && <Purchases purchases={state.purchases} className="flex" />}
          {state.statements && (
            <CardStatements spending={state.spending} statements={state.statements} className="flex" />
          )}
          <NotActive charges={state.inactive} className="flex" />
        </div>
      </div>

      <div className="contents md:flex md:flex-col md:gap-5">
        <p className="hidden text-meta text-muted md:block">
          {state.label}
          {review.length > 0 && (
            <>
              {" · "}
              <Button
                variant="link"
                className="h-auto p-0 text-meta font-medium text-warn"
                onClick={() => openSheet({ kind: "review" })}
              >
                {review.length} to check
              </Button>
            </>
          )}
        </p>
        <DueSection
          days={PHONE_DAYS}
          dues={state.dues}
          initial={PHONE_ROWS}
          today={state.today}
          review={review}
          onResolve={resolve}
          className="order-5 flex md:hidden"
        />
        <DueSection
          days={DESK_DAYS}
          dues={state.dues}
          initial={DESK_ROWS}
          today={state.today}
          review={review}
          onResolve={resolve}
          className="hidden md:flex"
        />
        <ToCheck items={looseFrom(PHONE_DAYS, PHONE_ROWS)} onResolve={resolve} className="order-6 flex md:hidden" />
        <ToCheck items={looseFrom(DESK_DAYS, DESK_ROWS)} onResolve={resolve} className="hidden md:flex" />
        <Spending state={state} className="order-7 flex" />
      </div>
    </div>
  );
}

function FinanceScreen({ name, onState }: { name: StateName; onState: (next: StateName) => void }) {
  const state = STATES[name];
  const [resolved, setResolved] = useState<ReviewId[]>([]);
  const [target, setTarget] = useState<SheetTarget | null>(null);
  const [open, setOpen] = useState(false);
  const openSheet = useCallback((next: SheetTarget) => {
    setTarget(next);
    setOpen(true);
  }, []);
  const resolve = (id: ReviewId) => setResolved((done) => [...done, id]);
  const review = state.review.filter((r) => !resolved.includes(r.id));
  const showing = (kind: SheetTarget["kind"]) => open && target?.kind === kind;

  return (
    <OpenSheetContext.Provider value={openSheet}>
      <Toolbar state={name} onState={onState} />
      <FinanceBody state={state} review={review} resolve={resolve} />
      <AccountSheet
        state={state}
        accountId={target?.kind === "account" ? target.id : null}
        open={showing("account")}
        onOpenChange={setOpen}
        onManual={(id) => openSheet({ kind: "manual", id })}
        onCapture={() => openSheet({ kind: "capture" })}
      />
      <ManualSheet
        state={state}
        accountId={target?.kind === "manual" ? (target.id ?? null) : null}
        open={showing("manual")}
        onOpenChange={setOpen}
      />
      <CaptureSheet state={state} open={showing("capture")} onOpenChange={setOpen} />
      <BillSheet
        state={{ ...state, review }}
        dueId={target?.kind === "bill" ? target.id : null}
        open={showing("bill")}
        onOpenChange={setOpen}
        onResolve={resolve}
      />
      <ReviewSheet
        state={state}
        open={showing("review")}
        onOpenChange={setOpen}
        resolved={resolved}
        onResolve={resolve}
      />
      <AlertsSheet state={state} open={showing("alerts")} onOpenChange={setOpen} />
    </OpenSheetContext.Provider>
  );
}

export default function FinanceMock() {
  const [search, setSearch] = useSearchParams();
  const name = readState(search.get("state"));
  const setState = (next: StateName) =>
    setSearch((prev) => {
      const params = new URLSearchParams(prev);
      params.set("state", next);
      return params;
    });

  return (
    <MaskProvider>
      <Page>
        <PageBody>
          <FinanceScreen key={name} name={name} onState={setState} />
        </PageBody>
      </Page>
    </MaskProvider>
  );
}
