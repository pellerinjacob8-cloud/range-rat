import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { ThemeProvider } from "./context/ThemeContext";
import { initSentry } from "./lib/sentry";
import "./styles.css";

initSentry();

const router = getRouter();

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);
