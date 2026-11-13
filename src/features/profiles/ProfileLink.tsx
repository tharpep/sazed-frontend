import type { KeyboardEvent, MouseEvent } from "react";

import { cn } from "@/lib/utils";
import { useShellStore } from "@/nav/shellFlag";
import { useNavStore } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";

export function ProfileLink({ name, className }: { name: string; className?: string }) {
  function open(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    if (useShellStore.getState().shell === "hubs") {
      useNavStore.getState().openItem({ kind: "profile", id: name });
    } else {
      const ui = useUiStore.getState();
      ui.setLinkedProfile(name);
      ui.toggleProfiles();
    }
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
