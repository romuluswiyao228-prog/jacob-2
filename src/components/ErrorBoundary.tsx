import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Global error boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
            background: "#0A0A0A",
            color: "#FFFFFF",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <h1
            style={{
              fontFamily: "Anton, sans-serif",
              fontSize: "32px",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            Erreur inattendue
          </h1>
          <p style={{ fontSize: "14px", color: "#a3a3a3" }}>
            Une erreur est survenue. Veuillez rafraîchir la page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "8px 16px",
              border: "1px solid #FFFFFF",
              background: "transparent",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Rafraîchir
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
