import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  action?: { label: string; onClick: () => void };
}

/** What a list says when it has nothing: what would appear here, and how to get some. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="text-body font-medium text-ink">{title}</p>
      {children && <p className="max-w-sm text-meta text-muted">{children}</p>}
      {action && (
        <Button variant="outline" size="sm" className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
