import "./styles/tokens.css";
import "./styles/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { AuthGate } from "./features/auth/AuthGate";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthGate>
        <App />
      </AuthGate>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
