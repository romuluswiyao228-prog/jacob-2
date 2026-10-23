import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { PublicStoreSettings } from "@/lib/db-types";
import { wordmarkSize } from "@/lib/wordmark";
import styles from "./Footer.module.css";

interface FooterProps {
  settings: PublicStoreSettings | null;
}

export function Footer({ settings }: FooterProps) {
  const storeName = settings?.store_name?.trim() || "JACOB DE JESUS";
  const description = settings?.description?.trim() ?? "";
  const email = settings?.email?.trim() ?? "";
  const phone = settings?.phone?.trim() ?? "";
  const place = [settings?.address, settings?.city, settings?.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const socialEntries = Object.entries(settings?.social_links ?? {}).filter(
    ([, url]) => url && url.trim().length > 0
  );

  const wordmarkStyle = {
    "--wm-size": wordmarkSize([storeName], 94, 40),
  } as CSSProperties;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.colWide}>
            {description && <p className={styles.description}>{description}</p>}
          </div>

          <nav className={styles.col} aria-label="Boutique">
            <h3 className={styles.heading}>Boutique</h3>
            <Link to="/boutique" className={styles.link}>
              Toute la collection
            </Link>
            <Link to="/notre-boutique" className={styles.link}>
              Notre boutique
            </Link>
            <Link to="/favoris" className={styles.link}>
              Favoris
            </Link>
            <Link to="/panier" className={styles.link}>
              Panier
            </Link>
            <Link to="/compte" className={styles.link}>
              Mon compte
            </Link>
          </nav>

          <nav className={styles.col} aria-label="Informations légales">
            <h3 className={styles.heading}>Légal & Service</h3>
            <Link to="/conditions-generales" className={styles.link}>
              Conditions générales
            </Link>
            <Link to="/confidentialite" className={styles.link}>
              Confidentialité
            </Link>
            <Link to="/mentions-legales" className={styles.link}>
              Mentions légales
            </Link>
            <Link to="/retours" className={styles.link}>
              Retours & Échanges
            </Link>
            <Link to="/suivi" className={styles.link}>
              Suivi de commande
            </Link>
          </nav>

          <div className={styles.col}>
            <h3 className={styles.heading}>Contact</h3>
            <Link to="/contact" className={styles.link}>
              Formulaire de contact
            </Link>
            {email && (
              <a href={`mailto:${email}`} className={styles.link}>
                {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className={styles.link}>
                {phone}
              </a>
            )}
            {place && <p className={styles.text}>{place}</p>}
          </div>

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

        <p className={styles.wordmark} style={wordmarkStyle} aria-hidden="true">
          {storeName}
        </p>
        <p className={styles.legal}>
          © {new Date().getFullYear()} {storeName}
        </p>
      </div>
    </footer>
  );
}
