import { useState, useEffect } from 'react';
import * as webllm from '@mlc-ai/web-llm';
import { BrowserModelOption } from '../lib/modelTypes';
import { toast } from '@/hooks/use-toast';

interface UseWebLLMOptions {
  modelOption: BrowserModelOption | null; // Selected browser model
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

interface UseWebLLMResult {
  engine: any; // Web LLM engine instance
  isLoaded: boolean;
  isLoading: boolean;
  progress: number;
  statusMessage: string;
  generateResponse: (prompt: string) => Promise<string>;
  resetEngine: () => void;
}

// Custom hook to manage WebLLM lifecycle and inference
export function useWebLLM({
  modelOption,
  temperature = 0.7,
  topP = 0.95,
  maxTokens = 1024
}: UseWebLLMOptions): UseWebLLMResult {
  const [engine, setEngine] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  const resetEngine = () => {
    if (engine) {
      try {
        engine.unload();
      } catch (e) {
        console.error('Error unloading engine:', e);
      }
    }
    setEngine(null);
    setIsLoaded(false);
    setIsLoading(false);
    setProgress(0);
    setStatusMessage('');
  };
  
  // Creates and initializes a Web LLM engine with the specified model
  const initializeEngine = async () => {
    if (!modelOption || isLoaded || isLoading) return;
    
    try {
      setIsLoading(true);
      setStatusMessage('Initializing WebLLM engine...');
      
      // Create engine instance using the proper WebLLM API
      // First parameter is modelId, second is MLCEngineConfig, third is ChatOptions
      const newEngine = await webllm.CreateMLCEngine(
        modelOption.id,  // modelId
        {},              // MLCEngineConfig - empty for defaults
        // Pass empty ChatOptions, we'll set these during generation
        {}
      );
      setEngine(newEngine);
      
      // Set progress callback using the correct method name
      newEngine.setInitProgressCallback((report: any) => {
        if (report.progress !== undefined && report.total !== undefined) {
          const percentage = Math.floor((report.progress / report.total) * 100);
          setProgress(percentage);
          setStatusMessage(`Loading model: ${percentage}% (${(report.progress / 1024 / 1024).toFixed(1)}MB / ${(report.total / 1024 / 1024).toFixed(1)}MB)`);
        } else {
          setStatusMessage(report.text || 'Loading model...');
        }
      });
      
      setIsLoaded(true);
      setIsLoading(false);
      setStatusMessage('Model loaded successfully!');
      
      toast({
        title: 'MODEL LOADED',
        description: `${modelOption.name} is ready for inference`,
      });
      
    } catch (error) {
      console.error('Error initializing WebLLM engine:', error);
      setIsLoading(false);
      setStatusMessage('Failed to load model. Check console for details.');
      
      toast({
        title: 'MODEL LOAD ERROR',
        description: error instanceof Error ? error.message : 'Failed to load browser model',
        variant: 'destructive',
      });
    }
  };
  
  // Generate a response using the loaded model through the chat completions API
  const generateResponse = async (prompt: string): Promise<string> => {
    if (!engine || !isLoaded) {
      throw new Error('Model not loaded. Please load a model first.');
    }
    
    try {
      // Generate response using the chat completions API
      const response = await engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        top_p: topP,
        max_tokens: maxTokens,
      });
      
      // Extract the response text from the completion
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      }
      
      throw new Error('No response generated');
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  };
  
  // When the model option changes, reset and initialize the engine
  useEffect(() => {
    if (modelOption && !isLoaded && !isLoading) {
      resetEngine();
      initializeEngine();
    }
  }, [modelOption?.id]);
  
  return {
    engine,
    isLoaded,
    isLoading,
    progress,
    statusMessage,
    generateResponse,
    resetEngine
  };
}