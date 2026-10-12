import styles from "./AnnouncementBanner.module.css";

interface AnnouncementBannerProps {
  text: string;
}

export function AnnouncementBanner({ text }: AnnouncementBannerProps) {
  if (!text || text.trim().length === 0) return null;

  return (
    <div className={styles.banner} role="status">
      <div className={styles.track}>
        <span className={styles.text}>{text}</span>
        <span className={styles.text} aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
