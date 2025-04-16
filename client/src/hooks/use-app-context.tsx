import React, { createContext, useContext, ReactNode } from 'react';
import { useSimplifiedAuth, AuthState } from './simplified-auth';
import { useModels, ModelSelectionState } from './use-models';

/**
 * Combined application context that provides access to all global state
 */
interface AppContextType {
  auth: AuthState;
  models: ModelSelectionState;
  // Add other contexts as needed (UI state, settings, etc.)
}

const AppContext = createContext<AppContextType | null>(null);

/**
 * Provider component that wraps the entire application
 * and provides access to all global state through a single context
 */
export function AppContextProvider({ children }: { children: ReactNode }) {
  // Initialize all hooks
  const auth = useSimplifiedAuth();
  const models = useModels();
  
  // Combined context value
  const value: AppContextType = {
    auth,
    models,
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
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}

/**
 * Specialized hooks for accessing specific parts of the context
 * This reduces the need for destructuring in components
 */
export function useAppAuth() {
  return useAppContext().auth;
}

export function useAppModels() {
  return useAppContext().models;
}