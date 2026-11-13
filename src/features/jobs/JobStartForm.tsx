import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { errorText } from "@/api/homelab";
import { startCodeTask, startResearch, startSecondOpinion } from "@/api/jobs";

const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

type Mode = "research" | "second_opinion" | "code_review";

export function JobStartForm({ onStarted, onChanged }: { onStarted: (id: string) => void; onChanged: () => Promise<void> }) {
  const [mode, setMode] = useState<Mode>("research");
  const [text, setText] = useState("");
  const [repo, setRepo] = useState("");
  const [deep, setDeep] = useState(false);
  const [saveToKb, setSaveToKb] = useState(false);
  const [makePr, setMakePr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const job =
        mode === "research"
          ? await startResearch(text.trim(), deep ? "deep" : "quick", saveToKb)
          : mode === "code_review"
            ? await startCodeTask(repo.trim(), text.trim(), makePr ? "change" : "review")
            : await startSecondOpinion(text.trim());
      setText("");
      setMessage({ text: "Started. It shows below; tap it to follow along.", error: false });
      await onChanged();
      onStarted(job.id);
    } catch (err) {
      setMessage({ text: errorText(err), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Start a job" className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div role="tablist" aria-label="Job type" className="flex gap-1 rounded-md bg-surface p-0.5">
        {([["research", "Research"], ["second_opinion", "Second opinion"], ["code_review", "Code review"]] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded px-2 py-1.5 text-sm transition-colors",
              mode === m ? "bg-bg text-ink shadow-sm" : "text-muted hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "code_review" && (
        <input
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          aria-label="Repository"
          placeholder="Repo, e.g. sazed or tharpep/sazed-worker"
          className={field}
        />
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={mode === "research" ? 3 : 5}
        aria-label={mode === "research" ? "Question" : "What to review"}
        placeholder={
          mode === "research"
            ? "What do you want researched?"
            : mode === "code_review"
              ? "What should Claude Code look at? e.g. review the error handling in the job runner"
              : "Paste the plan, decision or answer you want a second opinion on"
        }
        className={cn(field, "resize-y")}
      />
      {mode === "code_review" && (
        <label className="flex items-center justify-between gap-3 text-sm text-ink">
          Make the change as a PR (you review and merge)
          <Switch aria-label="Make the change as a PR" checked={makePr} onCheckedChange={setMakePr} />
        </label>
      )}
      {mode === "research" && (
        <div className="flex flex-col gap-2 text-sm text-ink">
          <label className="flex items-center justify-between gap-3">
            Deep (several minutes, full report)
            <Switch aria-label="Deep research" checked={deep} onCheckedChange={setDeep} />
          </label>
          <label className="flex items-center justify-between gap-3">
            Save to knowledge base
            <Switch aria-label="Save to knowledge base" checked={saveToKb} onCheckedChange={setSaveToKb} />
          </label>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {mode === "code_review"
            ? makePr
              ? "Claude Code (Sonnet 5.5) edits a copy; the bot opens a PR"
              : "Claude Code (Sonnet 5.5), read-only"
            : "Gemini 3.8 Flash (High) on the worker"}
        </p>
        <Button
          size="sm"
          disabled={busy || text.trim().length < 3 || (mode === "code_review" && !repo.trim())}
          onClick={submit}
        >
          {busy ? "Starting…" : "Start"}
        </Button>
      </div>
      {message && (
        <p role="status" className={cn("text-sm", message.error ? "text-destructive" : "text-muted")}>
          {message.text}
        </p>
      )}
    </section>
  );
}
