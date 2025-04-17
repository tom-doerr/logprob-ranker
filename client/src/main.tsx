import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeApp, registerHmrReconnectHandler } from "./utils/app-initializer";

// Initialize the app with persistence management
initializeApp({
  showReloadNotifications: true,
  onNormalLoad: () => {
    console.log('[App] Normal load - initializing fresh state');
  },
  onQuickReload: () => {
    console.log('[App] Quick reload detected - preserving state');
  }
});

// Register HMR reconnect handler to maintain state during development
registerHmrReconnectHandler();

// Create React root and render app
const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
