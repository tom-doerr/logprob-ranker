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
  createSHA256CodeChallenge
} from '../utils/pkce';
import { generateAuthUrl } from '../lib/openrouter';

interface AuthContextType {
  // Auth state
  apiKey: string | null;
  isAuthenticated: boolean;
  authMethod: 'oauth' | 'manual' | 'browser' | null;
  
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
  
  // Check for existing API key on mount
  useEffect(() => {
    const storedApiKey = getApiKey();
    if (storedApiKey) {
      setApiKey(storedApiKey);
      
      // Try to determine auth method from stored key
      if (storedApiKey === 'browser-llm') {
        setAuthMethod('browser');
      } else if (storedApiKey.startsWith('sk-or-')) {
        setAuthMethod('manual');
      } else {
        setAuthMethod('oauth');
      }
    }
  }, []);
  
  // Manual API key submission
  const handleManualKeySubmit = () => {
    if (!manualApiKey.trim()) return;
    
    setApiKey(manualApiKey);
    saveApiKey(manualApiKey);
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
      
      console.log('Using callback URL:', callbackUrl);
      
      const authUrl = generateAuthUrl(codeChallenge, callbackUrl);
      console.log('Generated OAuth URL:', authUrl);
      
      // Redirect to auth URL
      window.location.href = authUrl;
      setAuthMethod('oauth');
    } catch (error) {
      console.error('Error starting authentication:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to start the authentication process. Check console for details.',
        variant: 'destructive',
      });
    }
  };
  
  // Enable browser model mode
  const enableBrowserModel = () => {
    setApiKey('browser-llm');
    saveApiKey('browser-llm');
    setAuthMethod('browser');
    
    // Notify app of auth state change
    window.dispatchEvent(new Event('api-key-changed'));
    
    toast({
      title: 'BROWSER MODE ACTIVATED',
      description: 'Using WebLLM for in-browser inference',
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