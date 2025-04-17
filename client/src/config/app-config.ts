/**
 * Configuration-driven app configuration
 * This approach allows for:
 * - Centralized configuration management
 * - Easy addition of new configuration parameters
 * - Consistent access to configuration values
 * - Self-documenting code
 */

// Authentication configuration
export const AUTH_CONFIG = {
  // OAuth configuration
  OAUTH: {
    CLIENT_ID: 'openrouter-client',
    REDIRECT_URI: `${window.location.origin}/callback`,
    AUTH_URL: 'https://openrouter.ai/auth',
    TOKEN_URL: 'https://openrouter.ai/api/v1/auth/keys',
    SCOPE: 'email',
  },
  
  // Browser model configuration
  BROWSER_MODEL: {
    DEFAULT_MODEL: 'Llama-2-7b-chat-hf-q4f16_1',
    FALLBACK_MODEL: 'RedPajama-INCITE-Chat-3B-v1-q4f16_1',
  },
  
  // Storage keys
  STORAGE: {
    API_KEY: 'nervui-api-key',
    AUTH_METHOD: 'nervui-auth-method',
  },
};

// Model configuration
export const MODEL_CONFIG = {
  // Available models
  MODELS: {
    GEMINI: 'google/gemini-pro',
    DEEPSEEK: 'deepseek-ai/deepseek-coder-33b-instruct',
    LLAMA3: 'meta-llama/llama-3-8b-instruct',
    CLAUDE: 'anthropic/claude-3-opus',
    GPT4: 'openai/gpt-4-turbo',
    GPT35: 'openai/gpt-3.5-turbo',
  },
  
  // Default parameter values
  DEFAULTS: {
    MODEL: 'google/gemini-pro',
    TEMPERATURE: 0.7,
    TOP_P: 0.9,
    MAX_TOKENS: 1000,
    NUM_VARIANTS: 3,
  },
};

// API configuration
export const API_CONFIG = {
  // OpenRouter configuration
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  OPENROUTER_REFERER: window.location.origin,
  
  // API settings
  REQUEST_TIMEOUT: 30000,   // 30 seconds
  MAX_RETRIES: 2,           // Number of retries for failed requests
  RETRY_DELAY: 1000,        // Delay between retries in milliseconds
};

// UI configuration
export const UI_CONFIG = {
  // Animation timing
  ANIMATION: {
    QUICK: 150,    // Quick animations (ms)
    NORMAL: 300,   // Normal animations (ms)
    SLOW: 500,     // Slow animations (ms)
  },
  
  // Toast notifications
  TOAST: {
    DURATION: 5000,          // Default toast duration in milliseconds
    MAX_TOASTS: 3,           // Maximum number of visible toasts
    POSITION: 'bottom-right', // Toast position
  },
  
  // UI theme configuration
  THEME: {
    PRIMARY_COLOR: '#DA680F',  // Eva orange
    SECONDARY_COLOR: '#4B38D3', // Eva purple
    ACCENT_COLOR: '#5CBEFF',   // Eva blue
    WARNING_COLOR: '#E54B4B',  // Eva red
    SUCCESS_COLOR: '#48A14D',  // Eva green
    
    DARK_MODE_DEFAULT: true,   // Default to dark mode
  },
};

// System message templates
export const TEMPLATES = {
  // System messages
  SYSTEM: {
    DEFAULT: 'You are a helpful assistant.',
    TECHNICAL: 'You are a technical assistant with expertise in programming and software development.',
    CREATIVE: 'You are a creative assistant that helps with writing, brainstorming, and content creation.',
    EVALUATOR: 'You are an evaluator. Analyze the provided text objectively and provide detailed feedback.',
  },
  
  // Evaluation templates
  EVALUATION: {
    DEFAULT: `
Evaluate this text based on the following criteria:
- originality: is the text original and creative? LOGPROB_TRUE if it's original.
- helpfulness: is the text helpful and informative? LOGPROB_TRUE if it's helpful.
- coherence: is the text well-structured and coherent? LOGPROB_TRUE if it's coherent.
- accuracy: is the information accurate? LOGPROB_TRUE if it's accurate.
    `,
    CODE: `
Evaluate this code based on the following criteria:
- correctness: Does the code run without errors? LOGPROB_TRUE if it's correct.
- efficiency: Is the code efficient? LOGPROB_TRUE if it's efficient.
- readability: Is the code readable and well-commented? LOGPROB_TRUE if it's readable.
- bestPractices: Does the code follow best practices? LOGPROB_TRUE if it follows best practices.
    `,
    WRITING: `
Evaluate this writing based on the following criteria:
- clarity: Is the writing clear and easy to understand? LOGPROB_TRUE if it's clear.
- style: Is the writing style engaging and appropriate? LOGPROB_TRUE if the style is good.
- structure: Is the writing well-structured? LOGPROB_TRUE if the structure is good.
- grammar: Is the grammar and punctuation correct? LOGPROB_TRUE if the grammar is good.
    `,
  },
};

// Memory management configuration
export const MEMORY_CONFIG = {
  // Memory monitoring
  MONITORING: {
    ENABLED: true,               // Enable memory monitoring
    CHECK_INTERVAL: 60000,       // Check interval in milliseconds (increased to 60 seconds)
    WARNING_THRESHOLD: 250,      // Warning threshold in MB (increased)
    CRITICAL_THRESHOLD: 350,     // Critical threshold in MB (increased)
  },
  
  // Memory cleanup
  CLEANUP: {
    AUTO_CLEANUP: false,         // Disabled auto-cleanup to prevent page reloads
    CLEANUP_THRESHOLD: 400,      // Cleanup threshold in MB (increased)
  },
};

// Combined app configuration
export const APP_CONFIG = {
  // App information
  APP: {
    NAME: 'NervUI',
    VERSION: '1.0.0',
    DESCRIPTION: 'An Evangelion-themed AI model interface with advanced features',
  },
  
  // Export all configurations
  AUTH: AUTH_CONFIG,
  MODEL: MODEL_CONFIG,
  API: API_CONFIG,
  UI: UI_CONFIG,
  TEMPLATES: TEMPLATES,
  MEMORY: MEMORY_CONFIG,
};

// Default export for convenience
export default APP_CONFIG;