import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.addEventListener("unhandledrejection", (event) => {
  // Helps pinpoint "UNHANDLED_PROMISE_REJECTION" issues in logs.
  console.error("[unhandledrejection]", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
