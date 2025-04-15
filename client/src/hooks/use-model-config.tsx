import React, { createContext, useState, useRef, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ModelConfig, BROWSER_MODEL_OPTIONS, POPULAR_MODELS } from '../lib/modelTypes';
import * as webllm from '@mlc-ai/web-llm';

// Define the shape of our model configuration context
interface ModelConfigContextType {
  // Model settings
  isUsingBrowserModel: boolean;
  setIsUsingBrowserModel: (value: boolean) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  maxTokens: number;
  setMaxTokens: (value: number) => void;
  customModel: string;
  setCustomModel: (value: string) => void;
  
  // Browser model settings
  browserModelEngine: any;
  isModelLoaded: boolean;
  isLoadingModel: boolean;
  loadingProgress: number;
  loadingMessage: string;
  loadBrowserModel: () => Promise<void>;
  resetEngine: () => void;
  
  // Browser model options
  browserModelOptions: typeof BROWSER_MODEL_OPTIONS;
  popularModels: typeof POPULAR_MODELS;
  
  // Helper method
  getModelConfig: () => ModelConfig;
}

// Create the context with a default value
const ModelConfigContext = createContext<ModelConfigContextType | undefined>(undefined);

// Provider component that wraps the app and makes model config available to any child component
export function ModelConfigProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
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
      
      // Initialize WebLLM first
      try {
        setLoadingMessage('Initializing WebLLM...');
        // Some WebLLM versions have different initialization procedures
        // Just attempt to create the engine directly
        console.log('Starting WebLLM engine initialization');
      } catch (e) {
        console.log('WebLLM pre-initialization error:', e);
      }
      
      // Create a new engine with available WebLLM model
      setLoadingMessage('Creating engine for model: ' + selectedModel);
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

  // Provide a reset function to clean up resources
  const resetEngine = () => {
    if (engineRef.current) {
      engineRef.current = null;
    }
    setIsModelLoaded(false);
  };

  // Return the complete model configuration
  const getModelConfig = (): ModelConfig => ({
    isUsingBrowserModel,
    selectedModel,
    temperature,
    topP,
    maxTokens,
    customModel,
    browserModelEngine: engineRef.current
  });

  // Create the context value object
  const contextValue: ModelConfigContextType = {
    // Model settings
    isUsingBrowserModel,
    setIsUsingBrowserModel,
    selectedModel,
    setSelectedModel,
    temperature,
    setTemperature,
    topP,
    setTopP,
    maxTokens,
    setMaxTokens,
    customModel,
    setCustomModel,
    
    // Browser model settings
    browserModelEngine: engineRef.current,
    isModelLoaded,
    isLoadingModel,
    loadingProgress,
    loadingMessage,
    loadBrowserModel,
    resetEngine,
    
    // Browser model options
    browserModelOptions: BROWSER_MODEL_OPTIONS,
    popularModels: POPULAR_MODELS,
    
    // Helper method
    getModelConfig
  };

  return (
    <ModelConfigContext.Provider value={contextValue}>
      {children}
    </ModelConfigContext.Provider>
  );
}

// Hook that lets any component easily access the model configuration context
export function useModelConfig() {
  const context = useContext(ModelConfigContext);
  
  if (context === undefined) {
    throw new Error('useModelConfig must be used within a ModelConfigProvider');
  }
  
  return context;
}