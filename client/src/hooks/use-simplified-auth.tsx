/**
 * Simplified authentication hook
 * Provides a clean, centralized way to handle all authentication methods
 */

import { useState, useEffect, useCallback } from 'react';
import { APP_CONFIG } from '../config/app-config';
import { generateAuthUrl } from '../lib/openrouter';
import { authStorage } from '../utils/storage';
import { apiService } from '../services/api-service';
import { createPKCECodeChallenge, generateCodeVerifier } from '../utils/pkce';
import { useToast } from '@/hooks/use-toast';

// Auth method types
export type AuthMethod = 'oauth' | 'manual' | 'browser' | null;

/**
 * Interface for authentication state and methods
 */
export interface AuthState {
  // Auth status
  isAuthenticated: boolean;
  isInitialized: boolean;
  method: AuthMethod;
  
  // Authentication data
  apiKey: string | null;
  
  // Manual auth
  manualKey: string;
  setManualKey: (key: string) => void;
  submitManualKey: () => Promise<boolean>;
  
  // Other auth methods
  startOAuth: () => Promise<void>;
  enableBrowserMode: () => void;
  restorePreviousAuth: () => boolean;
  logout: () => void;
}

/**
 * Hook for authentication management
 */
export function useSimplifiedAuth(): AuthState {
  const { toast } = useToast();
  
  // State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [manualKey, setManualKey] = useState<string>('');
  
  // Initialize auth from storage on mount
  useEffect(() => {
    restorePreviousAuth();
    setIsInitialized(true);
    
    // Register event listeners for auth state changes
    window.addEventListener('auth-state-change', handleAuthEvent);
    
    return () => {
      window.removeEventListener('auth-state-change', handleAuthEvent);
    };
  }, []);
  
  /**
   * Handle auth state change events
   */
  const handleAuthEvent = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    const { apiKey, method } = customEvent.detail || {};
    
    if (apiKey) {
      setApiKey(apiKey);
      setAuthMethod(method || 'manual');
      setIsAuthenticated(true);
    } else {
      setApiKey(null);
      setAuthMethod(null);
      setIsAuthenticated(false);
    }
  }, []);
  
  /**
   * Restore previous authentication if available
   */
  const restorePreviousAuth = useCallback((): boolean => {
    const storedApiKey = authStorage.getApiKey();
    const storedMethod = authStorage.getAuthMethod() as AuthMethod;
    
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setAuthMethod(storedMethod || 'manual');
      setIsAuthenticated(true);
      return true;
    }
    
    return false;
  }, []);
  
  /**
   * Submit manual API key
   */
  const submitManualKey = useCallback(async (): Promise<boolean> => {
    if (!manualKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter an API key to continue.',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      // Validate the key with the API
      const isValid = await apiService.validateApiKey(manualKey);
      
      if (isValid) {
        // Store the key
        authStorage.setApiKey(manualKey);
        authStorage.setAuthMethod(APP_CONFIG.AUTH.METHODS.MANUAL);
        
        // Update state
        setApiKey(manualKey);
        setAuthMethod(APP_CONFIG.AUTH.METHODS.MANUAL);
        setIsAuthenticated(true);
        
        // Reset input field
        setManualKey('');
        
        toast({
          title: 'Authentication Successful',
          description: 'Your API key has been validated and saved.',
        });
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('auth-state-change', {
          detail: { apiKey: manualKey, method: APP_CONFIG.AUTH.METHODS.MANUAL }
        }));
        
        return true;
      } else {
        toast({
          title: 'Invalid API Key',
          description: 'The API key could not be validated. Please check and try again.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error validating API key:', error);
      toast({
        title: 'Authentication Error',
        description: 'An error occurred while validating your API key. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [manualKey, toast]);
  
  /**
   * Start the OAuth flow
   */
  const startOAuth = useCallback(async (): Promise<void> => {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await createPKCECodeChallenge(codeVerifier);
      
      // Store the code verifier for later use
      localStorage.setItem('pkce-verifier', codeVerifier);
      
      // Generate the OAuth URL and redirect
      const authUrl = generateAuthUrl(codeChallenge);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      toast({
        title: 'OAuth Error',
        description: 'Could not initiate the OAuth flow. Please try again or use an API key instead.',
        variant: 'destructive',
      });
    }
  }, [toast]);
  
  /**
   * Enable browser-based model mode (no auth needed)
   */
  const enableBrowserMode = useCallback((): void => {
    setAuthMethod(APP_CONFIG.AUTH.METHODS.BROWSER);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { method: APP_CONFIG.AUTH.METHODS.BROWSER }
    }));
    
    toast({
      title: 'Browser Model Mode Enabled',
      description: 'You can now use browser-based models without API authentication.',
    });
  }, [toast]);
  
  /**
   * Logout/clear authentication
   */
  const logout = useCallback((): void => {
    // Clear storage
    authStorage.clearAuth();
    
    // Reset state
    setApiKey(null);
    setAuthMethod(null);
    setIsAuthenticated(false);
    setManualKey('');
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { apiKey: null, method: null }
    }));
    
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully.',
    });
  }, [toast]);
  
  return {
    isAuthenticated,
    isInitialized,
    method: authMethod,
    apiKey,
    manualKey,
    setManualKey,
    submitManualKey,
    startOAuth,
    enableBrowserMode,
    restorePreviousAuth,
    logout,
  };
}

export default useSimplifiedAuth;