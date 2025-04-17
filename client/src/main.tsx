import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeApp, registerHmrReconnectHandler } from "./utils/app-initializer";
import { startMemoryMonitoring, fixCommonReactLeaks } from "./utils/memory-monitor";

// Start memory leak detection and prevention
if (process.env.NODE_ENV === 'development') {
  startMemoryMonitoring({
    enableLogging: true,
    checkInterval: 15000, // Check every 15 seconds
    warningThreshold: 100, // MB
    criticalThreshold: 150 // MB
  });
  
  // Fix common React memory leaks
  fixCommonReactLeaks();
  
  console.log('[App] Memory monitoring enabled');
}

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
