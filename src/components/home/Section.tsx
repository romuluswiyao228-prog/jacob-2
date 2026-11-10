import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Skeleton, ErrorState, Reveal } from "@/components/ui";
import styles from "./Section.module.css";

interface SectionProps {
  title: string;
  isLoading?: boolean;
  error?: string | null;
  hasData?: boolean;
  onRetry?: () => void;
  /** Lien « Tout voir » a droite du titre. */
  moreHref?: string;
  moreLabel?: string;
  /** « paper » : fond gris clair pour alterner avec le blanc. */
  tone?: "plain" | "paper";
  children: ReactNode;
}

export function Section({
  title,
  isLoading,
  error,
  hasData = true,
  onRetry,
  moreHref,
  moreLabel,
  tone = "plain",
  children,
}: SectionProps) {
  const { t } = useTranslation();
  // Une section sans donnees disparait : pas de titre au-dessus du vide.
  if (!isLoading && !error && !hasData) return null;

  const resolvedMoreLabel = moreLabel ?? t("common.seeAll", "Tout voir");

  return (
    <Reveal
      as="section"
      className={`${styles.section} ${tone === "paper" ? styles.paper : ""}`}
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {moreHref && hasData && !isLoading && !error && (
            <Link to={moreHref} className={styles.more}>
              {resolvedMoreLabel}
            </Link>
          )}
        </div>
        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.skeletonRow}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <Skeleton variant="rect" className={styles.skeletonImage} />
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="40%" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState
              message={error}
              action={
                onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    {t("common.retry", "Réessayer")}
                  </Button>
                )
              }
            />
          ) : (
            children
          )}
        </div>
      </div>
    </Reveal>
  );
}
