import { Link } from "react-router-dom";
import type { PublicStoreSettings } from "@/lib/db-types";
import styles from "./Footer.module.css";

interface FooterProps {
  settings: PublicStoreSettings | null;
}

export function Footer({ settings }: FooterProps) {
  const hasEmail = settings?.email && settings.email.trim().length > 0;
  const hasPhone = settings?.phone && settings.phone.trim().length > 0;
  const hasAddress = settings?.address && settings.address.trim().length > 0;
  const hasCity = settings?.city && settings.city.trim().length > 0;
  const hasSocial =
    settings?.social_links && Object.keys(settings.social_links).length > 0;

  const socialEntries = hasSocial
    ? Object.entries(settings!.social_links).filter(
        ([, url]) => url && url.trim().length > 0
      )
    : [];

  const hasContact = hasEmail || hasPhone || hasAddress || hasCity;

  if (!hasContact && !hasSocial) {
    return (
      <footer className={styles.footer}>
        <div className={styles.inner}>
          <p className={styles.storeName}>
            {settings?.store_name ?? "JACOB DE JESUS"}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* Store identity */}
          <div className={styles.col}>
            <p className={styles.storeName}>
              {settings?.store_name ?? "JACOB DE JESUS"}
            </p>
            {settings?.description && (
              <p className={styles.description}>{settings.description}</p>
            )}
          </div>

          {/* Contact */}
          {hasContact && (
            <div className={styles.col}>
              <h3 className={styles.heading}>Contact</h3>
              {hasEmail && (
                <a
                  href={`mailto:${settings!.email}`}
                  className={styles.link}
                >
                  {settings!.email}
                </a>
              )}
              {hasPhone && (
                <a
                  href={`tel:${settings!.phone}`}
                  className={styles.link}
                >
                  {settings!.phone}
                </a>
              )}
              {(hasAddress || hasCity) && (
                <p className={styles.text}>
                  {[settings?.address, settings?.city, settings?.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Social */}
          {socialEntries.length > 0 && (
            <div className={styles.col}>
              <h3 className={styles.heading}>Suivez-nous</h3>
              {socialEntries.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
