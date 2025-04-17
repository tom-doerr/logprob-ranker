import { FC, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, ArrowDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import * as webllm from '@mlc-ai/web-llm';

import { BrowserModelOption, BROWSER_MODEL_OPTIONS } from '../lib/modelTypes';
import { ChatMessage } from '../lib/openrouter';

// Props should include all the global LLM settings
interface BrowserLLMProps {
  onSelectBrowserModel: (isUsingBrowserModel: boolean) => void;
  onMessageSent: (message: ChatMessage) => void;
  onResponseReceived: (message: ChatMessage) => void;
  isUsingBrowserModel: boolean;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

const BrowserLLM: FC<BrowserLLMProps> = ({ 
  onSelectBrowserModel, 
  onMessageSent, 
  onResponseReceived,
  isUsingBrowserModel,
  temperature = 0.7,
  topP = 0.9,
  maxTokens = 1000
}) => {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(BROWSER_MODEL_OPTIONS[0].id);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [browserSupported, setBrowserSupported] = useState<boolean | null>(null);

  const engineRef = useRef<webllm.MLCEngine | null>(null);

  // Check browser support
  useEffect(() => {
    const checkBrowserSupport = async () => {
      try {
        // Check if WebGPU is supported
        if (!navigator.gpu) {
          setBrowserSupported(false);
          toast({
            title: "Browser not supported",
            description: "Your browser doesn't support WebGPU. Please use Chrome 113+ or Edge 113+.",
            variant: "destructive",
          });
          return;
        }
        
        setBrowserSupported(true);
      } catch (error) {
        console.error('Error checking browser support:', error);
        setBrowserSupported(false);
      }
    };

    checkBrowserSupport();
  }, [toast]);

  // Manual model loading function
  const loadModel = async () => {
    if (!browserSupported || !isUsingBrowserModel) return;

    try {
      setIsLoading(true);
      setIsModelLoaded(false);
      setProgress(0);
      setProgressMessage('Initializing...');
      
      // Clean up previous engine if exists
      if (engineRef.current) {
        try {
          // Attempt to dispose of the engine resources
          // @ts-ignore: Engine might have dispose method in some versions
          if (engineRef.current.dispose && typeof engineRef.current.dispose === 'function') {
            // @ts-ignore: Using dispose method
            await engineRef.current.dispose();
          } else {
            // Force garbage collection by removing all references
            const keys = Object.keys(engineRef.current);
            for (const key of keys) {
              // @ts-ignore: Dynamic cleanup
              engineRef.current[key] = null;
            }
          }
          // Clear the reference
          engineRef.current = null;
          // Hint to browser to clean up memory
          if (window.gc) window.gc();
        } catch (e) {
          console.error('Error cleaning up previous engine:', e);
        }
      }
      
      // Initialize WebLLM first
      try {
        setProgressMessage('Initializing WebLLM...');
        // Some WebLLM versions have different initialization procedures
        // Just attempt to create the engine directly
        console.log('Starting WebLLM engine initialization');
      } catch (e) {
        console.log('WebLLM pre-initialization error:', e);
      }
      
      // Create a new engine with available WebLLM model
      setProgressMessage('Creating engine for model: ' + selectedModel);
      engineRef.current = await webllm.CreateMLCEngine(
        selectedModel, 
        {
          initProgressCallback: (report) => {
            const percentage = Math.round(report.progress * 100);
            setProgress(percentage);
            setProgressMessage(report.text || 'Loading model...');
          }
        }
      );
      
      setIsModelLoaded(true);
      setProgressMessage('Model loaded successfully!');
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
      setIsLoading(false);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        try {
          // Attempt to dispose of the engine resources
          // @ts-ignore: Engine might have dispose method in some versions
          if (engineRef.current.dispose && typeof engineRef.current.dispose === 'function') {
            // @ts-ignore: Using dispose method with casting
            (engineRef.current.dispose as Function)();
          } else {
            // Force garbage collection by removing all references
            const keys = Object.keys(engineRef.current);
            for (const key of keys) {
              // @ts-ignore: Dynamic cleanup
              engineRef.current[key] = null;
            }
          }
          // Clear the reference
          engineRef.current = null;
        } catch (e) {
          console.error('Error during component unmount cleanup:', e);
        }
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || !engineRef.current || !isModelLoaded) return;
    
    const userMessage: ChatMessage = { role: 'user', content: input };
    onMessageSent(userMessage);
    setInput('');
    setIsGenerating(true);
    
    try {
      const messages: any[] = [
        { role: 'system', content: 'You are a helpful AI assistant deployed through NERV. Provide accurate, concise responses in an Evangelion-themed style. Avoid unnecessary apologies or disclaimers.' },
        userMessage
      ];
      
      // Get streamed response from the WebLLM engine - using global settings
      const stream = await engineRef.current.chat.completions.create({
        messages,
        temperature: temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true }
      } as any);
      
      let fullResponse = '';
      
      // Handle streaming based on the returned type - use type casting to avoid TS errors
      // @ts-ignore: Stream could be different types depending on WebLLM version
      if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        // It's an async iterable for streaming
        // @ts-ignore: Handle async iteration manually
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content || '';
          fullResponse += content;
        }
      } else {
        // It's a direct response
        const response = stream as any;
        fullResponse = response.choices?.[0]?.message?.content || '';
      }
      
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: fullResponse 
      };
      
      onResponseReceived(assistantMessage);
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "GENERATION ERROR",
        description: error instanceof Error ? error.message : 'Failed to generate response',
        variant: "destructive",
      });
      
      // Still need to notify with error response
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'ERROR: Unable to generate response. The MAGI system encountered a technical limitation.'
      };
      onResponseReceived(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle model selection
  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
  };

  // If browser not supported, show message
  if (browserSupported === false) {
    return (
      <div className="p-4 bg-black/30 border border-[var(--eva-orange)]/50 rounded-md space-y-4">
        <div className="text-center p-6 space-y-4">
          <h3 className="text-[var(--eva-orange)] font-mono uppercase tracking-wider">BROWSER COMPATIBILITY ERROR</h3>
          <p className="text-[var(--eva-text)] font-mono text-sm">
            Your browser does not support WebGPU, which is required for running LLMs directly in your browser.
          </p>
          <p className="text-[var(--eva-green)] font-mono text-sm">
            Please use Chrome 113+ or Edge 113+ for this feature.
          </p>
          <Button
            onClick={() => onSelectBrowserModel(false)}
            className="mt-4 eva-button text-[var(--eva-orange)]"
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            SWITCH TO API MODE
          </Button>
        </div>
      </div>
    );
  }

  // Model selection and loading UI
  if (!isModelLoaded) {
    return (
      <div className="p-4 bg-black/30 border border-[var(--eva-orange)]/50 rounded-md space-y-4">
        <h3 className="text-[var(--eva-orange)] font-mono uppercase tracking-wider flex items-center">
          <div className="w-3 h-3 bg-[var(--eva-orange)] mr-2"></div>
          MAGI SYSTEM INITIALIZATION
        </h3>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-[var(--eva-green)] font-mono">{progressMessage}</p>
                <p className="text-xs text-[var(--eva-green)] font-mono">{progress}%</p>
              </div>
              <Progress value={progress} className="h-2 bg-[var(--eva-blue)]/30" />
            </div>
            
            {progress < 20 && (
              <p className="text-xs text-[var(--eva-text)]/60 font-mono">
                Note: The first model load might take up to a minute depending on your connection speed and device.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="pt-2">
              <div className="flex flex-col space-y-2">
                <label className="text-xs text-[var(--eva-orange)] font-mono">SELECT PILOT NEURAL INTERFACE:</label>
                <Select 
                  value={selectedModel} 
                  onValueChange={handleModelChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="eva-select text-[var(--eva-green)] font-mono">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="eva-select-content">
                    {BROWSER_MODEL_OPTIONS.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="font-mono">
                        {model.name} ({model.source})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--eva-text)]/60 font-mono pt-2">
                  {BROWSER_MODEL_OPTIONS.find(m => m.id === selectedModel)?.description || 'Select a model to continue'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-4">
              <p className="text-xs text-[var(--eva-text)] font-mono">
                Click the button below to start loading the selected model. This will download the model to your browser.
              </p>
              <Button 
                onClick={loadModel} 
                disabled={isLoading}
                className="w-full eva-button text-[var(--eva-orange)] font-mono uppercase tracking-wider"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                INITIALIZE MAGI SYSTEM
              </Button>
            </div>
            
            <div className="flex justify-between pt-2">
              <Button
                onClick={() => onSelectBrowserModel(false)}
                variant="outline"
                className="eva-button text-[var(--eva-blue)]"
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                SWITCH TO API MODE
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Input area when model is loaded
  return (
    <div className="flex space-x-2">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="ENTER COMMUNICATION DATA"
        disabled={isGenerating}
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
        disabled={isGenerating || !input.trim()}
        className="eva-button text-[var(--eva-orange)]"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default BrowserLLM;