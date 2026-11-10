import { useState, useEffect } from "react";
import { Marquee } from "@/components/ui";
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

  // 0 message : bandeau masqué
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

  // 2 messages ou plus : utilise Marquee
  return (
    <div className={styles.banner} role="status" tabIndex={0}>
      <Marquee speed={25} pauseOnHover pauseOnFocus>
        <div className={styles.trackGroup}>
          {messages.map((msg, i) => (
            <span key={`msg-${i}`} className={styles.messageItem}>
              <span className={styles.text}>{msg}</span>
              <span className={styles.separator} aria-hidden="true">•</span>
            </span>
          ))}
        </div>
      </Marquee>
    </div>
  );
}
