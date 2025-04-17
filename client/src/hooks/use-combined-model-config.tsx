/**
 * Combined model configuration hook
 * Provides unified access to all model configuration
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { modelConfigStorage, ModelConfig } from '../utils/storage';
import { APP_CONFIG } from '../config/app-config';

// Context type
interface ModelConfigContextType extends ModelConfig {
  // State update methods
  updateTemperature: (value: number) => void;
  updateTopP: (value: number) => void;
  updateMaxTokens: (value: number) => void;
  updateSelectedModel: (value: string) => void;
  updateCustomModel: (value: string) => void;
  
  // Browser model state
  browserModelEngine: any | null;
  browserModelLoading: boolean;
  browserModelError: string | null;
  
  // Browser model methods
  loadBrowserModel: (modelId?: string) => Promise<void>;
  unloadBrowserModel: () => void;
  toggleBrowserModel: (value: boolean) => void;
  
  // Config reset
  resetModelConfig: () => void;
}

// Create context with default values
const ModelConfigContext = createContext<ModelConfigContextType>({
  // Initial values (will be overridden by storage)
  temperature: APP_CONFIG.MODEL.DEFAULTS.TEMPERATURE,
  topP: APP_CONFIG.MODEL.DEFAULTS.TOP_P, 
  maxTokens: APP_CONFIG.MODEL.DEFAULTS.MAX_TOKENS,
  selectedModel: APP_CONFIG.MODEL.DEFAULTS.MODEL,
  customModel: '',
  isUsingBrowserModel: false,
  
  // Model engines
  browserModelEngine: null,
  browserModelLoading: false,
  browserModelError: null,
  
  // Methods (dummy implementations for default context)
  updateTemperature: () => {},
  updateTopP: () => {},
  updateMaxTokens: () => {},
  updateSelectedModel: () => {},
  updateCustomModel: () => {},
  loadBrowserModel: async () => {},
  unloadBrowserModel: () => {},
  toggleBrowserModel: () => {},
  resetModelConfig: () => {}
});

// Context provider component
export function ModelConfigProvider({ children }: { children: ReactNode }) {
  // Load initial config from storage
  const initialConfig = modelConfigStorage.getModelConfig();
  
  // Model configuration state
  const [temperature, setTemperature] = useState<number>(initialConfig.temperature);
  const [topP, setTopP] = useState<number>(initialConfig.topP);
  const [maxTokens, setMaxTokens] = useState<number>(initialConfig.maxTokens);
  const [selectedModel, setSelectedModel] = useState<string>(initialConfig.selectedModel);
  const [customModel, setCustomModel] = useState<string>(initialConfig.customModel);
  const [isUsingBrowserModel, setIsUsingBrowserModel] = useState<boolean>(initialConfig.isUsingBrowserModel);
  
  // Browser model state
  const [browserModelEngine, setBrowserModelEngine] = useState<any | null>(null);
  const [browserModelLoading, setBrowserModelLoading] = useState<boolean>(false);
  const [browserModelError, setBrowserModelError] = useState<string | null>(null);
  
  // Save config changes to storage
  useEffect(() => {
    modelConfigStorage.saveModelConfig({
      temperature,
      topP,
      maxTokens,
      selectedModel,
      customModel,
      isUsingBrowserModel
    });
  }, [temperature, topP, maxTokens, selectedModel, customModel, isUsingBrowserModel]);
  
  // Update methods
  const updateTemperature = (value: number) => setTemperature(value);
  const updateTopP = (value: number) => setTopP(value);
  const updateMaxTokens = (value: number) => setMaxTokens(value);
  const updateSelectedModel = (value: string) => setSelectedModel(value);
  const updateCustomModel = (value: string) => setCustomModel(value);
  
  // Toggle browser model
  const toggleBrowserModel = (value: boolean) => {
    setIsUsingBrowserModel(value);
    
    // If enabling browser model but no engine loaded, load one
    if (value && !browserModelEngine) {
      loadBrowserModel();
    }
  };
  
  // Reset config to defaults
  const resetModelConfig = () => {
    const defaultConfig = APP_CONFIG.MODEL.DEFAULTS;
    setTemperature(defaultConfig.TEMPERATURE);
    setTopP(defaultConfig.TOP_P);
    setMaxTokens(defaultConfig.MAX_TOKENS);
    setSelectedModel(defaultConfig.MODEL);
    setCustomModel('');
    setIsUsingBrowserModel(false);
    
    // Save to storage
    modelConfigStorage.resetModelConfig();
  };
  
  // Load browser model
  const loadBrowserModel = async (modelId?: string) => {
    // Don't load if already loading
    if (browserModelLoading) return;
    
    let browserModelModule;
    
    try {
      // Set loading state
      setBrowserModelLoading(true);
      setBrowserModelError(null);
      
      // Import the module dynamically
      browserModelModule = await import('@mlc-ai/web-llm');
      
      // Create the engine
      const modelName = modelId || APP_CONFIG.AUTH.BROWSER_MODEL.DEFAULT_MODEL;
      const engine = new browserModelModule.ChatModule({});
      
      // Initialize the model
      await engine.reload(modelName, {
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP
      });
      
      // Store the engine
      setBrowserModelEngine(engine);
      setIsUsingBrowserModel(true);
      console.log(`[Model] Browser model loaded: ${modelName}`);
      
    } catch (error) {
      console.error('[Model] Failed to load browser model:', error);
      setBrowserModelError(`Failed to load model: ${error instanceof Error ? error.message : String(error)}`);
      setIsUsingBrowserModel(false);
      
      // Try loading fallback model if specified
      if (modelId && modelId !== APP_CONFIG.AUTH.BROWSER_MODEL.FALLBACK_MODEL) {
        console.log('[Model] Trying fallback model...');
        try {
          await loadBrowserModel(APP_CONFIG.AUTH.BROWSER_MODEL.FALLBACK_MODEL);
        } catch (fallbackError) {
          console.error('[Model] Fallback model failed:', fallbackError);
        }
      }
    } finally {
      setBrowserModelLoading(false);
    }
  };
  
  // Unload browser model
  const unloadBrowserModel = () => {
    if (browserModelEngine) {
      try {
        // No explicit unload method in the API, so just release reference
        setBrowserModelEngine(null);
        setIsUsingBrowserModel(false);
        console.log('[Model] Browser model unloaded');
      } catch (error) {
        console.error('[Model] Error unloading browser model:', error);
      }
    }
  };
  
  // Context value
  const value: ModelConfigContextType = {
    // State
    temperature,
    topP,
    maxTokens,
    selectedModel,
    customModel,
    isUsingBrowserModel,
    browserModelEngine,
    browserModelLoading,
    browserModelError,
    
    // Methods
    updateTemperature,
    updateTopP,
    updateMaxTokens,
    updateSelectedModel,
    updateCustomModel,
    loadBrowserModel,
    unloadBrowserModel,
    toggleBrowserModel,
    resetModelConfig
  };
  
  return (
    <ModelConfigContext.Provider value={value}>
      {children}
    </ModelConfigContext.Provider>
  );
}

// Hook to use the model config
export function useCombinedModelConfig() {
  return useContext(ModelConfigContext);
}

export default useCombinedModelConfig;