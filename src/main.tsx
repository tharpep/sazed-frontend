import "./styles/tokens.css";
import "./styles/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { AuthGate } from "./features/auth/AuthGate";
import { VoicePage } from "./features/voice/VoicePage";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={clientId}>
        <AuthGate>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/voice" element={<VoicePage />} />
          </Routes>
        </AuthGate>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
