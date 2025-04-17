/**
 * Application Initialization Utility
 * 
 * This utility helps manage application initialization, persistence cleanup,
 * and reload handling. It provides a consistent way to handle actions that
 * should occur when the application starts or reloads.
 */

import { cleanupExpiredFormStates } from './form-persistence';
import { cleanupExpiredChatData } from './chat-persistence';
import { cleanupAllModelResources } from './model-cleanup';

/**
 * Reload event tracking
 */
const APP_RELOAD_KEY = 'app.lastReload';
const RELOAD_THRESHOLD_MS = 3000; // 3 seconds

/**
 * Checks if this is a quick reload (likely due to HMR)
 */
function isQuickReload(): boolean {
  try {
    const lastReload = localStorage.getItem(APP_RELOAD_KEY);
    const now = Date.now();
    
    if (lastReload) {
      const lastReloadTime = parseInt(lastReload, 10);
      if (now - lastReloadTime < RELOAD_THRESHOLD_MS) {
        return true;
      }
    }
    
    // Update last reload time
    localStorage.setItem(APP_RELOAD_KEY, now.toString());
    return false;
  } catch (error) {
    console.error('Error checking reload status:', error);
    return false;
  }
}

/**
 * Initialization options
 */
interface InitOptions {
  // Whether to clean up expired data
  cleanupExpired?: boolean;
  
  // Whether to show reload notifications
  showReloadNotifications?: boolean;
  
  // Custom function to run on normal load (not quick reload)
  onNormalLoad?: () => void;
  
  // Custom function to run on quick reload (likely HMR)
  onQuickReload?: () => void;
  
  // Custom function to run on every load regardless of type
  onEveryLoad?: () => void;
}

/**
 * Initializes the application with consistent lifecycle handling
 */
export function initializeApp(options: InitOptions = {}): void {
  const {
    cleanupExpired = true,
    showReloadNotifications = true,
    onNormalLoad,
    onQuickReload,
    onEveryLoad
  } = options;
  
  try {
    // Check if this is a quick reload
    const quickReload = isQuickReload();
    
    // Handle quick reload detection
    if (quickReload) {
      if (showReloadNotifications) {
        console.log('[App] Quick reload detected (HMR)');
      }
      
      // Run quick reload callback if provided
      if (onQuickReload) {
        onQuickReload();
      }
    } else {
      // Run normal load callback if provided
      if (onNormalLoad) {
        onNormalLoad();
      }
      
      // Clean up on normal load only to avoid unnecessary work during development
      if (cleanupExpired) {
        cleanupExpiredFormStates();
        cleanupExpiredChatData();
        
        // Clean up any models that might be in memory
        cleanupAllModelResources();
        console.log('[App] Cleaned up model resources on load');
      }
    }
    
    // Always run the every load callback
    if (onEveryLoad) {
      onEveryLoad();
    }
    
    // Register beforeunload handler to save state
    window.addEventListener('beforeunload', () => {
      // Clean up models before page unload to prevent memory leaks
      try {
        cleanupAllModelResources();
      } catch (e) {
        console.error('Error cleaning up models during unload:', e);
      }
    });
    
    // Handle visibility changes to detect when the user switches tabs
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // The user is now active in this tab
        localStorage.setItem('app.lastActive', Date.now().toString());
      } else {
        // User switched away from this tab - release resources
        // Only clean up models that consume significant memory
        try {
          // Use a more lightweight cleanup when just switching tabs
          // This will help reduce memory usage without full cleanup
          cleanupAllModelResources();
        } catch (e) {
          console.error('Error cleaning up during visibility change:', e);
        }
      }
    });
    
  } catch (error) {
    console.error('Error initializing application:', error);
  }
}

/**
 * Registers handler to reconnect after lost HMR connection
 * This helps preserve state if the development server disconnects temporarily
 */
export function registerHmrReconnectHandler(): void {
  try {
    window.addEventListener('message', (event) => {
      // Listen for Vite HMR reconnection events
      if (
        event.data && 
        typeof event.data === 'object' &&
        event.data.type === 'vite:reconnect'
      ) {
        console.log('[App] HMR reconnecting, preserving state...');
        
        // Flag that we're in a reconnection state
        sessionStorage.setItem('app.hmrReconnecting', 'true');
      }
    });
    
    // Check if we're coming back from a reconnection
    if (sessionStorage.getItem('app.hmrReconnecting') === 'true') {
      console.log('[App] HMR reconnected, state preserved');
      sessionStorage.removeItem('app.hmrReconnecting');
    }
  } catch (error) {
    console.error('Error registering HMR reconnect handler:', error);
  }
}

/**
 * Example usage:
 * 
 * // In your main.tsx or similar entry point:
 * import { initializeApp, registerHmrReconnectHandler } from './utils/app-initializer';
 * 
 * // Initialize the app
 * initializeApp({
 *   showReloadNotifications: process.env.NODE_ENV === 'development',
 *   onNormalLoad: () => {
 *     console.log('App loaded normally');
 *   },
 *   onQuickReload: () => {
 *     console.log('App reloaded via HMR');
 *   }
 * });
 * 
 * // Register HMR reconnect handler
 * if (process.env.NODE_ENV === 'development') {
 *   registerHmrReconnectHandler();
 * }
 */