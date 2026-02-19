import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../../lib/isTauri";
import styles from "./TrafficLights.module.css";

function handleClose() {
  if (!isTauri) return;
  void getCurrentWindow().close();
}

function handleMinimize() {
  if (!isTauri) return;
  void getCurrentWindow().minimize();
}

function handleMaximize() {
  if (!isTauri) return;
  void getCurrentWindow().toggleMaximize();
}

export function TrafficLights() {
  return (
    <div className={styles.lights}>
      <button
        className={`${styles.btn} ${styles.btnMin}`}
        title="Minimize"
        onClick={handleMinimize}
      >
        −
      </button>
      <button
        className={`${styles.btn} ${styles.btnMax}`}
        title="Maximize / Restore"
        onClick={handleMaximize}
      >
        □
      </button>
      <button
        className={`${styles.btn} ${styles.btnClose}`}
        title="Close"
        onClick={handleClose}
      >
        ×
      </button>
    </div>
  );
}
