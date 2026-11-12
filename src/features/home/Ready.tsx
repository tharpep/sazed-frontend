import type { BacklogItem } from "@/api/backlog";
import { TYPE_LABEL } from "@/features/backlog/format";

import { Group, MoreLink } from "./Group";
import { goTo, openBacklogItem } from "./homeNav";

interface Props {
  top: BacklogItem[];
  total: number | null;
}

/** The top of the backlog priority. A row opens the card on the board, where Approve and Park live. */
export function Ready({ top, total }: Props) {
  const hidden = (total ?? 0) - top.length;
  return (
    <Group
      name="Ready"
      count={total}
      empty="Nothing is ready to start."
      extra={<span className="font-normal text-muted max-sm:hidden">ranked by Sazed, you approve</span>}
    >
      <ul className="@container/ready">
        {top.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => openBacklogItem(item.id)}
              className="grid min-h-12 w-full grid-cols-[22px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-0.5 px-1 py-2 text-left sm:rounded-lg sm:px-3 sm:hover:bg-surface @min-[700px]/ready:grid-cols-[22px_minmax(150px,250px)_minmax(0,1fr)] @min-[700px]/ready:gap-x-3"
            >
              <span className="text-center font-mono text-caption text-muted tabular-nums">{item.rank}</span>
              <span className="min-w-0">
                <span className="block text-body font-medium [overflow-wrap:anywhere] text-ink">{item.title}</span>
                <span className="block truncate text-caption text-muted">
                  {[TYPE_LABEL[item.type], item.repos.map((r) => r.replace(/^[^/]+\//, "")).join(", "), item.effort]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              {item.why && (
                <span className="col-start-2 line-clamp-2 text-meta text-ink-2 @min-[700px]/ready:col-start-3 @min-[700px]/ready:row-start-1">
                  {item.why}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <MoreLink onClick={() => goTo({ hub: "work", view: "board" })} className="mt-0.5 ml-[34px] max-sm:my-0 sm:ml-[46px]">
          {hidden} more on the board
        </MoreLink>
      )}
    </Group>
  );
}
