import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import appInitializer from "./utils/app-initializer";
import { AppProvider } from "./providers/AppProvider";

// Initialize the application
appInitializer.initialize();

// Create React root and render app
const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
