import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
// Import from the correct location
import { toast } from '../hooks/use-toast';
import { 
  generateCodeVerifier,
  createSHA256CodeChallenge
} from '../utils/pkce';
import { authStorage } from '../utils/storage';
import { generateAuthUrl } from '../lib/openrouter';

interface AuthContextType {
  // Auth state
  apiKey: string | null;
  isAuthenticated: boolean;
  authMethod: 'oauth' | 'manual' | 'browser' | null;
  authInitialized: boolean;
  
  // Auto-authentication (using stored credentials)
  autoAuthenticate: () => boolean;
  
  // Manual key input
  manualApiKey: string;
  setManualApiKey: (key: string) => void;
  handleManualKeySubmit: () => void;
  
  // OAuth flow
  startOAuthFlow: () => Promise<void>;
  
  // Browser model auth
  enableBrowserModel: () => void;
  
  // Logout
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [manualApiKey, setManualApiKey] = useState('');
  const [authMethod, setAuthMethod] = useState<'oauth' | 'manual' | 'browser' | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Auto-authenticate with saved credentials on app start
  const autoAuthenticate = () => {
    const storedApiKey = authStorage.getApiKey();
    const storedAuthMethod = authStorage.getAuthMethod();
    
    if (storedApiKey && authStorage.isAuthenticated()) {
      setApiKey(storedApiKey);
      
      // Use stored auth method if available, otherwise determine from key
      if (storedAuthMethod) {
        setAuthMethod(storedAuthMethod);
      } else {
        // Try to determine auth method from key format
        if (storedApiKey === 'browser-llm') {
          setAuthMethod('browser');
          authStorage.setAuthMethod('browser');
        } else if (storedApiKey.startsWith('sk-or-')) {
          setAuthMethod('manual');
          authStorage.setAuthMethod('manual');
        } else {
          setAuthMethod('oauth');
          authStorage.setAuthMethod('oauth');
        }
      }
      
      // Notify app of auth state change
      window.dispatchEvent(new Event('api-key-changed'));
      
      // Indicate successful auth init with a toast
      toast({
        title: 'AUTHENTICATION RESTORED',
        description: 'Your previous NERV credentials have been retrieved',
        duration: 3000,
      });
      
      return true;
    }
    
    return false;
  };
  
  // Check for existing API key on mount and listen for auth events
  useEffect(() => {
    // Initial auto authenticate
    autoAuthenticate();
    
    // Mark auth as initialized regardless of result
    setAuthInitialized(true);
    
    // Handler for auth state changes (CustomEvent with data)
    const handleAuthStateChange = (event: Event) => {
      console.log("[Auth] Received auth-state-change event", (event as CustomEvent).detail);
      const detail = (event as CustomEvent).detail;
      
      // Update state based on the event data
      if (detail && detail.apiKey) {
        setApiKey(detail.apiKey);
        if (detail.method) {
          setAuthMethod(detail.method);
        }
        
        toast({
          title: 'AUTHENTICATION UPDATED',
          description: 'Your credentials have been synchronized across components',
          duration: 3000,
        });
      }
    };
    
    // Standard event handler (no data)
    const handleApiKeyChanged = () => {
      console.log("[Auth] Received api-key-changed event");
      // Re-read from storage since we don't have the data in the event
      const storedApiKey = authStorage.getApiKey();
      const storedAuthMethod = authStorage.getAuthMethod();
      
      if (storedApiKey) {
        setApiKey(storedApiKey);
        if (storedAuthMethod) {
          setAuthMethod(storedAuthMethod);
        }
      }
    };
    
    // Add event listeners
    window.addEventListener('auth-state-change', handleAuthStateChange);
    window.addEventListener('api-key-changed', handleApiKeyChanged);
    
    // Cleanup
    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange);
      window.removeEventListener('api-key-changed', handleApiKeyChanged);
    };
  }, []);
  
  // Manual API key submission
  const handleManualKeySubmit = () => {
    if (!manualApiKey.trim()) return;
    
    setApiKey(manualApiKey);
    authStorage.setApiKey(manualApiKey);
    authStorage.setAuthMethod('manual');
    setManualApiKey('');
    setAuthMethod('manual');
    
    // Notify app of auth state change
    window.dispatchEvent(new Event('api-key-changed'));
    
    toast({
      title: 'AUTHENTICATION COMPLETE',
      description: 'Your NERV credentials have been saved successfully',
    });
  };
  
  // OAuth flow
  const startOAuthFlow = async () => {
    try {
      // Generate and save code verifier
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
      
      // Save OAuth as the preferred auth method
      authStorage.setAuthMethod('oauth');
      setAuthMethod('oauth');
      
      // Generate and navigate to auth URL
      const authUrl = generateAuthUrl(codeChallenge, callbackUrl);
      window.location.href = authUrl;
      
      toast({
        title: 'REDIRECTING TO AUTHENTICATION',
        description: 'You will be redirected to OpenRouter to authenticate',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error starting authentication:', error);
      toast({
        title: 'AUTHENTICATION ERROR',
        description: 'Failed to start the authentication process',
        variant: 'destructive',
      });
    }
  };
  
  // Enable browser model mode
  const enableBrowserModel = () => {
    setApiKey('browser-llm');
    authStorage.setApiKey('browser-llm');
    authStorage.setAuthMethod('browser');
    setAuthMethod('browser');
    
    // Notify app of auth state change
    window.dispatchEvent(new Event('api-key-changed'));
    
    toast({
      title: 'BROWSER MODE ACTIVATED',
      description: 'Using WebLLM for in-browser inference without API keys',
    });
  };
  
  // Logout
  const logout = () => {
    setApiKey(null);
    authStorage.clearAuth();
    setAuthMethod(null);
    
    // Notify app of auth state change
    window.dispatchEvent(new Event('api-key-changed'));
    
    toast({
      title: 'PILOT DISCONNECTED',
      description: 'NERV authentication credentials removed',
    });
  };
  
  const value = {
    apiKey,
    isAuthenticated: apiKey !== null,
    authMethod,
    authInitialized,
    autoAuthenticate,
    manualApiKey,
    setManualApiKey,
    handleManualKeySubmit,
    startOAuthFlow,
    enableBrowserModel,
    logout
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}