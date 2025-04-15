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
    id: 'Llama-2-7b-chat-hf-q4f16_1',
    name: 'Llama-2-7b-chat',
    source: 'Meta',
    description: '7B parameter model that runs locally in your browser'
  },
  {
    id: 'Mistral-7B-Instruct-v0.2-q4f16_1',
    name: 'Mistral-7B-Instruct',
    source: 'Mistral AI',
    description: '7B parameter instruction model that runs in your browser'
  },
  {
    id: 'RedPajama-INCITE-Chat-3B-v1-q4f16_1',
    name: 'RedPajama-3B',
    source: 'Together',
    description: 'Lightweight 3B model for faster loading and responses'
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
      setLoadingMessage('Initializing WebLLM...');
      setLoadingProgress(0);

      // Create ML engine
      const mlengine = await webllm.CreateMLCEngine(modelId);
      
      // Set progress callback
      mlengine.setInitProgressCallback((report: any) => {
        setLoadingMessage(report.text);
        if (report.progress !== undefined) {
          setLoadingProgress(report.progress * 100);
        }
      });
      
      setEngine(mlengine);
      setIsModelReady(true);
      console.log('WebLLM initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebLLM:', error);
      setLoadingMessage(`Failed to load model: ${error instanceof Error ? error.message : String(error)}`);
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
    <div className="w-full p-4 border border-[var(--eva-orange)] rounded-md bg-[var(--eva-black)] text-[var(--eva-text)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="eva-title text-base flex items-center">
          <Cpu className="mr-2 h-4 w-4" />
          Browser LLM
        </h3>
        <Button 
          variant="outline" 
          onClick={handleToggleModelSource}
          className="eva-button text-xs px-2 py-1 h-8"
        >
          {isUsingBrowserModel ? 'Use OpenRouter API' : 'Use Browser LLM'}
        </Button>
      </div>

      {isUsingBrowserModel && (
        <>
          {/* Model selection */}
          <div className="mb-4">
            <label className="block text-xs mb-2 text-[var(--eva-orange)]">SELECT MODEL</label>
            <div className="grid grid-cols-1 gap-2">
              {LOCAL_MODELS.map((model) => (
                <div 
                  key={model.id}
                  className={`border p-2 rounded-md cursor-pointer transition-colors ${
                    selectedModel === model.id 
                      ? 'border-[var(--eva-orange)] bg-[var(--eva-orange)]/10' 
                      : 'border-[var(--eva-blue)]/30 hover:border-[var(--eva-blue)]'
                  }`}
                  onClick={() => handleModelChange(model.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-mono text-sm">{model.name}</div>
                    <div className="text-xs bg-[var(--eva-blue)]/20 px-1 rounded">{model.source}</div>
                  </div>
                  <div className="text-xs text-[var(--eva-text)]/70 mt-1">{model.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Initialize button */}
          {!isModelReady && (
            <div className="mb-4">
              <Button
                variant="default"
                className="w-full eva-button bg-[var(--eva-orange)]/80 hover:bg-[var(--eva-orange)]"
                onClick={handleInitializeModel}
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing Model...
                  </>
                ) : (
                  'Initialize Selected Model'
                )}
              </Button>
            </div>
          )}

          {/* Loading progress */}
          {isInitializing && (
            <div className="mb-4">
              <div className="w-full h-2 bg-[var(--eva-black)] border border-[var(--eva-blue)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--eva-blue)]" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1 text-[var(--eva-text)]/70">{loadingMessage}</p>
            </div>
          )}

          {/* Input form */}
          {isModelReady && (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent border border-[var(--eva-blue)] rounded p-2 text-sm font-mono"
                placeholder="Type a message to the browser model..."
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

          {/* Browser compatibility notice */}
          <div className="mt-4 p-2 border border-[var(--eva-blue)]/30 rounded-md bg-[var(--eva-blue)]/5 text-xs">
            <p className="text-[var(--eva-text)]/80">
              <strong>Note:</strong> Browser LLM requires a modern browser with WebGPU support. 
              For best performance, use Chrome or Edge with a capable GPU.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BrowserLLM;