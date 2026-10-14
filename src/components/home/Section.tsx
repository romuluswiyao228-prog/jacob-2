import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, Skeleton, ErrorState } from "@/components/ui";
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
  moreLabel = "Tout voir",
  tone = "plain",
  children,
}: SectionProps) {
  // Une section sans donnees disparait : pas de titre au-dessus du vide.
  if (!isLoading && !error && !hasData) return null;

  return (
    <section
      className={`${styles.section} ${tone === "paper" ? styles.paper : ""}`}
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {moreHref && hasData && !isLoading && !error && (
            <Link to={moreHref} className={styles.more}>
              {moreLabel}
            </Link>
          )}
        </div>
        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.skeletonRow}>
              <Skeleton variant="rect" height="300px" />
              <Skeleton variant="rect" height="300px" />
              <Skeleton variant="rect" height="300px" />
              <Skeleton variant="rect" height="300px" />
            </div>
          ) : error ? (
            <ErrorState
              message={error}
              action={
                onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Réessayer
                  </Button>
                )
              }
            />
          ) : (
            children
          )}
        </div>
      </div>
    </section>
  );
}
