/**
 * Custom hook for model selection and parameters
 * Key improvements:
 * - Single source of truth for model state
 * - Automatic persistence of selections
 * - Type safety with TypeScript interfaces
 * - Simplified interface for components
 */

import { useState, useEffect } from 'react';
import { 
  ModelOption, 
  BrowserModelOption,
  BROWSER_MODEL_OPTIONS,
  POPULAR_MODELS
} from '../lib/modelTypes';
import { DEFAULT_PARAMETERS } from '../config/model-parameters';

/**
 * Interface for model parameters
 */
export interface ModelParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
}

/**
 * Interface for model selection state
 */
export interface ModelSelectionState {
  // Model selection
  browserModels: BrowserModelOption[];
  cloudModels: ModelOption[];
  selectedModelId: string;
  isUsingBrowserModel: boolean;
  customModelId: string;
  
  // Model parameters
  temperature: number;
  topP: number;
  maxTokens: number;
  
  // Actions
  selectModel: (id: string) => void;
  toggleBrowserModel: (enabled: boolean) => void;
  setCustomModel: (id: string) => void;
  updateParameters: (params: Partial<ModelParameters>) => void;
  resetToDefaults: () => void;
}

// Local storage keys
const STORAGE_KEYS = {
  SELECTED_MODEL: 'app.selectedModel',
  IS_BROWSER_MODEL: 'app.isBrowserModel',
  CUSTOM_MODEL: 'app.customModel',
  PARAMETERS: 'app.modelParameters'
};

/**
 * Default parameter values
 */
const DEFAULT_PARAMS: ModelParameters = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 1000
};

/**
 * Custom hook for model selection and parameters
 * - Centralizes all model-related logic
 * - Handles persistence of preferences
 * - Provides type-safe interface
 */
export function useModels(): ModelSelectionState {
  // Model selection state
  const [selectedModelId, setSelectedModelId] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL) || POPULAR_MODELS[0].id
  );
  
  const [isUsingBrowserModel, setIsUsingBrowserModel] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEYS.IS_BROWSER_MODEL) === 'true'
  );
  
  const [customModelId, setCustomModelId] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) || ''
  );
  
  // Parameter state
  const [parameters, setParameters] = useState<ModelParameters>(() => {
    const storedParams = localStorage.getItem(STORAGE_KEYS.PARAMETERS);
    return storedParams 
      ? JSON.parse(storedParams) 
      : DEFAULT_PARAMETERS;
  });
  
  // Persist selections to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, selectedModelId);
  }, [selectedModelId]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_BROWSER_MODEL, String(isUsingBrowserModel));
  }, [isUsingBrowserModel]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_MODEL, customModelId);
  }, [customModelId]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(parameters));
  }, [parameters]);
  
  // Model selection action
  const selectModel = (id: string) => {
    // Check if selecting a browser model
    const isBrowserModel = BROWSER_MODEL_OPTIONS.some(model => model.id === id);
    
    // Update model state
    setSelectedModelId(id);
    
    // If selecting a browser model, ensure browser mode is enabled
    if (isBrowserModel) {
      setIsUsingBrowserModel(true);
    }
  };
  
  // Browser mode toggle action
  const toggleBrowserModel = (enabled: boolean) => {
    setIsUsingBrowserModel(enabled);
    
    // When switching modes, select the first model of the appropriate type
    if (enabled) {
      // Select first browser model when enabling browser mode
      const isBrowserModelSelected = BROWSER_MODEL_OPTIONS.some(
        model => model.id === selectedModelId
      );
      
      if (!isBrowserModelSelected) {
        setSelectedModelId(BROWSER_MODEL_OPTIONS[0].id);
      }
    } else {
      // Select first cloud model when disabling browser mode
      const isCloudModelSelected = POPULAR_MODELS.some(
        model => model.id === selectedModelId
      );
      
      if (!isCloudModelSelected) {
        setSelectedModelId(POPULAR_MODELS[0].id);
      }
    }
  };
  
  // Custom model action
  const setCustomModel = (id: string) => {
    setCustomModelId(id);
  };
  
  // Parameter update action
  const updateParameters = (params: Partial<ModelParameters>) => {
    setParameters(prev => ({
      ...prev,
      ...params
    }));
  };
  
  // Reset parameters action
  const resetToDefaults = () => {
    setParameters(DEFAULT_PARAMETERS);
  };
  
  // Return state and actions
  return {
    // Models data
    browserModels: BROWSER_MODEL_OPTIONS,
    cloudModels: POPULAR_MODELS,
    
    // Model selection
    selectedModelId,
    isUsingBrowserModel,
    customModelId,
    
    // Parameters
    temperature: parameters.temperature,
    topP: parameters.topP,
    maxTokens: parameters.maxTokens,
    
    // Actions
    selectModel,
    toggleBrowserModel,
    setCustomModel,
    updateParameters,
    resetToDefaults
  };
}