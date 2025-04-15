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

// Shared browser model options to avoid duplication
export const BROWSER_MODEL_OPTIONS: BrowserModelOption[] = [
  {
    id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.1 8B Instruct',
    source: 'Meta',
    description: 'Compact but capable instruction-following model'
  },
  {
    id: 'Phi-3-mini-4k-Instruct-q4f32_1-MLC',
    name: 'Phi-3 Mini 4K Instruct',
    source: 'Microsoft',
    description: 'Efficient small model with strong reasoning abilities'
  },
  {
    id: 'Gemma-2B-it-q4f32_1-MLC',
    name: 'Gemma 2B Instruct',
    source: 'Google',
    description: 'Lightweight yet effective conversational model'
  },
  {
    id: 'Qwen2-1.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen2 1.5B Instruct',
    source: 'Alibaba',
    description: 'Efficient multilingual instruction model'
  }
];

// Shared popular API model options
export const POPULAR_MODELS: ModelOption[] = [
  {
    id: 'anthropic/claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: 'Fast, compact AI assistant with strong coding abilities',
    contextSize: '200K',
    pricing: '$0.25/M'
  },
  {
    id: 'anthropic/claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Anthropic\'s most intelligent model with expert reasoning',
    contextSize: '200K',
    pricing: '$15/M'
  },
  {
    id: 'anthropic/claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    description: 'Balanced intelligence and speed for complex tasks',
    contextSize: '200K',
    pricing: '$3/M'
  },
  {
    id: 'google/gemini-1.5-pro-latest',
    name: 'Gemini 1.5 Pro',
    description: 'State-of-the-art reasoning, multimodality, and coding abilities',
    contextSize: '1M',
    pricing: '$7/M'
  },
  {
    id: 'meta-llama/llama-3-70b-instruct',
    name: 'Llama 3 70B',
    description: 'Meta\'s SOTA large language model with advanced capabilities',
    contextSize: '8K',
    pricing: '$1.50/M'
  },
  {
    id: 'mistralai/mistral-large-latest',
    name: 'Mistral Large',
    description: 'Flagship Mistral model with excellent reasoning abilities',
    contextSize: '32K',
    pricing: '$2/M'
  }
];