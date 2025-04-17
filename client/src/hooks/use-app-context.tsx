/**
 * Centralized application context
 * This provides a single source of truth for all application state
 */

import React, { createContext, ReactNode, useContext } from 'react';
import { useSimplifiedAuth, AuthState } from './simplified-auth';

/**
 * Combined application context that provides access to all global state
 */
interface AppContextType {
  auth: AuthState;
  // Add other contexts as needed (UI state, settings, etc.)
}

// Create the context with a default value
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Provider component that wraps the entire application
 * and provides access to all global state through a single context
 */
export function AppContextProvider({ children }: { children: ReactNode }) {
  // Get authentication state from our hook
  const auth = useSimplifiedAuth();
  
  // Combine all application state
  const value: AppContextType = {
    auth,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access the app context from any component
 */
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}

/**
 * Specialized hooks for accessing specific parts of the context
 * This reduces the need for destructuring in components
 */
export function useAppAuth() {
  const { auth } = useAppContext();
  return auth;
}

// Add more specialized hooks as needed
// export function useAppModels() {
//   const { models } = useAppContext();
//   return models;
// }