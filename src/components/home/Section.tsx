import { type ReactNode } from "react";
import { Button, Skeleton, ErrorState } from "@/components/ui";
import styles from "./Section.module.css";

interface SectionProps {
  title: string;
  isLoading?: boolean;
  error?: string | null;
  hasData?: boolean;
  onRetry?: () => void;
  children: ReactNode;
}

export function Section({
  title,
  isLoading,
  error,
  hasData = true,
  onRetry,
  children,
}: SectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
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
        ) : hasData ? (
          children
        ) : null}
      </div>
    </section>
  );
}
