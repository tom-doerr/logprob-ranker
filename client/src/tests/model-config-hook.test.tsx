/**
 * Model Configuration Hook Integration Test
 * Tests the model configuration system with React hooks
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Create mock localStorage
const createMockStorage = () => {
  let storage = {};
  
  return {
    getItem: vi.fn((key) => {
      return storage[key] || null;
    }),
    setItem: vi.fn((key, value) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      storage = {};
    }),
    _getStorage: () => storage // For testing
  };
};

// Mock localStorage
const mockStorage = createMockStorage();
Object.defineProperty(window, 'localStorage', {
  value: mockStorage
});

// Model config constants
const MODEL_CONFIG_KEY = 'app_model_config';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_MODEL = 'openai/gpt-3.5-turbo';

// Model config storage utility
const modelConfigStorage = {
  getModelConfig: () => {
    const stored = window.localStorage.getItem(MODEL_CONFIG_KEY);
    if (!stored) {
      return {
        temperature: DEFAULT_TEMPERATURE,
        topP: DEFAULT_TOP_P,
        maxTokens: DEFAULT_MAX_TOKENS,
        selectedModel: DEFAULT_MODEL,
        isUsingBrowserModel: false
      };
    }
    
    try {
      return JSON.parse(stored);
    } catch (e) {
      return {
        temperature: DEFAULT_TEMPERATURE,
        topP: DEFAULT_TOP_P,
        maxTokens: DEFAULT_MAX_TOKENS,
        selectedModel: DEFAULT_MODEL,
        isUsingBrowserModel: false
      };
    }
  },
  
  saveModelConfig: (config) => {
    const current = modelConfigStorage.getModelConfig();
    const updated = { ...current, ...config };
    window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(updated));
    return updated;
  },
  
  resetModelConfig: () => {
    const defaults = {
      temperature: DEFAULT_TEMPERATURE,
      topP: DEFAULT_TOP_P,
      maxTokens: DEFAULT_MAX_TOKENS,
      selectedModel: DEFAULT_MODEL,
      isUsingBrowserModel: false
    };
    window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(defaults));
    return defaults;
  }
};

// Custom hook for model config
const useModelConfig = () => {
  const [config, setConfig] = React.useState(() => modelConfigStorage.getModelConfig());
  
  const updateTemperature = (value) => {
    const updated = modelConfigStorage.saveModelConfig({ temperature: value });
    setConfig(updated);
  };
  
  const updateTopP = (value) => {
    const updated = modelConfigStorage.saveModelConfig({ topP: value });
    setConfig(updated);
  };
  
  const updateMaxTokens = (value) => {
    const updated = modelConfigStorage.saveModelConfig({ maxTokens: value });
    setConfig(updated);
  };
  
  const updateSelectedModel = (modelId) => {
    const updated = modelConfigStorage.saveModelConfig({ selectedModel: modelId });
    setConfig(updated);
  };
  
  const toggleBrowserModel = (value) => {
    const updated = modelConfigStorage.saveModelConfig({ isUsingBrowserModel: value });
    setConfig(updated);
  };
  
  const resetModelConfig = () => {
    const defaults = modelConfigStorage.resetModelConfig();
    setConfig(defaults);
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

// Test component using the hook
const ModelConfigComponent = () => {
  const {
    config,
    updateTemperature,
    updateTopP,
    updateMaxTokens,
    updateSelectedModel,
    toggleBrowserModel,
    resetModelConfig
  } = useModelConfig();
  
  return (
    <div>
      <div data-testid="config-display">
        {JSON.stringify(config)}
      </div>
      
      <div>
        <label htmlFor="temperature">Temperature: {config.temperature}</label>
        <input
          data-testid="temperature-input"
          id="temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.temperature}
          onChange={(e) => updateTemperature(parseFloat(e.target.value))}
        />
      </div>
      
      <div>
        <label htmlFor="topP">Top P: {config.topP}</label>
        <input
          data-testid="top-p-input"
          id="topP"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.topP}
          onChange={(e) => updateTopP(parseFloat(e.target.value))}
        />
      </div>
      
      <div>
        <label htmlFor="maxTokens">Max Tokens: {config.maxTokens}</label>
        <input
          data-testid="max-tokens-input"
          id="maxTokens"
          type="number"
          min="100"
          max="4000"
          step="100"
          value={config.maxTokens}
          onChange={(e) => updateMaxTokens(parseInt(e.target.value))}
        />
      </div>
      
      <div>
        <label htmlFor="model-select">Model: {config.selectedModel}</label>
        <select
          data-testid="model-select"
          id="model-select"
          value={config.selectedModel}
          onChange={(e) => updateSelectedModel(e.target.value)}
        >
          <option value="openai/gpt-3.5-turbo">GPT-3.5</option>
          <option value="openai/gpt-4">GPT-4</option>
          <option value="anthropic/claude-2">Claude</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="browser-model-toggle">
          <input
            data-testid="browser-model-toggle"
            id="browser-model-toggle"
            type="checkbox"
            checked={config.isUsingBrowserModel}
            onChange={(e) => toggleBrowserModel(e.target.checked)}
          />
          Use Browser Model
        </label>
      </div>
      
      <button
        data-testid="reset-button"
        onClick={resetModelConfig}
      >
        Reset to Defaults
      </button>
    </div>
  );
};

describe('Model Config Hook Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });
  
  it('should initialize with default or stored values', () => {
    // Preset a stored config
    const storedConfig = {
      temperature: 0.5,
      topP: 0.8,
      maxTokens: 2000,
      selectedModel: 'anthropic/claude-2',
      isUsingBrowserModel: true
    };
    window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(storedConfig));
    
    // Render component
    render(<ModelConfigComponent />);
    
    // Check displayed config
    const configDisplay = screen.getByTestId('config-display');
    const displayedConfig = JSON.parse(configDisplay.textContent);
    
    // Should match stored config
    expect(displayedConfig.temperature).toBe(0.5);
    expect(displayedConfig.topP).toBe(0.8);
    expect(displayedConfig.maxTokens).toBe(2000);
    expect(displayedConfig.selectedModel).toBe('anthropic/claude-2');
    expect(displayedConfig.isUsingBrowserModel).toBe(true);
  });
  
  it('should update temperature when slider is changed', () => {
    // Render component
    render(<ModelConfigComponent />);
    
    // Find temperature slider
    const slider = screen.getByTestId('temperature-input');
    
    // Change temperature to 0.3
    act(() => {
      fireEvent.change(slider, { target: { value: '0.3' } });
    });
    
    // Check displayed config
    const configDisplay = screen.getByTestId('config-display');
    const displayedConfig = JSON.parse(configDisplay.textContent);
    
    // Temperature should be updated
    expect(displayedConfig.temperature).toBe(0.3);
    
    // Should be saved to localStorage
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      MODEL_CONFIG_KEY,
      expect.stringContaining('"temperature":0.3')
    );
  });
  
  it('should update selected model', () => {
    // Render component
    render(<ModelConfigComponent />);
    
    // Find model select
    const select = screen.getByTestId('model-select');
    
    // Change model to GPT-4
    act(() => {
      fireEvent.change(select, { target: { value: 'openai/gpt-4' } });
    });
    
    // Check displayed config
    const configDisplay = screen.getByTestId('config-display');
    const displayedConfig = JSON.parse(configDisplay.textContent);
    
    // Model should be updated
    expect(displayedConfig.selectedModel).toBe('openai/gpt-4');
    
    // Should be saved to localStorage
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      MODEL_CONFIG_KEY,
      expect.stringContaining('"selectedModel":"openai/gpt-4"')
    );
  });
  
  it('should toggle browser model', () => {
    // Render component
    render(<ModelConfigComponent />);
    
    // Find browser model toggle
    const toggle = screen.getByTestId('browser-model-toggle');
    
    // Initial state should be unchecked (false)
    expect(toggle.checked).toBe(false);
    
    // Toggle browser model on
    act(() => {
      fireEvent.click(toggle);
    });
    
    // Check displayed config
    const configDisplay = screen.getByTestId('config-display');
    const displayedConfig = JSON.parse(configDisplay.textContent);
    
    // Browser model should be toggled on
    expect(displayedConfig.isUsingBrowserModel).toBe(true);
    expect(toggle.checked).toBe(true);
    
    // Should be saved to localStorage
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      MODEL_CONFIG_KEY,
      expect.stringContaining('"isUsingBrowserModel":true')
    );
  });
  
  it('should reset to defaults when reset button clicked', () => {
    // Set up non-default config
    const nonDefaultConfig = {
      temperature: 0.2,
      topP: 0.5,
      maxTokens: 3000,
      selectedModel: 'anthropic/claude-2',
      isUsingBrowserModel: true
    };
    window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(nonDefaultConfig));
    
    // Render component
    render(<ModelConfigComponent />);
    
    // Initial config should match non-default
    let configDisplay = screen.getByTestId('config-display');
    let displayedConfig = JSON.parse(configDisplay.textContent);
    expect(displayedConfig.temperature).toBe(0.2);
    
    // Click reset button
    const resetButton = screen.getByTestId('reset-button');
    act(() => {
      fireEvent.click(resetButton);
    });
    
    // Config should be reset to defaults
    configDisplay = screen.getByTestId('config-display');
    displayedConfig = JSON.parse(configDisplay.textContent);
    
    expect(displayedConfig.temperature).toBe(DEFAULT_TEMPERATURE);
    expect(displayedConfig.topP).toBe(DEFAULT_TOP_P);
    expect(displayedConfig.maxTokens).toBe(DEFAULT_MAX_TOKENS);
    expect(displayedConfig.selectedModel).toBe(DEFAULT_MODEL);
    expect(displayedConfig.isUsingBrowserModel).toBe(false);
    
    // Should be saved to localStorage
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      MODEL_CONFIG_KEY,
      expect.stringContaining(`"temperature":${DEFAULT_TEMPERATURE}`)
    );
  });
});