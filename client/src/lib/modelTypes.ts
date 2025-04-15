/**
 * Common model configuration interface used across different components
 */

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  contextSize: string;
  pricing: string;
}

export interface BrowserModelOption {
  id: string;
  name: string;
  source: string;
  description: string;
}

export interface ModelConfig {
  isUsingBrowserModel: boolean;
  selectedModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  customModel?: string;
  browserModelEngine?: any;
}