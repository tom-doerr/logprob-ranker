import { FC, useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiKey, saveApiKey, clearApiKey } from '../utils/pkce';
import { createChatCompletion } from '../lib/openrouter';
import { generateAuthUrl, exchangeCodeForToken } from '../lib/openrouter';
import { createSHA256CodeChallenge, generateCodeVerifier, saveCodeVerifier } from '../utils/pkce';
import { Loader2, Send, Key, LogOut, Settings, Sparkles, Cpu } from 'lucide-react';
import BrowserLLM from './BrowserLLM';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelOption {
  id: string;
  name: string;
  description: string;
  contextSize: string;
  pricing: string;
}

const popularModels: ModelOption[] = [
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek: R1',
    description: 'Performance on par with OpenAI o1, 671B parameters',
    contextSize: '164K',
    pricing: 'Free'
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    name: 'DeepSeek: Chat v3',
    description: 'Advanced multilingual chat model with strong reasoning',
    contextSize: '128K',
    pricing: 'Free'
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Google: Gemini 2.0 Flash',
    description: 'Fast, efficient response generation',
    contextSize: '128K',
    pricing: 'Free - Limited'
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    name: 'Meta: Llama 3.1 8B',
    description: 'Compact but capable instruction-following model',
    contextSize: '128K',
    pricing: 'Free'
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Meta: Llama 3.3 70B',
    description: 'Powerful reasoning, instruction-following capabilities',
    contextSize: '128K',
    pricing: 'Free - Limited'
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI: GPT-4o Mini',
    description: 'Compact version of GPT-4o with good performance',
    contextSize: '128K',
    pricing: '$0.15/M input, $0.60/M output'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Anthropic: Claude 3.5 Sonnet',
    description: 'Excellent at reasoning, safe and helpful responses',
    contextSize: '200K',
    pricing: '$3.00/M input, $15.00/M output'
  },

  {
    id: 'openai/gpt-3.5-turbo',
    name: 'OpenAI: GPT-3.5 Turbo',
    description: 'Fast, cost-effective assistant model',
    contextSize: '16K',
    pricing: '$0.5/M input, $1.5/M output'
  }
];

import { ModelConfig } from '../lib/modelTypes';

interface ChatInterfaceProps extends Partial<ModelConfig> {}

const ChatInterface: FC<ChatInterfaceProps> = ({
  isUsingBrowserModel: externalIsUsingBrowserModel,
  selectedModel: externalSelectedModel,
  temperature: externalTemperature,
  topP: externalTopP,
  maxTokens: externalMaxTokens,
  customModel: externalCustomModel,
  browserModelEngine
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [manualApiKey, setManualApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(externalSelectedModel || 'google/gemini-2.0-flash-001');
  const [customModel, setCustomModel] = useState<string>(externalCustomModel || '');

  const [isUsingBrowserModel, setIsUsingBrowserModel] = useState(externalIsUsingBrowserModel ?? false);
  const [temperature, setTemperature] = useState(externalTemperature || 0.7);
  const [topP, setTopP] = useState(externalTopP || 0.9);
  const [maxTokens, setMaxTokens] = useState(externalMaxTokens || 1000);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key on mount
  useEffect(() => {
    const storedApiKey = getApiKey();
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Update local state when external props change
  useEffect(() => {
    if (externalIsUsingBrowserModel !== undefined) {
      setIsUsingBrowserModel(externalIsUsingBrowserModel);
    }
    if (externalSelectedModel) {
      setSelectedModel(externalSelectedModel);
    }
    if (externalCustomModel) {
      setCustomModel(externalCustomModel);
    }
    if (externalTemperature) {
      setTemperature(externalTemperature);
    }
    if (externalTopP) {
      setTopP(externalTopP);
    }
    if (externalMaxTokens) {
      setMaxTokens(externalMaxTokens);
    }
  }, [
    externalIsUsingBrowserModel,
    externalSelectedModel,
    externalCustomModel,
    externalTemperature,
    externalTopP,
    externalMaxTokens
  ]);

  const handleSendMessage = async () => {
    if (!input.trim() || (!apiKey && !isUsingBrowserModel)) return;
    
    // If using browser model, let TensorflowLLM component handle the message
    if (isUsingBrowserModel) {
      return;
    }
    
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const modelToUse = selectedModel === 'custom' ? customModel : selectedModel;
      
      const response = await createChatCompletion({
        model: modelToUse,
        messages: [...messages, userMessage],
        temperature: temperature,
        max_tokens: maxTokens,
      });
      
      if (response.choices && response.choices.length > 0) {
        setMessages(prev => [...prev, response.choices[0].message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle messages from TensorflowLLM
  const handleBrowserModelMessageSent = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  const handleBrowserModelResponseReceived = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  // Toggle between browser model and API model
  const handleSelectBrowserModel = (newValue: boolean) => {
    setIsUsingBrowserModel(newValue);
  };

  const handleApiKeySubmit = () => {
    if (!manualApiKey.trim()) return;
    
    setApiKey(manualApiKey);
    saveApiKey(manualApiKey);
    setManualApiKey('');
    
    // Dispatch event to notify other components of the API key change
    window.dispatchEvent(new Event('api-key-changed'));
    
    toast({
      title: 'AUTHENTICATION COMPLETE',
      description: 'Your NERV credentials have been saved successfully',
    });
  };

  const handleStartAuth = async () => {
    try {
      // Generate and save code verifier
      const codeVerifier = generateCodeVerifier();
      saveCodeVerifier(codeVerifier);
      
      // Generate code challenge
      const codeChallenge = await createSHA256CodeChallenge(codeVerifier);
      
      // Generate and open auth URL with better URL detection
      let origin = window.location.origin;
      
      // Handle case when deployed to Replit (which might have additional path segments)
      const isReplit = origin.includes('.replit.dev') || origin.includes('.replit.app');
      
      // Determine the right callback URL based on deployment environment
      let callbackUrl;
      if (isReplit) {
        // For Replit, we'll need to include any potential path prefix
        // Get the path from the URL, excluding any trailing paths after '/callback'
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
      
      // Open the auth URL in the current window
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting authentication:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to start the authentication process. Check console for details.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    setApiKey(null);
    clearApiKey();
    setMessages([]);
    
    // Dispatch custom event to notify the app that the API key has been removed
    window.dispatchEvent(new Event('api-key-changed'));
    
    toast({
      title: 'PILOT DISCONNECTED',
      description: 'NERV authentication credentials removed',
    });
  };

  const getModelInfo = () => {
    if (selectedModel === 'custom') {
      return {
        name: 'Custom Model',
        description: customModel || 'Enter custom model ID',
      };
    }

    const model = popularModels.find(m => m.id === selectedModel);
    return {
      name: model?.name || 'Select a model',
      description: model?.description || '',
    };
  };



  const modelInfo = getModelInfo();

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="w-full eva-card border border-[var(--eva-orange)] bg-black/40">
        <CardHeader className="border-b border-[var(--eva-orange)]/30 relative pb-4">
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
          <div className="absolute top-1 left-4 font-mono text-[10px] text-[var(--eva-blue)] tracking-widest opacity-70">
            NERV-SYS:2025-15-04
          </div>
          <div className="absolute top-1 right-4 font-mono text-[10px] text-[var(--eva-blue)] tracking-widest opacity-70">
            MAGI-STATUS:OPERATIONAL
          </div>
          <CardTitle className="flex justify-between items-center pt-6">
            <span className="text-[var(--eva-orange)] font-mono uppercase tracking-wider flex items-center">
              <div className="w-5 h-5 bg-[var(--eva-orange)] mr-2 flex items-center justify-center">
                <div className="w-3 h-3 bg-black"></div>
              </div>
              NERV COMMUNICATION TERMINAL
            </span>
            {apiKey && (
              <div className="flex space-x-2 items-center">
                <div className="text-xs flex items-center font-mono text-[var(--eva-green)]">
                  <Settings className="h-3 w-3 mr-1 text-[var(--eva-green)]" />
                  <span className="hidden sm:inline">PILOT:</span> {isUsingBrowserModel ? "WebLLM" : modelInfo.name}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="eva-button text-[var(--eva-orange)]">
                  <LogOut className="h-4 w-4 mr-2" />
                  EJECT
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="absolute right-4 top-4 text-[var(--eva-orange)]/10 font-bold text-5xl font-mono rotate-12 pointer-events-none">
            NERV
          </div>
          {apiKey ? (
            <div className="flex flex-col h-[60vh]">

              
              <div className="flex-grow overflow-y-auto mb-4 space-y-4 p-4 bg-black/30 rounded-md border border-[var(--eva-orange)]/40">
                {messages.length === 0 ? (
                  <div className="text-center text-[var(--eva-text)] my-8 font-mono">
                    AWAITING PILOT COMMUNICATION INPUT
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg max-w-[80%] font-mono text-sm ${
                        message.role === 'user'
                          ? 'ml-auto bg-[var(--eva-orange)]/20 text-[var(--eva-orange)] border border-[var(--eva-orange)]/40'
                          : 'bg-[var(--eva-green-bg)] text-[var(--eva-green)] border border-[var(--eva-blue)]/40'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {isUsingBrowserModel ? (
                <BrowserLLM 
                  onSelectBrowserModel={handleSelectBrowserModel}
                  onMessageSent={handleBrowserModelMessageSent}
                  onResponseReceived={handleBrowserModelResponseReceived}
                  isUsingBrowserModel={isUsingBrowserModel}
                  temperature={temperature}
                  topP={topP}
                  maxTokens={maxTokens}
                />
              ) : (
                <div className="flex space-x-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="ENTER COMMUNICATION DATA"
                    className="flex-grow eva-input text-[var(--eva-green)] font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || !input.trim()}
                    className="eva-button text-[var(--eva-orange)]"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[var(--eva-orange)] font-mono uppercase tracking-wider flex items-center">
                  <Key className="h-5 w-5 mr-2 text-[var(--eva-orange)]" />
                  NERV AUTHENTICATION REQUIRED
                </h3>
                <div className="border border-[var(--eva-orange)] rounded-md p-4 bg-black/20">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-[var(--eva-green)] mr-2"></div>
                    <p className="text-xs text-[var(--eva-green)] font-mono">AUTHENTICATION OPTIONS:</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-[var(--eva-orange)] mb-2 font-mono flex items-center">
                        <span className="inline-block w-2 h-2 bg-[var(--eva-orange)] mr-2"></span>
                        OPTION 1: OAUTH AUTHENTICATION:
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-[var(--eva-text)]/60 font-mono">
                          Authenticate directly with your OpenRouter account (recommended):
                        </p>
                        
                        <Button 
                          onClick={handleStartAuth} 
                          variant="outline" 
                          className="w-full eva-button text-[var(--eva-orange)] uppercase font-mono tracking-wider"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M2 19v-4h10"/><path d="m6 15-4 4 4 4"/><path d="M22 5v4H12"/><path d="m18 9 4-4-4-4"/><path d="M5 12h14"/></svg>
                          SYNCHRONIZE WITH OPENROUTER
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="border border-[var(--eva-green)]/30 bg-black/20 rounded-md p-4">
                  <p className="text-xs text-[var(--eva-green)] mb-2 font-mono flex items-center">
                    <span className="inline-block w-2 h-2 bg-[var(--eva-green)] mr-2"></span>
                    OPTION 2: ENTER OPENROUTER API KEY:
                  </p>
                  <div className="flex space-x-2">
                    <Input
                      type="password"
                      value={manualApiKey}
                      onChange={(e) => setManualApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="flex-grow eva-input text-[var(--eva-green)] font-mono"
                    />
                    <Button 
                      onClick={handleApiKeySubmit} 
                      disabled={!manualApiKey.trim()}
                      className="eva-button text-[var(--eva-orange)]"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      AUTHORIZE
                    </Button>
                  </div>
                </div>
                
                <div className="border border-[var(--eva-blue)]/30 bg-black/20 rounded-md p-4">
                  <p className="text-xs text-[var(--eva-blue)] mb-2 font-mono flex items-center">
                    <span className="inline-block w-2 h-2 bg-[var(--eva-blue)] mr-2"></span>
                    OPTION 3: USE WEBLLM (BROWSER-BASED):
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--eva-text)]/60 font-mono">
                      Run language models directly in your browser with WebLLM (no API key required):
                    </p>
                    
                    <Button 
                      variant="outline" 
                      className="w-full eva-button text-[var(--eva-blue)] uppercase font-mono tracking-wider border-[var(--eva-blue)]/30 hover:bg-[var(--eva-blue)]/10"
                      onClick={() => {
                        setIsUsingBrowserModel(true);
                        setApiKey("browser-llm"); // Use placeholder token for browser model mode
                      }}
                    >
                      <Cpu className="h-4 w-4 mr-2" />
                      USE WEBLLM
                    </Button>
                  </div>
                </div>
                
                <div className="border border-[var(--eva-blue)]/30 bg-black/20 rounded-md p-4">
                  <p className="text-xs text-[var(--eva-blue)] mb-2 font-mono flex items-center">
                    <span className="inline-block w-2 h-2 bg-[var(--eva-blue)] mr-2"></span>
                    OPTION 4: GET AN API KEY MANUALLY:
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--eva-text)]/60 font-mono">
                      Visit OpenRouter website to create an account and generate an API key:
                    </p>
                    
                    <a 
                      href="https://openrouter.ai/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full"
                    >
                      <Button 
                        variant="outline" 
                        className="w-full eva-button text-[var(--eva-blue)] uppercase font-mono tracking-wider border-[var(--eva-blue)]/30 hover:bg-[var(--eva-blue)]/10"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        OPEN OPENROUTER WEBSITE
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;