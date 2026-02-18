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
      <div
        className={`${styles.dot} ${styles.red}`}
        title="Close"
        onClick={handleClose}
      />
      <div
        className={`${styles.dot} ${styles.yellow}`}
        title="Minimize"
        onClick={handleMinimize}
      />
      <div
        className={`${styles.dot} ${styles.green}`}
        title="Maximize / Restore"
        onClick={handleMaximize}
      />
    </div>
  );
}
