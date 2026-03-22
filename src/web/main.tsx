import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("The application root element could not be found.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
