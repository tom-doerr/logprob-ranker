/**
 * App initializer module
 * Provides centralized initialization for the application
 */

// Add typing for window._env
declare global {
  interface Window {
    _env?: {
      OPENROUTER_API_KEY?: string;
      [key: string]: string | undefined;
    };
  }
}

// Module state
let initialized = false;

/**
 * Initialize the application
 */
export function initialize(): void {
  if (initialized) {
    console.warn('[AppInitializer] App already initialized');
    return;
  }
  
  console.log('[AppInitializer] Initializing application');
  
  // Initialize environment API key if available
  initializeEnvApiKey();
  
  // Register HMR handler in development mode
  if (isDevelopment() && import.meta.hot) {
    registerHmrReconnectHandler();
  }
  
  // Set initialization flag
  initialized = true;
}

/**
 * Initialize API key from environment variables
 */
function initializeEnvApiKey(): void {
  // Import here to avoid circular dependencies
  import('../utils/storage').then(({ authStorage }) => {
    // Check if already authenticated
    if (authStorage.isAuthenticated()) {
      console.log('[AppInitializer] Using existing authentication');
      return;
    }
    
    // Try to use the environment API key if available
    try {
      // Check if we're running on server with environment variables
      if (window && window._env && window._env.OPENROUTER_API_KEY) {
        const envApiKey = window._env.OPENROUTER_API_KEY;
        if (envApiKey && envApiKey.length > 0) {
          console.log('[AppInitializer] Using environment API key');
          authStorage.setApiKey(envApiKey);
          authStorage.setAuthMethod('manual');
          
          // Dispatch event to inform app of authentication
          window.dispatchEvent(new Event('api-key-changed'));
        }
      }
    } catch (error) {
      console.error('[AppInitializer] Error initializing environment API key:', error);
    }
  });
}

/**
 * Check if app is running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Check if app is running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}

/**
 * Handle HMR reconnect in development mode
 */
export function registerHmrReconnectHandler(): void {
  if (!import.meta.hot) {
    return;
  }
  
  import.meta.hot.on('vite:beforeUpdate', () => {
    console.log('[HMR] Preparing for update');
  });
  
  // Clean up any resources that need to be disposed on HMR update
  import.meta.hot.dispose(() => {
    console.log('[HMR] Disposing resources before update');
    // Add cleanup code here if needed
  });
}

// Register window event listeners
export function registerGlobalEventHandlers(): void {
  // Handle beforeunload to clean up resources
  window.addEventListener('beforeunload', () => {
    console.log('[AppInitializer] Cleaning up before unload');
    // Add cleanup code here
  });
  
  // Handle visibility change to pause/resume operations
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('[AppInitializer] App visibility: hidden');
      // Pause non-critical operations
    } else {
      console.log('[AppInitializer] App visibility: visible');
      // Resume operations
    }
  });
}

// Default export with all functions
export default {
  initialize,
  isDevelopment,
  isProduction,
  registerHmrReconnectHandler,
  registerGlobalEventHandlers
};