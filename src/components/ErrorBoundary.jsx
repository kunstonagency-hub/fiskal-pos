import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

// 🛡️ Error Boundary: captura errores en componentes hijos
// y muestra una UI de recuperación en lugar de tumbar toda la app.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Registrar en consola para debug
    console.error("🛡️ ErrorBoundary capturó un error:", error);
    console.error("Detalles:", errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleHardReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const areaName = this.props.areaName || "esta sección";
      return (
        <div
          style={{
            padding: "40px 24px",
            maxWidth: "600px",
            margin: "40px auto",
            background: "#ffffff",
            border: "2px solid #e05d5d",
            borderRadius: "12px",
            boxShadow: "0 4px 16px rgba(224, 93, 93, 0.15)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#fff5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#e05d5d",
            }}
          >
            <AlertTriangle size={32} />
          </div>

          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "800",
              color: "#111827",
            }}
          >
            Algo falló en {areaName}
          </h3>

          <p
            style={{
              margin: "0 0 20px 0",
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: "1.5",
            }}
          >
            El resto de la aplicación sigue funcionando. Puedes intentar
            recargar esta sección o, si el problema persiste, recargar toda la
            página.
          </p>

          {this.state.error && (
            <details
              style={{
                textAlign: "left",
                background: "#f8f9fa",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "20px",
                fontSize: "12px",
                color: "#6b7280",
                fontFamily: "monospace",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                Detalles técnicos (para soporte)
              </summary>
              <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                {String(this.state.error?.message || this.state.error)}
              </div>
            </details>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: "10px 18px",
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={14} /> Reintentar esta vista
            </button>
            <button
              type="button"
              onClick={this.handleHardReload}
              style={{
                padding: "10px 18px",
                background: "#fff",
                color: "#e05d5d",
                border: "1px solid #e05d5d",
                borderRadius: "6px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Recargar toda la app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;