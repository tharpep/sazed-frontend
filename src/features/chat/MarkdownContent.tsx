import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import styles from "./MarkdownContent.module.css";

interface MarkdownContentProps {
  content: string;
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
  pre: ({ children }) => <pre className={styles.pre}>{children}</pre>,
  hr: () => <hr className={styles.hr} />,
  table: ({ children }) => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>{children}</table>
    </div>
  ),
  th: ({ children }) => <th className={styles.th}>{children}</th>,
  td: ({ children }) => <td className={styles.td}>{children}</td>,
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className={styles.root}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
