import { useState, useEffect } from 'react';
import { BROWSER_MODEL_OPTIONS, POPULAR_MODELS, BrowserModelOption, ModelOption } from '../lib/modelTypes';
import { modelStorage } from '../utils/storage';

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
  const [isUsingBrowserModel, setIsUsingBrowserModel] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  
  // Model parameters
  const [temperature, setTemperature] = useState(DEFAULT_PARAMS.temperature);
  const [topP, setTopP] = useState(DEFAULT_PARAMS.topP);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_PARAMS.maxTokens);
  
  // Load saved preferences on init
  useEffect(() => {
    const lastModel = modelStorage.getLastUsedModel();
    const preferences = modelStorage.getModelPreferences();
    
    if (lastModel) {
      setSelectedModelId(lastModel);
      // Check if it's a browser model
      const isBrowserModel = BROWSER_MODEL_OPTIONS.some(model => model.id === lastModel);
      setIsUsingBrowserModel(isBrowserModel);
    } else {
      // Default to first cloud model if nothing saved
      setSelectedModelId(POPULAR_MODELS[0].id);
    }
    
    if (preferences) {
      // Load saved parameters
      setTemperature(preferences.temperature ?? DEFAULT_PARAMS.temperature);
      setTopP(preferences.topP ?? DEFAULT_PARAMS.topP);
      setMaxTokens(preferences.maxTokens ?? DEFAULT_PARAMS.maxTokens);
      
      if (preferences.customModel) {
        setCustomModelId(preferences.customModel);
      }
    }
  }, []);
  
  // Save preferences when they change
  useEffect(() => {
    // Save last used model
    modelStorage.saveLastUsedModel(selectedModelId);
    
    // Save parameters
    modelStorage.saveModelPreferences({
      temperature,
      topP,
      maxTokens,
      customModel: customModelId,
      isUsingBrowserModel
    });
  }, [selectedModelId, temperature, topP, maxTokens, customModelId, isUsingBrowserModel]);

  // Select a model by ID
  const selectModel = (id: string) => {
    setSelectedModelId(id);
    
    // Check if it's a browser model
    const isBrowserModel = BROWSER_MODEL_OPTIONS.some(model => model.id === id);
    if (isBrowserModel !== isUsingBrowserModel) {
      setIsUsingBrowserModel(isBrowserModel);
    }
  };
  
  // Toggle browser model usage
  const toggleBrowserModel = (enabled: boolean) => {
    setIsUsingBrowserModel(enabled);
    
    // If enabling browser models, select the first one if current selection isn't a browser model
    if (enabled) {
      const currentIsBrowserModel = BROWSER_MODEL_OPTIONS.some(model => model.id === selectedModelId);
      if (!currentIsBrowserModel) {
        setSelectedModelId(BROWSER_MODEL_OPTIONS[0].id);
      }
    } else {
      // If disabling, switch to cloud model if current selection is a browser model
      const currentIsBrowserModel = BROWSER_MODEL_OPTIONS.some(model => model.id === selectedModelId);
      if (currentIsBrowserModel) {
        setSelectedModelId(POPULAR_MODELS[0].id);
      }
    }
  };
  
  // Update parameters in one operation
  const updateParameters = (params: Partial<ModelParameters>) => {
    if (params.temperature !== undefined) setTemperature(params.temperature);
    if (params.topP !== undefined) setTopP(params.topP);
    if (params.maxTokens !== undefined) setMaxTokens(params.maxTokens);
  };
  
  // Reset to default values
  const resetToDefaults = () => {
    setTemperature(DEFAULT_PARAMS.temperature);
    setTopP(DEFAULT_PARAMS.topP);
    setMaxTokens(DEFAULT_PARAMS.maxTokens);
  };
  
  return {
    // Available models
    browserModels: BROWSER_MODEL_OPTIONS,
    cloudModels: POPULAR_MODELS,
    
    // Selection state
    selectedModelId,
    isUsingBrowserModel,
    customModelId,
    
    // Parameters
    temperature,
    topP,
    maxTokens,
    
    // Actions
    selectModel,
    toggleBrowserModel,
    setCustomModel,
    updateParameters,
    resetToDefaults
  };
}