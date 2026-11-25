import "./styles/globals.css";
import "./styles/legacy-compat.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { AuthGate } from "./features/auth/AuthGate";
import { DisplayPage } from "./features/display/DisplayPage";
import { HistorySync } from "./nav/history";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { TooltipProvider } from "./components/ui/tooltip";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const DevRoutes = import.meta.env.DEV ? React.lazy(() => import("./dev/DevRoutes")) : null;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <GoogleOAuthProvider clientId={clientId}>
            <Routes>
              {DevRoutes && (
                <Route
                  path="/dev/*"
                  element={
                    <React.Suspense fallback={null}>
                      <DevRoutes />
                    </React.Suspense>
                  }
                />
              )}
              <Route
                path="*"
                element={
                  <AuthGate>
                    <Routes>
                      <Route
                        path="/"
                        element={
                          <>
                            <App />
                            <HistorySync />
                          </>
                        }
                      />
                      <Route path="/display" element={<DisplayPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AuthGate>
                }
              />
            </Routes>
          </GoogleOAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>
);
