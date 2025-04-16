import { FC, useState, useEffect, ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatInterface from './ChatInterface';
import OutputRanker from './OutputRanker';
import { MessageSquare, BarChart2, Cpu } from 'lucide-react';
import { getApiKey } from '../utils/pkce';
import { useModelConfig } from '@/hooks/use-model-config';
import NervContainer from './ui/nerv-container';
import AuthModal from './ui/auth-modal';
import ModelSelection from './ModelSelection';
import BrowserModels from './BrowserModels';
import AppHeader from './ui/app-header';

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: FC<MainLayoutProps> = ({ children }) => {
  const [showAuthInfo, setShowAuthInfo] = useState(false);
  const { isUsingBrowserModel } = useModelConfig();
  
  // Check if API key exists on mount and monitor for changes
  useEffect(() => {
    const checkApiKey = () => {
      const apiKey = getApiKey();
      if (!apiKey) {
        setShowAuthInfo(true);
      }
    };
    
    // Initial check
    checkApiKey();
    
    // Listen for localStorage changes (for API key updates)
    const handleStorageChange = () => {
      const apiKey = getApiKey();
      if (apiKey) {
        setShowAuthInfo(false);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event to detect API key changes from within the app
    const handleApiKeyChange = () => {
      const apiKey = getApiKey();
      if (apiKey) {
        setShowAuthInfo(false);
      }
    };
    
    window.addEventListener('api-key-changed', handleApiKeyChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('api-key-changed', handleApiKeyChange);
    };
  }, []);
  
  const closeAuthInfo = () => {
    setShowAuthInfo(false);
  };
  
  const proceedToAuth = () => {
    closeAuthInfo();
  };

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />
      <div className="container mx-auto py-4 px-4">
        {/* Authentication Modal */}
        {showAuthInfo && <AuthModal onClose={closeAuthInfo} onProceed={proceedToAuth} />}
        
        {/* Unified Model Configuration */}
        {!showAuthInfo && <ModelSelection />}
        
        {/* Browser Models section - only visible when local mode is active */}
        {!showAuthInfo && isUsingBrowserModel && <BrowserModels />}

        {/* Main content */}
        <div className="mt-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;