
import React, { useEffect, useState } from "react";
import "./App.css";

const apiBase = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");

function App() {
  const [health, setHealth] = useState<string>("(not checked yet)");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!apiBase) return; // no API configured yet
    let cancelled = false;

    fetch(`${apiBase}/health`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (!cancelled) setHealth(JSON.stringify(json, null, 2));
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "request_failed");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎬 Welcome to BFFlix</h1>
        <p>Frontend is live. This page is here just to verify deployments.</p>
        <p>
          Backend base URL:{" "}
          <code>{apiBase || "(not set — add REACT_APP_API_BASE to your env)"}</code>
        </p>

        {apiBase ? (
          <div style={{ maxWidth: 720, textAlign: "left" }}>
            <p>
              <strong>GET {apiBase}/health</strong>:
            </p>
            {error ? (
              <code style={{ color: "#ffb4b4" }}>Error: {error}</code>
            ) : (
              <pre style={{ whiteSpace: "pre-wrap" }}>{health}</pre>
            )}
          </div>
        ) : (
          <p>Set <code>REACT_APP_API_BASE</code> to enable the live health check.</p>
        )}
      </header>
    </div>
  );
}

export default App;