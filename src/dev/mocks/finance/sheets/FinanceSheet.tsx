import { useEffect, useState, type ReactNode } from "react";

import { SHEET_CLASS, SHEET_CLOSE_CLASS } from "@/components/shell/sheetClasses";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const MD_QUERY = "(min-width: 768px)";

function useMd(): boolean {
  const [md, setMd] = useState(() => typeof window !== "undefined" && window.matchMedia(MD_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(MD_QUERY);
    const onChange = () => setMd(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return md;
}

interface FinanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Quiet figure beside the title, such as a count. */
  count?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** A bottom sheet on phones, a right-hand panel from md. */
export function FinanceSheet({ open, onOpenChange, title, count, subtitle, footer, children }: FinanceSheetProps) {
  const md = useMd();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={md ? "right" : "bottom"}
        showCloseButton={false}
        className={cn(
          "gap-0 bg-bg text-body text-ink",
          md
            ? "border-line data-[side=right]:w-(--panel-w) data-[side=right]:sm:max-w-none"
            : cn(SHEET_CLASS, "max-h-[calc(100%_-_env(safe-area-inset-top)_-_72px)]")
        )}
      >
        <SheetHeader className="flex-row items-center gap-2 border-b border-line py-1.5 pr-1.5 pl-[18px]">
          <div className="flex min-w-0 flex-1 flex-col">
            <SheetTitle className="flex items-baseline gap-2 text-title text-ink">
              <span className="truncate">{title}</span>
              {count !== undefined && <span className="font-mono text-meta font-normal text-muted">{count}</span>}
            </SheetTitle>
            {subtitle && <SheetDescription className="text-caption text-muted">{subtitle}</SheetDescription>}
          </div>
          <SheetClose className={SHEET_CLOSE_CLASS}>Close</SheetClose>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-[18px] pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        {footer && (
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line px-3.5 pt-2.5 pb-3">{footer}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
