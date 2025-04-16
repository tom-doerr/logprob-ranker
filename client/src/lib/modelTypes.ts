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
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    description: 'Google\'s latest fast model with excellent speed and efficiency',
    contextSize: '128K',
    pricing: '$0.35/M'
  },
  {
    id: 'openrouter/quasar-alpha',
    name: 'Quasar Alpha',
    description: 'OpenRouter\'s proprietary model with advanced reasoning capabilities',
    contextSize: '256K',
    pricing: '$4.00/M'
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    name: 'DeepSeek V3',
    description: 'Advanced 685B MoE model with excellent performance in reasoning and coding',
    contextSize: '64K',
    pricing: '$2.70/M'
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    description: 'State-of-the-art 671B MoE reasoning model with exceptional mathematical capabilities',
    contextSize: '164K',
    pricing: '$5.40/M'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Anthropic\'s latest balanced model with enhanced capabilities',
    contextSize: '200K',
    pricing: '$3.50/M'
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI\'s multimodal model with sophisticated reasoning',
    contextSize: '128K',
    pricing: '$5.00/M'
  },
  {
    id: 'anthropic/claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Anthropic\'s most intelligent model with expert reasoning',
    contextSize: '200K',
    pricing: '$15/M'
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