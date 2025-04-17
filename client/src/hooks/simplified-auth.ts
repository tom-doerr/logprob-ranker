/**
 * A simplified authentication hook for consistent auth state across the application.
 * This provides a cleaner interface for working with authentication and ensures
 * credentials are properly shared between components.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { authStorage, AuthMethod } from '../utils/storage';
import { 
  createSHA256CodeChallenge,
  generateCodeVerifier
} from '../utils/pkce';

/**
 * Simplified interface for authentication state and methods
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
  submitManualKey: () => void;
  
  // Other auth methods
  startOAuth: () => Promise<void>;
  enableBrowserMode: () => void;
  restorePreviousAuth: () => boolean;
  logout: () => void;
}

/**
 * Simplified hook for authentication management
 * - Single source of truth for auth state
 * - Centralized storage
 * - Simplified interface
 */
export function useSimplifiedAuth(): AuthState {
  const { toast } = useToast();
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState('');
  const [method, setMethod] = useState<AuthMethod>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Get the authentication state from storage
  const restorePreviousAuth = useCallback(() => {
    const { apiKey, authMethod } = authStorage.getAuthData();
    
    if (apiKey && authMethod) {
      setApiKey(apiKey);
      setMethod(authMethod);
      return true;
    }
    
    return false;
  }, []);
  
  // Initialize authentication on mount
  useEffect(() => {
    restorePreviousAuth();
    setIsInitialized(true);
    
    // Listen for auth events
    const handleAuthEvent = (event: CustomEvent) => {
      if (event.detail && event.detail.apiKey) {
        setApiKey(event.detail.apiKey);
        if (event.detail.method) {
          setMethod(event.detail.method);
        }
      }
    };
    
    // Add event listener for auth changes
    window.addEventListener('auth-state-change', handleAuthEvent as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('auth-state-change', handleAuthEvent as EventListener);
    };
  }, [restorePreviousAuth]);
  
  // Manual authentication
  const submitManualKey = useCallback(() => {
    if (!manualKey.trim()) return;
    
    // Save the API key
    authStorage.saveApiKey(manualKey);
    authStorage.saveAuthMethod('manual');
    
    // Update state
    setApiKey(manualKey);
    setMethod('manual');
    setManualKey('');
    
    // Notify components
    const authEvent = new CustomEvent('auth-state-change', {
      detail: {
        apiKey: manualKey,
        method: 'manual',
        source: 'manual'
      }
    });
    window.dispatchEvent(authEvent);
    
    toast({
      title: 'AUTHENTICATION COMPLETE',
      description: 'Your API key has been saved successfully',
    });
  }, [manualKey, toast]);
  
  // OAuth authentication
  const startOAuth = useCallback(async () => {
    try {
      // Generate PKCE code verifier
      const codeVerifier = generateCodeVerifier();
      authStorage.saveCodeVerifier(codeVerifier);
      
      // Generate code challenge
      const codeChallenge = await createSHA256CodeChallenge(codeVerifier);
      
      // Generate auth URL with environment detection
      let origin = window.location.origin;
      
      // Handle case when deployed to Replit
      const isReplit = origin.includes('.replit.dev') || origin.includes('.replit.app');
      
      // Determine callback URL based on environment
      let callbackUrl;
      if (isReplit) {
        // Include potential path prefix for Replit
        const currentPath = window.location.pathname;
        const basePath = currentPath.split('/').slice(0, -1).join('/') || '';
        callbackUrl = `${origin}${basePath}/callback`;
      } else {
        // Standard local or production environment
        callbackUrl = `${origin}/callback`;
      }
      
      // Set OAuth as the preferred auth method
      authStorage.saveAuthMethod('oauth');
      setMethod('oauth');
      
      // Generate and navigate to auth URL
      const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;
      window.location.href = authUrl;
      
      toast({
        title: 'REDIRECTING TO AUTHENTICATION',
        description: 'You will be redirected to OpenRouter to authenticate',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      toast({
        title: 'AUTHENTICATION ERROR',
        description: 'Failed to start the authentication process',
        variant: 'destructive',
      });
    }
  }, [toast]);
  
  // Enable browser model mode
  const enableBrowserMode = useCallback(() => {
    const browserKey = 'browser-llm';
    authStorage.saveApiKey(browserKey);
    authStorage.saveAuthMethod('browser');
    
    setApiKey(browserKey);
    setMethod('browser');
    
    // Notify components
    const authEvent = new CustomEvent('auth-state-change', {
      detail: {
        apiKey: browserKey,
        method: 'browser',
        source: 'manual'
      }
    });
    window.dispatchEvent(authEvent);
    
    toast({
      title: 'BROWSER MODE ACTIVATED',
      description: 'Using WebLLM for in-browser inference without API keys',
    });
  }, [toast]);
  
  // Logout
  const logout = useCallback(() => {
    authStorage.clearApiKey();
    authStorage.clearAuthMethod();
    
    setApiKey(null);
    setMethod(null);
    
    // Notify components
    const authEvent = new CustomEvent('auth-state-change', {
      detail: {
        apiKey: null,
        method: null,
        source: 'logout'
      }
    });
    window.dispatchEvent(authEvent);
    
    toast({
      title: 'LOGGED OUT',
      description: 'Authentication credentials removed',
    });
  }, [toast]);
  
  return {
    isAuthenticated: !!apiKey,
    isInitialized,
    method,
    apiKey,
    manualKey,
    setManualKey,
    submitManualKey,
    startOAuth,
    enableBrowserMode,
    restorePreviousAuth,
    logout
  };
}