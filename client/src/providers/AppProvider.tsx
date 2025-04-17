/**
 * Main application provider component
 * Combines all providers and initializes app features
 */

import React, { ReactNode, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { ModelConfigProvider } from '../hooks/use-combined-model-config';
import appInitializer from '../utils/app-initializer';

interface AppProviderProps {
  children: ReactNode;
}

/**
 * Core application provider component
 * - Initializes the application
 * - Provides global context
 * - Configures shared services
 * - Handles theme preferences
 */
export function AppProvider({ children }: AppProviderProps) {
  // Initialize app on first render
  useEffect(() => {
    appInitializer.initialize();
    
    // Log app version in development mode
    if (appInitializer.isDevelopment()) {
      console.log(`[App] Memory monitoring and cleanup enabled`);
    }
    
    // Add global event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  // Global error handler
  const handleGlobalError = (event: ErrorEvent) => {
    console.error('[App] Unhandled error:', event.error);
    
    // Here you could send errors to a monitoring service
    if (appInitializer.isProduction()) {
      // sendErrorToMonitoringService(event.error);
    }
  };
  
  // Handle unhandled promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('[App] Unhandled promise rejection:', event.reason);
    
    // Here you could send errors to a monitoring service
    if (appInitializer.isProduction()) {
      // sendErrorToMonitoringService(event.reason);
    }
  };
  
  return (
    // App context providers
    <ModelConfigProvider>
      {/* Global toast notifications component */}
      <Toaster />
      
      {/* Main application content */}
      {children}
    </ModelConfigProvider>
  );
}

export default AppProvider;