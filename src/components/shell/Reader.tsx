import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";

import { useIsMobile } from "@/hooks/useIsMobile";

interface ReaderProps {
  /** The view Back returns to, e.g. "Plans". */
  back: string;
  onBack: () => void;
  /** Phone header line, e.g. "Work › Plans". */
  context?: string;
  /** The item's actions, in the phone's bottom toolbar or beside the desktop back row. */
  actions?: ReactNode;
  children: ReactNode;
}

const MEASURE = "w-full max-w-[68ch] text-[15px]";
const BODY = "leading-6 text-ink-2";

/** Long text: full screen with a bottom toolbar on phones, inside the page with a back row on desktop. */
export function Reader({ back, onBack, context, actions, children }: ReaderProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div data-slot="reader" className={`flex flex-col ${MEASURE}`}>
        <div className="-ml-2.5 mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-meta text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {back}
          </button>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
        <article className={BODY}>{children}</article>
      </div>
    );
  }

  return createPortal(
    <div
      data-slot="reader"
      className="fixed inset-0 z-[45] flex flex-col bg-bg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-ink"
    >
      {context && (
        <header className="flex min-h-[52px] shrink-0 items-center border-b border-line px-4">
          <h1 className="min-w-0 flex-1 truncate text-meta text-muted">{context}</h1>
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pt-5 pb-8">
        <article className={`${MEASURE} ${BODY}`}>{children}</article>
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-line bg-bg px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] [&_button]:min-h-11">
        <button
          type="button"
          onClick={onBack}
          aria-label={`Back to ${back}`}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-surface pr-3.5 pl-2 text-sm text-ink transition-colors hover:bg-raised"
        >
          <ChevronLeft className="size-[18px]" aria-hidden="true" />
          {back}
        </button>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
