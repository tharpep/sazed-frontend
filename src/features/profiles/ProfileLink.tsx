import type { KeyboardEvent, MouseEvent } from "react";

import { cn } from "@/lib/utils";
import { useNavStore } from "@/store/navStore";

export function ProfileLink({ name, className }: { name: string; className?: string }) {
  function open(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    useNavStore.getState().openItem({ kind: "profile", id: name });
  }
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          open(e);
        }
      }}
      className={cn("cursor-pointer text-primary hover:underline", className)}
    >
      {name}
    </span>
  );
}
