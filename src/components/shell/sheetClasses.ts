// A phone bottom sheet at the medium detent; from sm up a centred card the width of the panel.
// The position overrides repeat ui/sheet's data-[side=bottom] variant so they win on specificity.
export const SHEET_CLASS =
  "max-h-(--sheet-medium) gap-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)] sm:data-[side=bottom]:right-auto sm:data-[side=bottom]:bottom-4 sm:data-[side=bottom]:left-1/2 sm:w-(--panel-w) sm:-translate-x-1/2 sm:rounded-2xl sm:border";

export const SHEET_CLOSE_CLASS =
  "min-h-11 rounded-md px-3 text-meta text-muted transition-colors hover:bg-raised hover:text-ink";

export const SHEET_ROW_CLASS =
  "grid min-h-[52px] w-full grid-cols-[28px_minmax(0,1fr)] items-center gap-x-2.5 rounded-[10px] px-1.5 py-1 text-left text-body text-ink transition-colors hover:bg-raised";
