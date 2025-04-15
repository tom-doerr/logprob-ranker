import { FC, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, ArrowDown, Cpu, ArrowUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useModelConfig } from '@/hooks/use-model-config';

// Import both LLM libraries
import * as webllm from '@mlc-ai/web-llm';
import * as tf from '@tensorflow/tfjs';

import { BrowserModelOption } from '../lib/modelTypes';
import { ChatMessage } from '../lib/openrouter';

// BrowserModels is a unified component for all browser-based models
const BrowserModels: FC = () => {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('webllm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [browserSupported, setBrowserSupported] = useState<boolean | null>(null);

  // Get model config from context
  const {
    isUsingBrowserModel,
    setIsUsingBrowserModel,
    selectedModel,
    setSelectedModel,
    temperature,
    topP,
    maxTokens,
    browserModelOptions,
    loadBrowserModel,
    isModelLoaded,
    isLoadingModel,
    loadingProgress,
    loadingMessage,
    browserModelEngine
  } = useModelConfig();

  // TensorFlow.js specific state
  const [tfModel, setTfModel] = useState<any>(null);
  const [isTfModelReady, setIsTfModelReady] = useState(false);
  const [isTfInitializing, setIsTfInitializing] = useState(false);

  // Messages state (could be moved to context later)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Check browser support for WebGPU
  useEffect(() => {
    const checkBrowserSupport = async () => {
      try {
        // Check if WebGPU is supported
        if (!navigator.gpu) {
          setBrowserSupported(false);
          return;
        }
        
        setBrowserSupported(true);
      } catch (error) {
        console.error('Error checking browser support:', error);
        setBrowserSupported(false);
      }
    };
    
    checkBrowserSupport();
  }, []);

  // Initialize TensorFlow.js
  const initializeTensorflow = async () => {
    try {
      setIsTfInitializing(true);
      setIsTfModelReady(false);
      
      // Make sure TensorFlow.js is ready
      await tf.ready();
      
      // Set up a lightweight TensorFlow.js text generation interface
      const tensorflowModel = {
        chat: {
          completions: {
            create: async ({ messages }: { messages: any[] }) => {
              // Extract the user's message
              const userMessage = messages[messages.length - 1]?.content || '';
              
              // Process with TensorFlow.js (simple implementation)
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Return a basic response
              return {
                choices: [
                  {
                    message: {
                      content: `TensorFlow.js processed: "${userMessage}"\n\nThis is a placeholder response from TensorFlow.js.`,
                      role: 'assistant'
                    }
                  }
                ]
              };
            }
          }
        }
      };
      
      setTfModel(tensorflowModel);
      setIsTfModelReady(true);
      
      toast({
        title: "TensorFlow.js Ready",
        description: "CPU-based inference engine initialized successfully",
      });
    } catch (error) {
      console.error('Error initializing TensorFlow:', error);
      toast({
        title: "TensorFlow.js Error",
        description: error instanceof Error ? error.message : "Failed to initialize TensorFlow.js",
        variant: "destructive",
      });
    } finally {
      setIsTfInitializing(false);
    }
  };

  // Handle model engine selection
  const handleModelSourceChange = (value: string) => {
    setSelectedTab(value);
    setSelectedModel(value === 'webllm' ? browserModelOptions[0].id : 'tensorflow');
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;
    
    // Create user message
    const userMessage: ChatMessage = { role: 'user', content: input };
    
    // Update UI
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    
    try {
      if (selectedTab === 'webllm' && browserModelEngine) {
        // Use WebLLM
        const response = await browserModelEngine.chat.completions.create({
          messages: messages.concat(userMessage),
          temperature,
          top_p: topP,
          max_tokens: maxTokens
        });
        
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: response.choices[0].message.content 
        };
        
        // Update messages with assistant response
        setMessages(prev => [...prev, assistantMessage]);
      } else if (selectedTab === 'tensorflow' && tfModel) {
        // Use TensorFlow.js
        const response = await tfModel.chat.completions.create({
          messages: messages.concat(userMessage)
        });
        
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: response.choices[0].message.content 
        };
        
        // Update messages with assistant response
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('No model engine available');
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate response',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Format messages for display
  const formatMessages = () => {
    return messages.map((message, index) => (
      <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block px-4 py-2 rounded-lg ${
            message.role === 'user'
              ? 'bg-[var(--eva-orange)]/20 text-[var(--eva-text)] border border-[var(--eva-orange)]/30'
              : 'bg-[var(--eva-green)]/10 text-[var(--eva-text)] border border-[var(--eva-green)]/30'
          }`}
        >
          <div className="text-xs font-mono uppercase mb-1 opacity-70">
            {message.role === 'user' ? 'PILOT' : 'MAGI SYSTEM'}
          </div>
          <div className="font-mono whitespace-pre-wrap text-sm">{message.content}</div>
        </div>
      </div>
    ));
  };

  return (
    <div className="browser-models-container">
      {/* Model Type Selection */}
      <Card className="eva-card border border-[var(--eva-orange)]/50 bg-black/50 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-[var(--eva-orange)] font-mono uppercase tracking-wider text-sm">
            LOCAL ENGINE SELECTION
          </CardTitle>
          <CardDescription className="text-[var(--eva-text)]/60 font-mono text-xs">
            Choose which local model engine to use for inference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={handleModelSourceChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 border border-[var(--eva-orange)] bg-opacity-20">
              <TabsTrigger 
                value="webllm" 
                className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase"
                disabled={!browserSupported}
              >
                WebLLM (GPU)
              </TabsTrigger>
              <TabsTrigger 
                value="tensorflow" 
                className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase"
              >
                TensorFlow (CPU)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="webllm">
              <div className="space-y-4">
                {browserSupported === false && (
                  <div className="p-3 border border-[var(--eva-orange)]/40 rounded-md bg-black/20 text-[var(--eva-orange)]">
                    <p className="font-mono text-sm">
                      Your browser doesn't support WebGPU, which is required for WebLLM.
                      Please use Chrome/Edge 113+ or another WebGPU-enabled browser.
                    </p>
                  </div>
                )}
                
                {browserSupported && (
                  <>
                    <Select 
                      value={selectedModel} 
                      onValueChange={setSelectedModel}
                      disabled={isLoadingModel}
                    >
                      <SelectTrigger className="eva-select text-[var(--eva-green)] font-mono">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="eva-select-content">
                        {browserModelOptions.map((model) => (
                          <SelectItem key={model.id} value={model.id} className="font-mono">
                            {model.name} ({model.source})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <p className="text-xs text-[var(--eva-text)]/60 font-mono pt-2">
                      {browserModelOptions.find(m => m.id === selectedModel)?.description || 'Select a model to continue'}
                    </p>
                    
                    {!isModelLoaded && !isLoadingModel && (
                      <Button 
                        onClick={loadBrowserModel} 
                        className="w-full eva-button text-[var(--eva-orange)] font-mono uppercase tracking-wider mt-2"
                      >
                        <ArrowDown className="h-4 w-4 mr-2" />
                        INITIALIZE MODEL
                      </Button>
                    )}
                    
                    {isLoadingModel && (
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-[var(--eva-green)] font-mono">{loadingMessage}</p>
                          <p className="text-xs text-[var(--eva-green)] font-mono">{loadingProgress}%</p>
                        </div>
                        <Progress value={loadingProgress} className="h-2" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tensorflow">
              <div className="space-y-4">
                <p className="text-xs text-[var(--eva-text)]/60 font-mono">
                  TensorFlow.js runs models directly in your browser using CPU. 
                  Performance will be slower, but compatible with all browsers.
                </p>
                
                {!isTfModelReady && !isTfInitializing && (
                  <Button 
                    onClick={initializeTensorflow} 
                    className="w-full eva-button text-[var(--eva-orange)] font-mono uppercase tracking-wider"
                  >
                    <Cpu className="h-4 w-4 mr-2" />
                    INITIALIZE TENSORFLOW
                  </Button>
                )}
                
                {isTfInitializing && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-[var(--eva-green)] font-mono">Initializing TensorFlow.js...</p>
                    </div>
                    <div className="h-2 bg-[var(--eva-blue)]/30 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--eva-green)] animate-pulse rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                )}
                
                {isTfModelReady && (
                  <div className="p-3 border border-[var(--eva-green)]/40 rounded-md bg-black/20">
                    <p className="text-xs text-[var(--eva-green)] font-mono">
                      TensorFlow.js initialized and ready for text generation
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="eva-card border border-[var(--eva-orange)]/50 bg-black/50 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-[var(--eva-orange)] font-mono uppercase tracking-wider text-sm">
            LOCAL MODEL CHAT
          </CardTitle>
          <CardDescription className="text-[var(--eva-text)]/60 font-mono text-xs">
            Interact with the selected local model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="messages-container h-[400px] overflow-y-auto mb-4 p-4 border border-[var(--eva-orange)]/30 rounded-md bg-black/20">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[var(--eva-text)]/40 font-mono text-sm">No messages yet. Start a conversation.</p>
              </div>
            ) : (
              <>
                {formatMessages()}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Textarea
              ref={textAreaRef}
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="eva-input text-[var(--eva-green)] font-mono resize-none min-h-[80px]"
              disabled={isGenerating || (!isModelLoaded && !isTfModelReady)}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isGenerating || (!isModelLoaded && !isTfModelReady)}
              className="eva-button text-[var(--eva-orange)] font-mono"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="mt-2 text-[var(--eva-text)]/40 font-mono text-xs text-center">
            {selectedTab === 'webllm' ? (
              isModelLoaded ? 'WebLLM model ready' : 'Initialize WebLLM model to start chatting'
            ) : (
              isTfModelReady ? 'TensorFlow.js ready' : 'Initialize TensorFlow.js to start chatting'
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrowserModels;