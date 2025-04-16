import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
import { toast } from '@/hooks/use-toast';
import { 
  getApiKey, 
  saveApiKey, 
  clearApiKey,
  generateCodeVerifier,
  saveCodeVerifier,
  createSHA256CodeChallenge,
  getAuthMethod,
  saveAuthMethod,
  hasValidApiKey
} from '../utils/pkce';
import { generateAuthUrl } from '../lib/openrouter';

interface AuthContextType {
  // Auth state
  apiKey: string | null;
  isAuthenticated: boolean;
  authMethod: 'oauth' | 'manual' | 'browser' | null;
  authInitialized: boolean;
  
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
  
  // Check for existing API key on mount
  useEffect(() => {
    const storedApiKey = getApiKey();
    const storedAuthMethod = getAuthMethod();
    
    if (storedApiKey && hasValidApiKey()) {
      setApiKey(storedApiKey);
      
      // Use stored auth method if available, otherwise determine from key
      if (storedAuthMethod) {
        setAuthMethod(storedAuthMethod);
      } else {
        // Try to determine auth method from key format
        if (storedApiKey === 'browser-llm') {
          setAuthMethod('browser');
          saveAuthMethod('browser');
        } else if (storedApiKey.startsWith('sk-or-')) {
          setAuthMethod('manual');
          saveAuthMethod('manual');
        } else {
          setAuthMethod('oauth');
          saveAuthMethod('oauth');
        }
      }
      
      // Indicate successful auth init with a toast
      toast({
        title: 'AUTHENTICATION RESTORED',
        description: 'Your previous NERV credentials have been retrieved',
        duration: 3000,
      });
    }
    
    // Mark auth as initialized
    setAuthInitialized(true);
  }, []);
  
  // Manual API key submission
  const handleManualKeySubmit = () => {
    if (!manualApiKey.trim()) return;
    
    setApiKey(manualApiKey);
    saveApiKey(manualApiKey);
    saveAuthMethod('manual');
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
      saveCodeVerifier(codeVerifier);
      
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
      saveAuthMethod('oauth');
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
    saveApiKey('browser-llm');
    saveAuthMethod('browser');
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
    clearApiKey();
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