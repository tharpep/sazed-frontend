import type { ReactNode } from "react";
import styles from "./IconButton.module.css";

interface IconButtonProps {
  active?: boolean;
  title?: string;
  onClick?: () => void;
  children: ReactNode;
}

export function IconButton({ active, title, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${active ? styles.active : ""}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
