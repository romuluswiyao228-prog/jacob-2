import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  variant?: "text" | "rect" | "circle";
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({
  variant = "rect",
  width,
  height,
  className,
}: SkeletonProps) {
  const classes = [
    styles.skeleton,
    variant === "text" ? styles.text : "",
    variant === "circle" ? styles.circle : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
