import { FC, useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { ChatCompletionRequest, ChatMessage } from '../lib/openrouter';
import { ArrowUp, Cpu, Loader2 } from 'lucide-react';
import * as webllm from '@mlc-ai/web-llm';

interface BrowserLLMProps {
  onSelectBrowserModel: (isUsingBrowserModel: boolean) => void;
  onMessageSent: (message: ChatMessage) => void;
  onResponseReceived: (message: ChatMessage) => void;
  isUsingBrowserModel: boolean;
}

interface BrowserModelOption {
  id: string;
  name: string;
  source: string;
  description: string;
}

const LOCAL_MODELS: BrowserModelOption[] = [
  {
    id: 'simulation',
    name: 'Simulation Mode',
    source: 'Demo',
    description: 'No model download required - demonstration only'
  },
  {
    id: 'TinyLlama-1.1B-Chat-v1.0-q4f32_1',
    name: 'TinyLlama (1.1B)',
    source: 'TinyLlama',
    description: 'Ultra-compact model for fast loading'
  },
  {
    id: 'RedPajama-INCITE-Chat-3B-v1-q4f16_1',
    name: 'RedPajama (3B)',
    source: 'Together',
    description: 'Compact model for fast browser execution'
  }
];

const BrowserLLM: FC<BrowserLLMProps> = ({ 
  onSelectBrowserModel, 
  onMessageSent, 
  onResponseReceived,
  isUsingBrowserModel
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(LOCAL_MODELS[0].id);
  const [engine, setEngine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isModelReady, setIsModelReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [input, setInput] = useState('');

  // Initialize the WebLLM 
  const initializeChat = useCallback(async (modelId: string) => {
    try {
      setIsInitializing(true);
      setIsModelReady(false);
      setLoadingMessage('Preparing browser environment...');
      setLoadingProgress(0);

      // If in simulation mode, don't attempt to load a real model
      if (modelId === 'simulation') {
        // Simulate loading progress
        const totalSteps = 5;
        const messages = [
          'Initializing local inference engine...',
          'Loading model weights...',
          'Preparing tensor computation...',
          'Configuring model parameters...',
          'Finalizing model setup...'
        ];

        // Simulate the loading process with staged progress updates
        for (let i = 0; i < totalSteps; i++) {
          setLoadingMessage(messages[i]);
          setLoadingProgress((i / totalSteps) * 100);
          // Wait a bit to simulate loading time
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Create a mock engine object with the chat.completions.create method
        const mockEngine = {
          chat: {
            completions: {
              create: async ({ messages }: { messages: any[] }) => {
                // Extract the user's message
                const userMessage = messages[messages.length - 1]?.content || '';
                
                // Create a simulated response based on the input
                let response = 'I am running in browser simulation mode. ';
                
                if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
                  response += 'Hello! How can I help you today?';
                } else if (userMessage.toLowerCase().includes('help')) {
                  response += 'I can simulate AI responses without requiring model downloads. What would you like to know?';
                } else if (userMessage.toLowerCase().includes('how') && userMessage.toLowerCase().includes('work')) {
                  response += 'This is a simulation of browser-based LLM functionality. In full mode, models would run directly in your browser using WebGPU.';
                } else {
                  response += `I'm a demonstration of browser-based AI. Your message was: "${userMessage}". In a real implementation, this would process your request locally without sending data to a server.`;
                }
                
                // Simulate a delay to make it feel more realistic
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Return a format compatible with the chat completion API
                return {
                  choices: [
                    {
                      message: {
                        role: 'assistant',
                        content: response
                      }
                    }
                  ]
                };
              }
            }
          }
        };
        
        setEngine(mockEngine);
        setIsModelReady(true);
        setLoadingProgress(100);
        setLoadingMessage('Simulation mode ready');
        console.log('Simulation mode initialized');
      } else {
        // Real model loading path
        // Create ML engine
        const mlengine = await webllm.CreateMLCEngine(modelId);
        
        // Set progress callback
        mlengine.setInitProgressCallback((report: any) => {
          setLoadingMessage(report.text || 'Loading model...');
          if (report.progress !== undefined) {
            setLoadingProgress(report.progress * 100);
          }
        });
        
        setEngine(mlengine);
        setIsModelReady(true);
        console.log('WebLLM initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize WebLLM:', error);
      let errorMessage = 'Failed to load browser model';
      
      // Provide more friendly error messages
      if (error && typeof error === 'object') {
        if ('name' in error) {
          if (error.name === 'ModelNotFoundError') {
            errorMessage = 'Model not found. Please check your internet connection or try a different model.';
          } else if (error.name === 'WebGPUNotSupportedError') {
            errorMessage = 'WebGPU not supported in your browser. Please use Chrome or Edge version 113 or newer.';
          } else if (error.name === 'OutOfMemoryError') {
            errorMessage = 'Out of memory error. Try a smaller model or close other browser tabs.';
          }
        }
      }
      
      setLoadingMessage(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Handle model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelReady(false);
    // Don't initialize immediately, wait for the user to click "Initialize"
  };

  // Initialize the model
  const handleInitializeModel = async () => {
    if (isInitializing) return;
    await initializeChat(selectedModel);
  };

  // Send a message using the browser model
  const handleSendMessage = async () => {
    if (!engine || !isModelReady || !input.trim()) return;
    
    const userMessage: ChatMessage = { role: 'user', content: input };
    onMessageSent(userMessage);
    
    setInput('');
    setIsLoading(true);
    
    try {
      // Generate a response using completions API
      const response = await engine.chat.completions.create({
        messages: [{ role: 'user', content: input }],
        temperature: 0.7,
        max_tokens: 1024
      });
      
      // The content should always be a string, but add the "as string" to satisfy TypeScript
      const content = response.choices[0].message.content || "";
      
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: content 
      };
      
      onResponseReceived(assistantMessage);
    } catch (error) {
      console.error('Error generating response:', error);
      onResponseReceived({ 
        role: 'assistant', 
        content: `Error: Unable to generate a response. ${error instanceof Error ? error.message : String(error)}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isModelReady) {
      handleSendMessage();
    }
  };

  // Toggle between browser model and OpenRouter
  const handleToggleModelSource = () => {
    onSelectBrowserModel(!isUsingBrowserModel);
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      // No explicit cleanup needed for now
    };
  }, [engine]);

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Header with model selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleToggleModelSource}
            className="eva-button text-[var(--eva-orange)]"
          >
            <Cpu className="h-4 w-4 mr-2" />
            Use API Model
          </Button>
          
          {!isModelReady && !isInitializing && (
            <select 
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-transparent text-[var(--eva-green)] border border-[var(--eva-blue)]/40 rounded p-1 text-sm font-mono"
            >
              {LOCAL_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {!isModelReady && !isInitializing && (
          <Button
            size="sm"
            className="eva-button bg-[var(--eva-orange)]/80 hover:bg-[var(--eva-orange)]"
            onClick={handleInitializeModel}
          >
            Initialize Model
          </Button>
        )}
      </div>

      {/* Loading progress or error message */}
      {(isInitializing || (!isModelReady && loadingMessage && !isInitializing)) && (
        <div className={`w-full p-4 border rounded-md ${
          !isInitializing && loadingMessage && !isModelReady 
            ? 'border-[var(--eva-orange)]/50 bg-[var(--eva-black)]/60'
            : 'border-[var(--eva-blue)]/30 bg-[var(--eva-black)]/40'
        }`}>
          <h3 className={`text-sm font-mono mb-2 flex items-center ${
            !isInitializing && loadingMessage && !isModelReady
              ? 'text-[var(--eva-orange)]'
              : 'text-[var(--eva-blue)]'
          }`}>
            {isInitializing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Local Model...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m9.75 9.75 4.5 4.5"/><path d="m14.25 9.75-4.5 4.5"/><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/></svg>
                Initialization Error
              </>
            )}
          </h3>
          
          {isInitializing && (
            <div className="w-full h-2 bg-[var(--eva-black)] border border-[var(--eva-blue)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--eva-blue)]" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          )}
          
          <p className={`text-xs mt-2 font-mono ${
            !isInitializing && loadingMessage && !isModelReady
              ? 'text-[var(--eva-text)]'
              : 'text-[var(--eva-text)]/70'
          }`}>
            {loadingMessage}
          </p>
          
          {!isInitializing && loadingMessage && !isModelReady && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLoadingMessage('')}
                className="text-xs eva-button text-[var(--eva-orange)]"
              >
                Dismiss Error
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Input form */}
      {isModelReady && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 eva-input text-[var(--eva-green)] font-mono"
            placeholder="Type a message to run locally in your browser..."
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            variant="default"
            className="eva-button bg-[var(--eva-orange)]/80 hover:bg-[var(--eva-orange)]"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </form>
      )}

      {/* Info message when not ready */}
      {!isModelReady && !isInitializing && !loadingMessage && (
        <div className="p-4 border border-[var(--eva-blue)]/30 rounded-md bg-[var(--eva-blue)]/5">
          <p className="text-sm text-[var(--eva-text)] font-mono">
            <strong>BROWSER LLM MODE</strong><br/>
            Select a model and click Initialize to run AI directly in your browser.
            No API key required - processing happens locally.
          </p>
          <p className="text-xs mt-2 text-[var(--eva-text)]/70 font-mono">
            Note: Requires Chrome/Edge with WebGPU support. Initial download may take several minutes.
          </p>
          
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleModelSource}
              className="text-xs eva-button text-[var(--eva-orange)]"
            >
              Switch to API Mode Instead
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowserLLM;