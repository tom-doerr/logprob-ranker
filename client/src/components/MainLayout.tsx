import { FC, useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatInterface from './ChatInterface';
import OutputRanker from './OutputRanker';
import ModelConfig, { ModelOption, BrowserModelOption } from './ModelConfig';
import { MessageSquare, BarChart2, Power, Key, AlertCircle } from 'lucide-react';
import { getApiKey } from '../utils/pkce';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import * as webllm from '@mlc-ai/web-llm';

const MainLayout: FC = () => {
  const { toast } = useToast();
  const [showAuthInfo, setShowAuthInfo] = useState(false);
  const [activeTab, setActiveTab] = useState("output-ranker");
  
  // Model configuration state
  const [isUsingBrowserModel, setIsUsingBrowserModel] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3-haiku-20240307');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(0.9);
  const [maxTokens, setMaxTokens] = useState<number>(1000);
  const [customModel, setCustomModel] = useState<string>('');
  
  // Browser model state
  const engineRef = useRef<any>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...');
  
  // Popular models list for OpenRouter
  const popularModels: ModelOption[] = [
    {
      id: 'anthropic/claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      description: 'Fast, compact AI assistant with strong coding abilities',
      contextSize: '200K',
      pricing: '$0.25/M'
    },
    {
      id: 'anthropic/claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: 'Anthropic\'s most intelligent model with expert reasoning',
      contextSize: '200K',
      pricing: '$15/M'
    },
    {
      id: 'anthropic/claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      description: 'Balanced intelligence and speed for complex tasks',
      contextSize: '200K',
      pricing: '$3/M'
    },
    {
      id: 'google/gemini-1.5-pro-latest',
      name: 'Gemini 1.5 Pro',
      description: 'State-of-the-art reasoning, multimodality, and coding abilities',
      contextSize: '1M',
      pricing: '$7/M'
    },
    {
      id: 'meta-llama/llama-3-70b-instruct',
      name: 'Llama 3 70B',
      description: 'Meta\'s SOTA large language model with advanced capabilities',
      contextSize: '8K',
      pricing: '$1.50/M'
    },
    {
      id: 'mistralai/mistral-large-latest',
      name: 'Mistral Large',
      description: 'Flagship Mistral model with excellent reasoning abilities',
      contextSize: '32K',
      pricing: '$2/M'
    }
  ];

  // Browser model options
  const browserModelOptions: BrowserModelOption[] = [
    {
      id: 'Llama-3.1-8B-Q4_K_M',
      name: 'Llama 3.1 8B',
      source: 'Meta',
      description: 'Smaller Llama 3.1 model optimized for running in browser'
    },
    {
      id: 'Phi-3-mini-4k-instruct-Q4_K_M',
      name: 'Phi-3 Mini',
      source: 'Microsoft',
      description: 'Compact yet powerful model for instruction following'
    },
    {
      id: 'Gemma-2B-it-Q4_K_M',
      name: 'Gemma 2B',
      source: 'Google',
      description: 'Lightweight instruction-tuned model derived from Gemini'
    },
    {
      id: 'Qwen2-0.5B-instruct-Q4_K_M',
      name: 'Qwen2 0.5B',
      source: 'Alibaba',
      description: 'Ultra-efficient model for basic tasks'
    }
  ];

  // Load browser model
  const loadBrowserModel = async () => {
    if (!isUsingBrowserModel) return;

    try {
      setIsLoadingModel(true);
      setIsModelLoaded(false);
      setLoadingProgress(0);
      setLoadingMessage('Initializing...');
      
      // Clean up previous engine if exists
      if (engineRef.current) {
        try {
          // No specific cleanup method in docs, but we can set it to null
          engineRef.current = null;
        } catch (e) {
          console.error('Error cleaning up previous engine:', e);
        }
      }
      
      // Create a new engine
      const engine = await webllm.CreateMLCEngine(
        selectedModel, 
        {
          initProgressCallback: (report) => {
            const percentage = Math.round(report.progress * 100);
            setLoadingProgress(percentage);
            setLoadingMessage(report.text || 'Loading model...');
          }
        }
      );
      
      engineRef.current = engine;
      setIsModelLoaded(true);
      setLoadingMessage('Model loaded successfully!');
      toast({
        title: "MAGI SYNCHRONIZATION COMPLETE",
        description: `${selectedModel} loaded successfully`,
      });
    } catch (error) {
      console.error('Error loading model:', error);
      toast({
        title: "MODEL LOADING ERROR",
        description: error instanceof Error ? error.message : 'Failed to load model',
        variant: "destructive",
      });
    } finally {
      setIsLoadingModel(false);
    }
  };
  
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
                  <li>You will need a valid OpenRouter API key to use the application</li>
                  <li>You can enter your OpenRouter API key directly in the form</li>
                  <li>If you don't have a key, you can follow the link to create one on OpenRouter's website</li>
                  <li>You can also try the OAuth authentication option (may not work on all deployments)</li>
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
      
      {/* Centralized Model Configuration (visible when authenticated) */}
      {!showAuthInfo && (
        <ModelConfig 
          isUsingBrowserModel={isUsingBrowserModel}
          onSelectBrowserModel={setIsUsingBrowserModel}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          temperature={temperature}
          onTemperatureChange={setTemperature}
          topP={topP}
          onTopPChange={setTopP}
          maxTokens={maxTokens}
          onMaxTokensChange={setMaxTokens}
          onLoadBrowserModel={loadBrowserModel}
          isModelLoaded={isModelLoaded}
          isLoadingModel={isLoadingModel}
          loadingProgress={loadingProgress}
          loadingMessage={loadingMessage}
          browserModelOptions={browserModelOptions}
          popularModels={popularModels}
          customModel={customModel}
          onCustomModelChange={setCustomModel}
        />
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
          <OutputRanker 
            isUsingBrowserModel={isUsingBrowserModel}
            selectedModel={selectedModel}
            temperature={temperature}
            topP={topP}
            maxTokens={maxTokens}
            customModel={customModel}
            browserModelEngine={engineRef.current}
          />
        </TabsContent>
        
        <TabsContent value="chat">
          <ChatInterface 
            isUsingBrowserModel={isUsingBrowserModel}
            selectedModel={selectedModel}
            temperature={temperature}
            topP={topP}
            maxTokens={maxTokens}
            customModel={customModel}
            browserModelEngine={engineRef.current}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainLayout;