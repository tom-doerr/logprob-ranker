import { FC, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatInterface from './ChatInterface';
import OutputRanker from './OutputRanker';
import { MessageSquare, BarChart2, Power, Key, AlertCircle } from 'lucide-react';
import { getApiKey } from '../utils/pkce';
import { Button } from './ui/button';

const MainLayout: FC = () => {
  const [showAuthInfo, setShowAuthInfo] = useState(false);
  const [activeTab, setActiveTab] = useState("output-ranker");
  
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

  return (
    <div className="container mx-auto max-w-6xl p-4 relative">
      {/* Eva Interface Decorations */}
      <div className="absolute top-0 left-0 w-full h-4 bg-[var(--eva-orange)] opacity-30 z-10"></div>
      <div className="absolute top-4 left-0 w-full opacity-75 text-center text-[var(--eva-orange)] font-mono text-sm tracking-widest z-10">
        NERV CENTRAL DOGMA - EVA COORDINATION SYSTEM
      </div>
      <div className="absolute top-0 right-0 p-2 text-[var(--eva-orange)] font-mono text-xs z-10 flex items-center">
        <Power className="h-4 w-4 mr-1 animate-pulse" />
        MAGI SYSTEM ACTIVE
      </div>
      
      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
      
      {/* NERV Logo Watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[var(--eva-orange)] opacity-5 text-9xl font-bold z-0">
        NERV
      </div>
      
      {/* Authentication Info Overlay */}
      {showAuthInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--eva-black)] max-w-2xl w-full border-2 border-[var(--eva-orange)] rounded-md p-6 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--eva-orange)]"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[var(--eva-orange)]"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[var(--eva-orange)]"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--eva-orange)]"></div>
            
            <h2 className="text-xl text-[var(--eva-orange)] font-mono uppercase tracking-wider mb-4 flex items-center">
              <Key className="h-5 w-5 mr-2" />
              NERV Authentication Required
            </h2>
            
            <div className="space-y-4 text-[var(--eva-text)] font-mono">
              <div className="flex items-start space-x-3 border border-[var(--eva-orange)]/30 p-3 bg-black/30 rounded-md">
                <AlertCircle className="h-5 w-5 text-[var(--eva-orange)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm mb-2">OpenRouter API key is required to use NERV systems.</p>
                  <p className="text-xs text-[var(--eva-green)]">
                    API key authentication available in the "NERV SYSTEM-B" tab. Once authenticated, you will have access to all NERV systems.
                  </p>
                </div>
              </div>
              
              <div className="border border-[var(--eva-orange)]/30 p-3 bg-black/30 rounded-md text-sm mb-3">
                <p className="mb-2 text-[var(--eva-orange)]">INSTRUCTIONS:</p>
                <ol className="list-decimal ml-5 space-y-1 text-xs">
                  <li>Click "PROCEED TO AUTHENTICATION" below or navigate to "NERV SYSTEM-B" tab</li>
                  <li>Enter your OpenRouter API key or create a new one via the OpenRouter authentication</li>
                  <li>Once authorized, you'll have full access to all NERV systems</li>
                </ol>
              </div>
              
              <div className="bg-black/50 border border-[var(--eva-blue)]/30 p-3 rounded-md">
                <p className="text-xs font-mono text-[var(--eva-blue)] mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                  MAGI SYSTEM NOTICE
                </p>
                <ul className="list-disc ml-4 text-xs space-y-1">
                  <li>You can either enter your OpenRouter API key directly</li>
                  <li>OR use the OAuth flow to create/retrieve a key from OpenRouter</li>
                  <li>For demo purposes, you can also use <span className="text-[var(--eva-green)]">sk-or-v1-demo-123456</span> as a simulation key</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={closeAuthInfo}
                className="eva-button text-[var(--eva-text)] font-mono"
              >
                CLOSE MESSAGE
              </Button>
              <Button 
                onClick={() => {
                  setActiveTab("chat");
                  closeAuthInfo();
                }}
                className="eva-button text-[var(--eva-orange)] font-mono"
              >
                PROCEED TO AUTHENTICATION
              </Button>
            </div>
          </div>
        </div>
      )}
      
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
          <ChatInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainLayout;