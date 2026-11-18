import { apiFetch } from "./client";
import type { CardStage, ProjectCard } from "./projects";

// --- Types (mirror sazed app/board/service.py board()) ---

export interface Board {
  stages: CardStage[];
  counts: Record<CardStage, number>;
  cards: ProjectCard[];
}

/** Every card with its computed stage; done cards only from the last 14 days. */
export async function getBoard(): Promise<Board> {
  return apiFetch("/board") as Promise<Board>;
}
