
// client/src/main.tsx (or similar)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css"; // <-- new Tailwind entry

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);