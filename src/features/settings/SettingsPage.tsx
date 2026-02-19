import { useState, useEffect } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import styles from "./SettingsPage.module.css";

const BUILD_BASE =
  (import.meta.env.VITE_SAZED_URL as string | undefined) || "http://localhost:8000";
const BUILD_KEY = (import.meta.env.VITE_API_KEY as string | undefined) || "";

interface SettingsPageProps {
  onClose: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const {
    useBuildDefaults,
    apiBaseUrl,
    apiKey,
    setUseBuildDefaults,
    setApiBaseUrl,
    setApiKey,
    save,
    getEffectiveBase,
    getEffectiveKey,
  } = useSettingsStore();

  const [localUseBuild, setLocalUseBuild] = useState(useBuildDefaults);
  const [localBase, setLocalBase] = useState(apiBaseUrl);
  const [localKey, setLocalKey] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalUseBuild(useBuildDefaults);
    setLocalBase(apiBaseUrl);
    setLocalKey(apiKey);
  }, [useBuildDefaults, apiBaseUrl, apiKey]);

  function handleSave() {
    save({
      useBuildDefaults: localUseBuild,
      apiBaseUrl: localBase.trim() || BUILD_BASE,
      apiKey: localKey,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleUseBuildChange(checked: boolean) {
    setLocalUseBuild(checked);
    if (checked) {
      setLocalBase(BUILD_BASE);
      setLocalKey(BUILD_KEY);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.section}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={localUseBuild}
              onChange={(e) => handleUseBuildChange(e.target.checked)}
            />
            <span>Use build-time defaults</span>
          </label>
          <p className={styles.hint}>
            When on, the app uses the URL and API key from the build (e.g. .env). Turn off to
            override for this device.
          </p>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Sazed API base URL</label>
          <input
            type="url"
            className={styles.input}
            value={localBase}
            onChange={(e) => setLocalBase(e.target.value)}
            placeholder={BUILD_BASE}
            disabled={localUseBuild}
            autoComplete="url"
          />
          {localUseBuild && (
            <p className={styles.effective}>Using: {getEffectiveBase()}</p>
          )}
        </div>

        <div className={styles.section}>
          <label className={styles.label}>API key (optional)</label>
          <input
            type="password"
            className={styles.input}
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            placeholder={BUILD_KEY ? "••••••••" : "Leave empty if not required"}
            disabled={localUseBuild}
            autoComplete="off"
          />
          {localUseBuild && (getEffectiveKey() ? (
            <p className={styles.effective}>Using build key</p>
          ) : null)}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={handleSave}>
            {saved ? "Saved" : "Save"}
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
