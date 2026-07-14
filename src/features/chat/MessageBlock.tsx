import React, { memo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Message as MessageType, ToolBlock } from "@/mock/data";
import { ToolCallCard } from "@/features/chat/ToolCallCard";
import { StreamingIndicator } from "@/features/chat/StreamingIndicator";
import { WidgetRenderer } from "@/widgets/WidgetRenderer";
import { useChatStore } from "@/store/chatStore";

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS_FULL = [rehypeHighlight];
const REHYPE_PLUGINS_NONE: never[] = [];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs text-muted transition-colors hover:text-ink"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-ink first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-ink first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-ink first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold text-ink first:mt-0">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-border pl-3 text-muted last:mb-0">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className={cn(className, "text-sm")} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-ink" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => {
    const codeEl = React.Children.toArray(children)[0] as React.ReactElement<{
      className?: string;
      children?: string;
    }>;
    const lang = codeEl?.props?.className?.replace("language-", "") ?? "";
    const raw = codeEl?.props?.children ?? "";
    return (
      <div className="mb-3 overflow-hidden rounded-lg border border-border last:mb-0">
        {lang && (
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-1.5">
            <span className="font-mono text-xs text-muted">{lang}</span>
            <CopyButton text={String(raw)} />
          </div>
        )}
        <pre {...props} className="overflow-x-auto bg-surface/60 p-3">
          {children}
        </pre>
      </div>
    );
  },
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-border px-2 py-1.5 text-left font-medium text-ink">{children}</th>,
  td: ({ children }) => <td className="border-b border-border px-2 py-1.5 text-ink">{children}</td>,
};

function MessageMarkdown({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={isStreaming ? REHYPE_PLUGINS_NONE : REHYPE_PLUGINS_FULL}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}

interface MessageBlockProps {
  message: MessageType;
  index?: number;
  isLastStreaming?: boolean;
}

export const MessageBlock = memo(function MessageBlock({ message, index, isLastStreaming = false }: MessageBlockProps) {
  const isUser = message.role === "user";
  const prefersReducedMotion = useReducedMotion();
  const hasBlocks = !isUser && message.blocks && message.blocks.length > 0;
  const isStreaming = useChatStore((s) => s.isStreaming);
  const editMessage = useChatStore((s) => s.editMessage);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const canEdit = isUser && index !== undefined && !message.isError && !isStreaming;

  function startEdit() {
    setDraft(message.content);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content && index !== undefined) {
      editMessage(index, trimmed);
    }
    setIsEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  const toolBlocks: ToolBlock[] = hasBlocks
    ? (message.blocks!.filter((b) => b.type === "tool") as ToolBlock[])
    : [];
  const visibleBlocks = hasBlocks ? message.blocks!.filter((b) => b.type !== "tool") : [];

  const showDots = isLastStreaming && !isUser && visibleBlocks.length === 0 && !message.content;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn("max-w-2xl", isUser ? "ml-auto" : "mr-auto")}
    >
      <div className={cn("mb-1 text-xs font-medium text-muted", isUser && "text-right")}>
        {isUser ? "You" : "Sazed"}
      </div>

      {toolBlocks.length > 0 && <ToolCallCard tools={toolBlocks} />}

      {visibleBlocks.length > 0 ? (
        visibleBlocks.map((block, i) =>
          block.type === "ui" ? (
            <WidgetRenderer key={i} name={block.component} props={block.props} />
          ) : (
            <div key={i} className="text-[0.9375rem] leading-[1.55] text-ink">
              <MessageMarkdown
                content={block.content}
                isStreaming={isLastStreaming && i === visibleBlocks.length - 1}
              />
            </div>
          )
        )
      ) : showDots ? (
        <StreamingIndicator />
      ) : message.content ? (
        isUser ? (
          isEditing ? (
            <div className="flex flex-col items-end gap-2">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleEditKeyDown}
                rows={Math.min(8, draft.split("\n").length || 1)}
                className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-right text-[0.9375rem] leading-[1.55] text-ink outline-none"
              />
              <div className="flex gap-3">
                <button type="button" onClick={cancelEdit} className="text-xs text-muted transition-colors hover:text-ink">
                  Cancel
                </button>
                <button type="button" onClick={saveEdit} className="text-xs font-medium text-primary hover:underline">
                  Save &amp; submit
                </button>
              </div>
            </div>
          ) : (
            <div className="group/msg flex items-start justify-end gap-1.5">
              {canEdit && (
                <button
                  type="button"
                  onClick={startEdit}
                  aria-label="Edit message"
                  className="-mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted opacity-60 transition-opacity hover:bg-surface hover:text-ink hover:opacity-100 focus-visible:opacity-100 active:opacity-100"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
              )}
              <p className={cn("whitespace-pre-wrap text-[0.9375rem] leading-[1.55]", "text-right text-ink")}>
                {message.content}
              </p>
            </div>
          )
        ) : message.isError ? (
          <p className="text-[0.9375rem] leading-[1.55] text-destructive">{message.content}</p>
        ) : (
          <div className="text-[0.9375rem] leading-[1.55] text-ink">
            <MessageMarkdown content={message.content} isStreaming={isLastStreaming} />
          </div>
        )
      ) : null}
    </motion.div>
  );
});
