import { useState, useEffect } from "react";
import styles from "./AnnouncementBanner.module.css";

interface AnnouncementBannerProps {
  text: string;
}

export function AnnouncementBanner({ text }: AnnouncementBannerProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.("change", handler);
    return () => mediaQuery.removeEventListener?.("change", handler);
  }, []);

  const messages = (text || "")
    .split("\n")
    .map((m) => m.trim())
    .filter(Boolean);

  // 0 message : bandeau masque
  if (messages.length === 0) return null;

  // 1 message ou prefers-reduced-motion : texte centre fixe
  if (messages.length === 1 || prefersReducedMotion) {
    return (
      <div className={styles.banner} role="status">
        <div className={styles.singleMessage}>
          <span className={styles.text}>{messages[0]}</span>
        </div>
      </div>
    );
  }

  // 2 messages ou plus : defilement continu avec separateurs, pause au survol et au focus
  return (
    <div className={styles.banner} role="status" tabIndex={0}>
      <div className={styles.track}>
        <div className={styles.trackGroup}>
          {messages.map((msg, i) => (
            <span key={`msg-1-${i}`} className={styles.messageItem}>
              <span className={styles.text}>{msg}</span>
              <span className={styles.separator} aria-hidden="true">•</span>
            </span>
          ))}
        </div>
        <div className={styles.trackGroup} aria-hidden="true">
          {messages.map((msg, i) => (
            <span key={`msg-2-${i}`} className={styles.messageItem}>
              <span className={styles.text}>{msg}</span>
              <span className={styles.separator} aria-hidden="true">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
