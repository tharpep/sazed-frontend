import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import styles from "./MarkdownContent.module.css";

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS_FULL = [rehypeHighlight];
const REHYPE_PLUGINS_NONE: never[] = [];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      className={styles.copyBtn}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

const components: Components = {
  p: ({ children }) => <p className={styles.p}>{children}</p>,
  ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
  li: ({ children }) => <li className={styles.li}>{children}</li>,
  h1: ({ children }) => <h3 className={styles.heading}>{children}</h3>,
  h2: ({ children }) => <h3 className={styles.heading}>{children}</h3>,
  h3: ({ children }) => <h3 className={styles.heading}>{children}</h3>,
  h4: ({ children }) => <h4 className={styles.subheading}>{children}</h4>,
  strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
  em: ({ children }) => <em className={styles.em}>{children}</em>,
  blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
  a: ({ href, children }) => (
    <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className={`${className ?? ""} ${styles.codeBlock}`} {...props}>
          {children}
        </code>
      );
    }
    return <code className={styles.codeInline} {...props}>{children}</code>;
  },
  pre: ({ children, ...props }) => {
    const codeEl = React.Children.toArray(children)[0] as React.ReactElement<{ className?: string; children?: string }>;
    const lang = codeEl?.props?.className?.replace("language-", "") ?? "";
    const raw = codeEl?.props?.children ?? "";
    return (
      <div className={styles.codeWrapper}>
        {lang && (
          <div className={styles.codeHeader}>
            <span className={styles.codeLang}>{lang}</span>
            <CopyButton text={String(raw)} />
          </div>
        )}
        <pre {...props} className={styles.pre}>{children}</pre>
      </div>
    );
  },
  hr: () => <hr className={styles.hr} />,
  table: ({ children }) => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>{children}</table>
    </div>
  ),
  th: ({ children }) => <th className={styles.th}>{children}</th>,
  td: ({ children }) => <td className={styles.td}>{children}</td>,
};

export const MarkdownContent = memo(function MarkdownContent({ content, isStreaming = false }: MarkdownContentProps) {
  return (
    <div className={styles.root}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={isStreaming ? REHYPE_PLUGINS_NONE : REHYPE_PLUGINS_FULL}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
