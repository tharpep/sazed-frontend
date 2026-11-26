import { ListRow, ListSection } from "@/components/system";
import { Button } from "@/components/ui/button";
import { ALL_ACCOUNTS, type Account, type Figure, type ReviewId } from "./data";
import { Amount } from "./Masked";
import { CheckRing, SectionHead, Spark, StaleRing } from "./parts";
import { useOpenSheet } from "./sheets/openSheet";

function longAge(f: Figure): string {
  return f.ageDays === 0
    ? `${f.source} · today`
    : `${f.source} · ${f.when}, ${f.ageDays} day${f.ageDays === 1 ? "" : "s"} ago`;
}

const SHORT_SOURCE: Partial<Record<Figure["source"], string>> = {
  "Weekly balance email": "Weekly email",
  "Statement email": "Statement",
};

function shortAge(f: Figure): string {
  return `${SHORT_SOURCE[f.source] ?? f.source} · ${f.ageDays === 0 ? "today" : `${f.ageDays} d`}`;
}

function AccountRow({ account, openReview }: { account: Account; openReview: ReviewId[] }) {
  const { figure } = account;
  const openSheet = useOpenSheet();
  if (!figure) {
    return (
      <ListRow
        title={account.name}
        description="No figure yet"
        detail={
          <span className="flex flex-wrap gap-2 pt-1.5">
            <Button variant="outline" className="h-11 text-meta md:h-8" onClick={() => openSheet({ kind: "capture" })}>
              Share a screenshot
            </Button>
            <Button
              variant="outline"
              className="h-11 text-meta md:h-8"
              onClick={() => openSheet({ kind: "manual", id: account.id })}
            >
              Type it in
            </Button>
          </span>
        }
        meta={<span className="text-body text-muted">—</span>}
      />
    );
  }
  const needsCheck = account.reviewId !== undefined && openReview.includes(account.reviewId);
  return (
    <ListRow
      leading={account.stale ? <StaleRing /> : needsCheck && <CheckRing />}
      title={account.name}
      onClick={() => openSheet({ kind: "account", id: account.id })}
      description={
        <span className={account.stale ? "text-warn" : undefined}>
          <span className="md:hidden">{shortAge(figure)}</span>
          <span className="hidden md:inline">{longAge(figure)}</span>
        </span>
      }
      meta={
        <span className="flex items-center gap-2 pt-0.5 md:gap-3">
          <Spark points={account.history} />
          <Amount plain value={figure.value} className="text-right text-body text-ink md:min-w-24" />
        </span>
      }
    />
  );
}

export function Accounts({ accounts, openReview }: { accounts: Account[]; openReview: ReviewId[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead title="Accounts" count={ALL_ACCOUNTS} />
      <ListSection>
        {accounts.filter((a) => !a.owed).map((a) => (
          <AccountRow key={a.id} account={a} openReview={openReview} />
        ))}
      </ListSection>
      <ListSection title="Owed">
        {accounts.filter((a) => a.owed).map((a) => (
          <AccountRow key={a.id} account={a} openReview={openReview} />
        ))}
      </ListSection>
    </section>
  );
}
