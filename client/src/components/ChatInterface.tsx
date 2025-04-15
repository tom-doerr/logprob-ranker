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
import { Loader2, Send, Key, LogOut, Settings, Sparkles } from 'lucide-react';

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
    id: 'google/gemini-1.5-flash-8b',
    name: 'Google: Gemini 1.5 Flash 8B',
    description: 'Optimized for speed and efficiency',
    contextSize: '1M',
    pricing: '$0.0375/M input, $0.15/M output'
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    name: 'Meta: Llama 3.1 8B Instruct',
    description: 'Fast and efficient, strong performance',
    contextSize: '131K',
    pricing: '$0.02/M input, $0.045/M output'
  },
  {
    id: 'anthropic/claude-3-5-sonnet',
    name: 'Anthropic: Claude 3.5 Sonnet',
    description: 'Better-than-Opus capabilities, faster speeds',
    contextSize: '200K',
    pricing: '$3/M input, $15/M output'
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Google: Gemini 2.0 Flash',
    description: 'Faster TTFT, quality on par with larger models',
    contextSize: '1.05M',
    pricing: 'Free'
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'OpenAI: GPT-3.5 Turbo',
    description: 'Fast, cost-effective assistant model',
    contextSize: '16K',
    pricing: '$0.5/M input, $1.5/M output'
  }
];

const ChatInterface: FC = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [manualApiKey, setManualApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.0-flash-001');
  const [customModel, setCustomModel] = useState<string>('');
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
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

  const handleSendMessage = async () => {
    if (!input.trim() || !apiKey) return;
    
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const modelToUse = selectedModel === 'custom' ? customModel : selectedModel;
      
      const response = await createChatCompletion({
        model: modelToUse,
        messages: [...messages, userMessage],
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

  const handleApiKeySubmit = () => {
    if (!manualApiKey.trim()) return;
    
    setApiKey(manualApiKey);
    saveApiKey(manualApiKey);
    setManualApiKey('');
    toast({
      title: 'API Key Saved',
      description: 'Your API key has been saved and will be used for chat',
    });
  };

  const handleStartAuth = async () => {
    try {
      // Generate and save code verifier
      const codeVerifier = generateCodeVerifier();
      saveCodeVerifier(codeVerifier);
      
      // Generate code challenge
      const codeChallenge = await createSHA256CodeChallenge(codeVerifier);
      
      // Generate and open auth URL
      const callbackUrl = `${window.location.origin}/callback`;
      const authUrl = generateAuthUrl(codeChallenge, callbackUrl);
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting authentication:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to start the authentication process',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    setApiKey(null);
    clearApiKey();
    setMessages([]);
    toast({
      title: 'Logged Out',
      description: 'Your API key has been removed',
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

  const toggleModelPicker = () => {
    setModelPickerOpen(!modelPickerOpen);
  };

  const modelInfo = getModelInfo();

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>OpenRouter Chat</span>
            {apiKey && (
              <div className="flex space-x-2 items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleModelPicker}
                  className="text-xs flex items-center"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Model:</span> {modelInfo.name}
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKey ? (
            <div className="flex flex-col h-[60vh]">
              {modelPickerOpen && (
                <div className="mb-4 p-4 bg-white border rounded-md shadow-sm">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                    Select Model
                  </h3>
                  <Tabs defaultValue="popular" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="popular">Popular Models</TabsTrigger>
                      <TabsTrigger value="custom">Custom Model</TabsTrigger>
                    </TabsList>
                    <TabsContent value="popular" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {popularModels.map((model) => (
                          <div 
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setModelPickerOpen(false);
                            }}
                            className={`p-3 border rounded-md hover:bg-blue-50 cursor-pointer transition-colors ${
                              selectedModel === model.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <h4 className="font-medium text-sm">{model.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                              <span>Context: {model.contextSize}</span>
                              <span>Pricing: {model.pricing}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="custom">
                      <div className="space-y-2 py-2">
                        <p className="text-xs text-gray-500">
                          Enter a custom model identifier (e.g., "openai/gpt-4"):
                        </p>
                        <Input
                          placeholder="Enter model identifier"
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => {
                            if (customModel.trim()) {
                              setSelectedModel('custom');
                              setModelPickerOpen(false);
                            }
                          }}
                          disabled={!customModel.trim()}
                          className="w-full mt-2"
                        >
                          Use Custom Model
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              
              <div className="flex-grow overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-md">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 my-8">
                    Start a conversation by sending a message below
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        message.role === 'user'
                          ? 'ml-auto bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="flex space-x-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Enter your OpenRouter API Key</h3>
                <div className="flex space-x-2">
                  <Input
                    type="password"
                    value={manualApiKey}
                    onChange={(e) => setManualApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="flex-grow"
                  />
                  <Button onClick={handleApiKeySubmit} disabled={!manualApiKey.trim()}>
                    <Key className="h-4 w-4 mr-2" />
                    Save Key
                  </Button>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              
              <div className="text-center">
                <Button onClick={handleStartAuth} variant="outline" className="w-full">
                  Login with OpenRouter
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;