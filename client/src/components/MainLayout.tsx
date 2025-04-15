import { FC, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatInterface from './ChatInterface';
import OutputRanker from './OutputRanker';
import ModelConfig from './ModelConfig';
import { BROWSER_MODEL_OPTIONS, POPULAR_MODELS } from '../lib/modelTypes';
import { MessageSquare, BarChart2 } from 'lucide-react';
import { getApiKey } from '../utils/pkce';
import { useModelConfig } from '@/hooks/use-model-config';
import NervContainer from './ui/nerv-container';
import AuthModal from './ui/auth-modal';

const MainLayout: FC = () => {
  const [showAuthInfo, setShowAuthInfo] = useState(false);
  const [activeTab, setActiveTab] = useState("output-ranker");
  
  // Use the centralized model configuration hook
  const modelConfig = useModelConfig();
  
  // Check if API key exists on mount and monitor for changes
  useEffect(() => {
    const checkApiKey = () => {
      const apiKey = getApiKey();
      if (!apiKey) {
        setShowAuthInfo(true);
        // Default to chat tab when no API key is found
        setActiveTab("chat");
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
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const closeAuthInfo = () => {
    setShowAuthInfo(false);
  };
  
  const proceedToAuth = () => {
    setActiveTab("chat");
    closeAuthInfo();
  };

  return (
    <NervContainer className="max-w-6xl">
      {/* Authentication Modal */}
      {showAuthInfo && <AuthModal onClose={closeAuthInfo} onProceed={proceedToAuth} />}
      
      {/* Centralized Model Configuration (visible when authenticated) */}
      {!showAuthInfo && <ModelConfig />}
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-8">
        <TabsList className="grid w-full grid-cols-2 mb-8 border border-[var(--eva-orange)] bg-opacity-20">
          <TabsTrigger value="output-ranker" className="flex items-center justify-center data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">
            <BarChart2 className="h-4 w-4 mr-2" />
            NERV SYSTEM-A
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center justify-center data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">
            <MessageSquare className="h-4 w-4 mr-2" />
            NERV SYSTEM-B
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="output-ranker">
          <OutputRanker />
        </TabsContent>
        
        <TabsContent value="chat">
          <ChatInterface {...modelConfig.getModelConfig()} />
        </TabsContent>
      </Tabs>
    </NervContainer>
  );
};

export default MainLayout;