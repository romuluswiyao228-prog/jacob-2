import styles from "./Badge.module.css";

type BadgeVariant = "new" | "sale" | "soldout" | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: string;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  new: styles.new,
  sale: styles.sale,
  soldout: styles.soldout,
  neutral: styles.neutral,
};

export function Badge({
  variant = "neutral",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={[styles.badge, variantMap[variant], className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
