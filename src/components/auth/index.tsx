import {
  forwardRef,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FormHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { splitWordmark, wordmarkSize } from "@/lib/wordmark";
import styles from "./Auth.module.css";

const BRAND = "JACOB DE JESUS";

/* ------------------------------------------------------------------ */
/* Mise en page : panneau de marque a gauche, formulaire a droite      */
/* ------------------------------------------------------------------ */

interface AuthShellProps {
  title: string;
  subtitle?: string;
  /** Phrase affichee sous le logotype (ordinateur seulement). */
  pitch?: string;
  /** « admin » : panneau noir. « page » : pas de panneau, carte centree. */
  variant?: "customer" | "admin" | "page";
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  pitch,
  variant = "customer",
  children,
  footer,
}: AuthShellProps) {
  const header = (
    <>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </>
  );

  if (variant === "page") {
    return (
      <div className={styles.pageOnly}>
        <div className={`${styles.card} ${styles.cardBoxed}`}>
          {header}
          {children}
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </div>
    );
  }

  const lines = splitWordmark(BRAND);
  const style = {
    "--wm-desktop": wordmarkSize(lines, 34, 16),
    "--wm-mobile": wordmarkSize([BRAND], 80, 14),
  } as CSSProperties;

  return (
    <div
      className={`${styles.shell} ${variant === "admin" ? styles.admin : ""}`}
      style={style}
    >
      <aside className={styles.panel}>
        <Link
          to="/"
          className={styles.brand}
          aria-label="JACOB DE JESUS, retour à l'accueil"
        >
          <span className={styles.wmDesktop} aria-hidden="true">
            {lines.map((line, i) => (
              <span key={i} className={styles.wmLine}>
                {line}
              </span>
            ))}
          </span>
          <span className={styles.wmMobile} aria-hidden="true">
            {BRAND}
          </span>
        </Link>
        {pitch && <p className={styles.pitch}>{pitch}</p>}
      </aside>
      <section className={styles.content}>
        <div className={styles.card}>
          {header}
          {children}
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulaire et champs                                                */
/* ------------------------------------------------------------------ */

export function AuthForm(props: FormHTMLAttributes<HTMLFormElement>) {
  const { className, ...rest } = props;
  return <form className={`${styles.form} ${className ?? ""}`} {...rest} />;
}

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** « code » : grand champ centre pour un code a 6 chiffres. */
  variant?: "default" | "code";
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  (
    { label, error, hint, id, type = "text", variant = "default", className, ...rest },
    ref
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const messageId = `${inputId}-message`;
    const [visible, setVisible] = useState(false);
    const isPassword = type === "password";
    const message = error ?? hint;

    const classes = [
      styles.input,
      error ? styles.inputError : "",
      isPassword ? styles.inputWithToggle : "",
      variant === "code" ? styles.inputCode : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <div className={styles.control}>
          <input
            ref={ref}
            id={inputId}
            type={isPassword && visible ? "text" : type}
            className={classes}
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setVisible((v) => !v)}
              aria-controls={inputId}
            >
              {visible ? "Masquer" : "Afficher"}
            </button>
          )}
        </div>
        {message && (
          <p
            id={messageId}
            className={error ? styles.error : styles.hint}
            role={error ? "alert" : undefined}
          >
            {message}
          </p>
        )}
      </div>
    );
  }
);
AuthField.displayName = "AuthField";

/* ------------------------------------------------------------------ */
/* Messages, boutons, liens                                            */
/* ------------------------------------------------------------------ */

export function AuthAlert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success";
}) {
  return (
    <div
      className={`${styles.alert} ${tone === "success" ? styles.alertSuccess : ""}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function AuthText({ children }: { children: ReactNode }) {
  return <p className={styles.text}>{children}</p>;
}

export function AuthSubmit({
  loading,
  loadingLabel,
  children,
}: {
  loading?: boolean;
  loadingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={styles.submit}
      disabled={loading}
      aria-busy={loading || undefined}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

/** Lien qui a l'apparence du bouton principal. */
export function AuthButtonLink(props: LinkProps) {
  const { className, ...rest } = props;
  return <Link className={`${styles.submit} ${className ?? ""}`} {...rest} />;
}

/** Petit bouton secondaire (type button). */
export function AuthGhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, type = "button", ...rest } = props;
  return (
    <button type={type} className={`${styles.ghost} ${className ?? ""}`} {...rest} />
  );
}

/** Lien souligne dans le texte. */
export function AuthLink(props: LinkProps) {
  const { className, ...rest } = props;
  return <Link className={`${styles.link} ${className ?? ""}`} {...rest} />;
}
