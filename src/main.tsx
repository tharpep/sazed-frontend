import "geist/font/sans";
import "geist/font/mono";
import "./styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { AuthGate } from "./features/auth/AuthGate";
import { DisplayPage } from "./features/display/DisplayPage";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { TooltipProvider } from "./components/ui/tooltip";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <GoogleOAuthProvider clientId={clientId}>
            <AuthGate>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/display" element={<DisplayPage />} />
              </Routes>
            </AuthGate>
          </GoogleOAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>
);
