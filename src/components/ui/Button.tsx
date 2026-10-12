import { type ButtonHTMLAttributes, forwardRef } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const sizeMap: Record<Size, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

const variantMap: Record<Variant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  outline: styles.outline,
  ghost: styles.ghost,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref
  ) => {
    const classes = [
      styles.btn,
      variantMap[variant],
      sizeMap[size],
      fullWidth ? styles.fullWidth : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...rest}
      >
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        <span className={isLoading ? styles.labelLoading : ""}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
