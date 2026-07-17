/* Friendly crash screen — no white death on iPhone */

import React from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    try {
      console.error("[OZGYM]", error, info?.componentStack);
    } catch {
      /* ignore */
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const msg =
      this.state.error?.message ||
      "Etwas ist schiefgelaufen. Deine Daten sind lokal gespeichert.";

    return (
      <div className="ig-error-boundary" role="alert">
        <div className="ig-error-boundary-card">
          <div className="ig-error-boundary-icon" aria-hidden="true">
            <AlertTriangle size={28} />
          </div>
          <h1 className="ig-error-boundary-title">Kurz ausgesetzt</h1>
          <p className="ig-error-boundary-desc">{msg}</p>
          <button
            type="button"
            className="ig-btn-primary wide xl"
            onClick={() => {
              this.setState({ error: null });
              try {
                window.location.reload();
              } catch {
                /* ignore */
              }
            }}
          >
            App neu laden
          </button>
          <button
            type="button"
            className="ig-btn-primary wide ghosted"
            onClick={() => this.setState({ error: null })}
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }
}
