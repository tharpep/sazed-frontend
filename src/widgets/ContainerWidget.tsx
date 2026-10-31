import { gib } from "@/features/homelab/format";

import styles from "./StatusCard.module.css";

interface ContainerWidgetProps {
  vmid: number;
  name: string;
  status: string;
  cpu_percent?: number | null;
  mem_used_bytes?: number | null;
  mem_total_bytes?: number | null;
  disk_used_bytes?: number | null;
  disk_total_bytes?: number | null;
}

function usage(used?: number | null, total?: number | null): string | null {
  return used != null && total ? `${gib(used)} of ${gib(total)} GB` : null;
}

export function ContainerWidget(props: ContainerWidgetProps) {
  const { vmid, name, status, cpu_percent } = props;
  const running = status === "running";
  const rows: [string, string | null][] = [
    ["CPU", cpu_percent != null ? `${cpu_percent}%` : null],
    ["Memory", usage(props.mem_used_bytes, props.mem_total_bytes)],
    ["Disk", usage(props.disk_used_bytes, props.disk_total_bytes)],
  ];

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.label}>Container {vmid}</span>
        <span className={`${styles.status} ${running ? "" : styles.attention}`}>{status}</span>
      </div>
      <span className={styles.title}>{name}</span>
      {running && (
        <div className={`${styles.list} ${styles.meta}`}>
          {rows.map(([label, value]) =>
            value ? (
              <div key={label} className={styles.row}>
                <span className={styles.rowTitle}>{label}</span>
                <span className={styles.rowMeta}>{value}</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
