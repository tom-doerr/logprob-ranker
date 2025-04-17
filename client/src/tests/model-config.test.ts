/**
 * Model Configuration Integration Tests
 * Tests the model configuration system and storage
 */

import { modelConfigStorage } from '../utils/storage';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Default model config values for reference
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_MODEL = 'openai/gpt-3.5-turbo';

describe('Model Configuration System', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  describe('Model Config Storage', () => {
    it('should provide default values when no config exists', () => {
      const config = modelConfigStorage.getModelConfig();
      
      expect(config.temperature).toBe(DEFAULT_TEMPERATURE);
      expect(config.topP).toBe(DEFAULT_TOP_P);
      expect(config.maxTokens).toBe(DEFAULT_MAX_TOKENS);
      expect(config.selectedModel).toBeDefined();
    });
    
    it('should save and retrieve complete config correctly', () => {
      const testConfig = {
        temperature: 0.5,
        topP: 0.8,
        maxTokens: 2000,
        selectedModel: 'anthropic/claude-2',
        isUsingBrowserModel: true,
        customModel: 'custom/model-id'
      };
      
      // Save config
      modelConfigStorage.saveModelConfig(testConfig);
      
      // Retrieve config
      const retrievedConfig = modelConfigStorage.getModelConfig();
      
      // Verify all values match
      expect(retrievedConfig.temperature).toBe(0.5);
      expect(retrievedConfig.topP).toBe(0.8);
      expect(retrievedConfig.maxTokens).toBe(2000);
      expect(retrievedConfig.selectedModel).toBe('anthropic/claude-2');
      expect(retrievedConfig.isUsingBrowserModel).toBe(true);
      expect(retrievedConfig.customModel).toBe('custom/model-id');
    });
    
    it('should update partial config values', () => {
      // Save initial config
      modelConfigStorage.saveModelConfig({
        temperature: 0.5,
        topP: 0.8,
        maxTokens: 2000,
        selectedModel: 'anthropic/claude-2'
      });
      
      // Update only temperature
      modelConfigStorage.saveModelConfig({
        temperature: 0.3
      });
      
      // Retrieve updated config
      const updatedConfig = modelConfigStorage.getModelConfig();
      
      // Verify temperature was updated but other values remain
      expect(updatedConfig.temperature).toBe(0.3);
      expect(updatedConfig.topP).toBe(0.8); // Unchanged
      expect(updatedConfig.maxTokens).toBe(2000); // Unchanged
      expect(updatedConfig.selectedModel).toBe('anthropic/claude-2'); // Unchanged
    });
    
    it('should reset config to defaults', () => {
      // Save non-default config
      modelConfigStorage.saveModelConfig({
        temperature: 0.1,
        topP: 0.5,
        maxTokens: 500,
        selectedModel: 'custom-model'
      });
      
      // Reset config
      modelConfigStorage.resetModelConfig();
      
      // Retrieve reset config
      const resetConfig = modelConfigStorage.getModelConfig();
      
      // Verify defaults were restored
      expect(resetConfig.temperature).toBe(DEFAULT_TEMPERATURE);
      expect(resetConfig.topP).toBe(DEFAULT_TOP_P);
      expect(resetConfig.maxTokens).toBe(DEFAULT_MAX_TOKENS);
      expect(resetConfig.selectedModel).not.toBe('custom-model');
    });
  });
  
  // Simplified ModelConfig hook implementation for testing
  const createModelConfig = (initialConfig = {}) => {
    // Get stored or default config
    let config = {
      ...modelConfigStorage.getModelConfig(),
      ...initialConfig
    };
    
    // Update temperature
    const updateTemperature = (value) => {
      config = { ...config, temperature: value };
      modelConfigStorage.saveModelConfig({ temperature: value });
      return config;
    };
    
    // Update topP
    const updateTopP = (value) => {
      config = { ...config, topP: value };
      modelConfigStorage.saveModelConfig({ topP: value });
      return config;
    };
    
    // Update maxTokens
    const updateMaxTokens = (value) => {
      config = { ...config, maxTokens: value };
      modelConfigStorage.saveModelConfig({ maxTokens: value });
      return config;
    };
    
    // Update selectedModel
    const updateSelectedModel = (modelId) => {
      config = { ...config, selectedModel: modelId };
      modelConfigStorage.saveModelConfig({ selectedModel: modelId });
      return config;
    };
    
    // Toggle browser model
    const toggleBrowserModel = (value) => {
      config = { ...config, isUsingBrowserModel: value };
      modelConfigStorage.saveModelConfig({ isUsingBrowserModel: value });
      return config;
    };
    
    // Reset config
    const resetModelConfig = () => {
      modelConfigStorage.resetModelConfig();
      config = modelConfigStorage.getModelConfig();
      return config;
    };
    
    return {
      config,
      updateTemperature,
      updateTopP,
      updateMaxTokens,
      updateSelectedModel,
      toggleBrowserModel,
      resetModelConfig
    };
  };
  
  describe('Model Config State Management', () => {
    it('should initialize with stored or default config', () => {
      // Set up stored config
      modelConfigStorage.saveModelConfig({
        temperature: 0.4,
        selectedModel: 'test-model'
      });
      
      // Create model config
      const { config } = createModelConfig();
      
      // Should use stored values and defaults for missing values
      expect(config.temperature).toBe(0.4); // From storage
      expect(config.selectedModel).toBe('test-model'); // From storage
      expect(config.topP).toBe(DEFAULT_TOP_P); // Default value
      expect(config.maxTokens).toBe(DEFAULT_MAX_TOKENS); // Default value
    });
    
    it('should update temperature and save to storage', () => {
      const modelConfig = createModelConfig();
      
      // Update temperature
      modelConfig.updateTemperature(0.3);
      
      // Check updated state
      expect(modelConfig.config.temperature).toBe(0.3);
      
      // Check storage was updated
      expect(modelConfigStorage.getModelConfig().temperature).toBe(0.3);
    });
    
    it('should update selectedModel and save to storage', () => {
      const modelConfig = createModelConfig();
      
      // Update selected model
      modelConfig.updateSelectedModel('google/gemini-pro');
      
      // Check updated state
      expect(modelConfig.config.selectedModel).toBe('google/gemini-pro');
      
      // Check storage was updated
      expect(modelConfigStorage.getModelConfig().selectedModel).toBe('google/gemini-pro');
    });
    
    it('should toggle browser model mode', () => {
      const modelConfig = createModelConfig({
        isUsingBrowserModel: false
      });
      
      // Toggle browser model on
      modelConfig.toggleBrowserModel(true);
      
      // Check updated state
      expect(modelConfig.config.isUsingBrowserModel).toBe(true);
      
      // Check storage was updated
      expect(modelConfigStorage.getModelConfig().isUsingBrowserModel).toBe(true);
      
      // Toggle browser model off
      modelConfig.toggleBrowserModel(false);
      
      // Check updated state
      expect(modelConfig.config.isUsingBrowserModel).toBe(false);
      
      // Check storage was updated
      expect(modelConfigStorage.getModelConfig().isUsingBrowserModel).toBe(false);
    });
    
    it('should reset all values to defaults', () => {
      const modelConfig = createModelConfig({
        temperature: 0.1,
        topP: 0.5,
        maxTokens: 500,
        selectedModel: 'custom-model',
        isUsingBrowserModel: true
      });
      
      // Reset config
      modelConfig.resetModelConfig();
      
      // Check state was reset
      expect(modelConfig.config.temperature).toBe(DEFAULT_TEMPERATURE);
      expect(modelConfig.config.topP).toBe(DEFAULT_TOP_P);
      expect(modelConfig.config.maxTokens).toBe(DEFAULT_MAX_TOKENS);
      expect(modelConfig.config.selectedModel).not.toBe('custom-model');
      expect(modelConfig.config.isUsingBrowserModel).toBe(false);
      
      // Check storage was reset
      const storedConfig = modelConfigStorage.getModelConfig();
      expect(storedConfig.temperature).toBe(DEFAULT_TEMPERATURE);
      expect(storedConfig.topP).toBe(DEFAULT_TOP_P);
      expect(storedConfig.maxTokens).toBe(DEFAULT_MAX_TOKENS);
    });
  });
});