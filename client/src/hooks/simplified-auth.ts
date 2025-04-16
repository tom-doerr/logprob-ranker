import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { authStorage } from '../utils/storage';
import { 
  generateCodeVerifier, 
  createSHA256CodeChallenge 
} from '../utils/pkce';
import { generateAuthUrl } from '../lib/openrouter';

export type AuthMethod = 'oauth' | 'manual' | 'browser' | null;

/**
 * Simple interface for authentication state and methods
 */
export interface AuthState {
  // Auth status
  isAuthenticated: boolean;
  isInitialized: boolean;
  method: AuthMethod;
  
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
  // Auth state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [method, setMethod] = useState<AuthMethod>(null);
  const [manualKey, setManualKey] = useState('');
  
  // Load saved auth on mount
  useEffect(() => {
    restorePreviousAuth();
    setIsInitialized(true);
  }, []);
  
  // Restores previous authentication if available
  const restorePreviousAuth = (): boolean => {
    const { apiKey, method } = authStorage.getAuthData();
    
    if (apiKey && authStorage.isValidApiKey(apiKey)) {
      // Set auth state
      setIsAuthenticated(true);
      setMethod(method);
      
      // Notify app of auth change
      window.dispatchEvent(new Event('auth-changed'));
      
      toast({
        title: 'AUTHENTICATION RESTORED',
        description: 'Your previous credentials have been retrieved',
        duration: 3000,
      });
      
      return true;
    }
    
    return false;
  };
  
  // Manual key submission
  const submitManualKey = () => {
    if (!manualKey.trim()) return;
    
    if (authStorage.isValidApiKey(manualKey)) {
      // Save auth data
      authStorage.saveAuth(manualKey, 'manual');
      
      // Update state
      setIsAuthenticated(true);
      setMethod('manual');
      setManualKey('');
      
      // Notify app
      window.dispatchEvent(new Event('auth-changed'));
      
      toast({
        title: 'AUTHENTICATION COMPLETE',
        description: 'Your credentials have been saved',
      });
    } else {
      toast({
        title: 'INVALID API KEY',
        description: 'Please check your API key format',
        variant: 'destructive',
      });
    }
  };
  
  // OAuth flow
  const startOAuth = async () => {
    try {
      // Generate and save code verifier
      const codeVerifier = generateCodeVerifier();
      authStorage.saveCodeVerifier(codeVerifier);
      
      // Generate code challenge
      const codeChallenge = await createSHA256CodeChallenge(codeVerifier);
      
      // Save preferred auth method
      authStorage.saveAuth('pending-oauth', 'oauth');
      setMethod('oauth');
      
      // Generate callback URL based on environment
      const origin = window.location.origin;
      const isReplit = origin.includes('.replit.dev') || origin.includes('.replit.app');
      let callbackUrl;
      
      if (isReplit) {
        // Handle potential path prefix in Replit deployment
        const currentPath = window.location.pathname;
        const basePath = currentPath.split('/').slice(0, -1).join('/') || '';
        callbackUrl = `${origin}${basePath}/callback`;
      } else {
        // Standard local or production environment
        callbackUrl = `${origin}/callback`;
      }
      
      // Generate and navigate to auth URL
      const authUrl = generateAuthUrl(codeChallenge, callbackUrl);
      window.location.href = authUrl;
      
      toast({
        title: 'REDIRECTING TO AUTHENTICATION',
        description: 'You will be redirected to OpenRouter to authenticate',
        duration: 3000,
      });
    } catch (error) {
      console.error('OAuth error:', error);
      toast({
        title: 'AUTHENTICATION ERROR',
        description: 'Failed to start the authentication process',
        variant: 'destructive',
      });
    }
  };
  
  // Browser model mode
  const enableBrowserMode = () => {
    // Save browser mode
    authStorage.saveAuth('browser-llm', 'browser');
    
    // Update state
    setIsAuthenticated(true);
    setMethod('browser');
    
    // Notify app
    window.dispatchEvent(new Event('auth-changed'));
    
    toast({
      title: 'BROWSER MODE ACTIVATED',
      description: 'Using WebLLM for in-browser inference',
    });
  };
  
  // Logout
  const logout = () => {
    // Clear auth data
    authStorage.clearAuth();
    
    // Update state
    setIsAuthenticated(false);
    setMethod(null);
    
    // Notify app
    window.dispatchEvent(new Event('auth-changed'));
    
    toast({
      title: 'LOGGED OUT',
      description: 'Authentication credentials removed',
    });
  };
  
  return {
    isAuthenticated,
    isInitialized,
    method,
    manualKey,
    setManualKey,
    submitManualKey,
    startOAuth,
    enableBrowserMode,
    restorePreviousAuth,
    logout
  };
}