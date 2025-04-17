/**
 * Memory Management Utilities
 * 
 * This module provides tools for monitoring and managing memory usage
 * in the application, especially important for browser-based LLM inference.
 */

// Memory threshold in MB that triggers cleanup
const MEMORY_THRESHOLD_MB = 200;

// Memory monitor configuration
type MemoryMonitorConfig = {
  // How often to check memory usage (ms)
  checkInterval?: number;
  // Memory threshold in MB that triggers cleanup
  threshold?: number;
  // Whether to log memory usage
  enableLogging?: boolean;
  // Callback when memory exceeds threshold
  onExceedThreshold?: () => void;
  // Cleanup function to call when threshold is exceeded
  cleanup?: () => void;
};

// Default configuration
const DEFAULT_CONFIG: MemoryMonitorConfig = {
  checkInterval: 15000, // 15 seconds
  threshold: MEMORY_THRESHOLD_MB,
  enableLogging: true,
  onExceedThreshold: () => console.warn(`⚠️ Critical memory usage detected`),
  cleanup: () => {}
};

// Holds the interval ID for the memory monitor
let memoryMonitorInterval: number | null = null;

/**
 * Gets the current memory usage in MB
 */
export function getCurrentMemoryUsage(): number {
  if (window.performance && (performance as any).memory) {
    const memoryInfo = (performance as any).memory;
    return Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024) * 100) / 100;
  }
  return 0;
}

/**
 * Starts monitoring memory usage
 */
export function startMemoryMonitor(config: MemoryMonitorConfig = {}): void {
  // Merge with default config
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Stop any existing monitor
  stopMemoryMonitor();
  
  // Log initial memory usage
  const memoryUsage = getCurrentMemoryUsage();
  if (mergedConfig.enableLogging) {
    console.log(`Memory monitoring started`);
    console.log(`Memory usage: ${memoryUsage} MB`);
  }
  
  // Check if we should clean up immediately
  if (memoryUsage > (mergedConfig.threshold || MEMORY_THRESHOLD_MB)) {
    if (mergedConfig.enableLogging) {
      console.log(`Attempting memory cleanup...`);
    }
    
    if (mergedConfig.onExceedThreshold) {
      mergedConfig.onExceedThreshold();
    }
    
    if (mergedConfig.cleanup) {
      mergedConfig.cleanup();
    }
  }
  
  // Set up visibility change handler
  document.addEventListener('visibilitychange', handleVisibilityChange);
  if (mergedConfig.enableLogging) {
    console.log(`Visibility-based cleanup handler registered`);
  }
  
  // Start interval checks
  if (mergedConfig.checkInterval && mergedConfig.checkInterval > 0) {
    memoryMonitorInterval = window.setInterval(() => {
      const currentUsage = getCurrentMemoryUsage();
      
      if (mergedConfig.enableLogging) {
        console.log(`Memory usage: ${currentUsage} MB`);
      }
      
      if (currentUsage > (mergedConfig.threshold || MEMORY_THRESHOLD_MB)) {
        if (mergedConfig.enableLogging) {
          console.warn(`⚠️ Critical memory usage: ${currentUsage} MB`);
          console.log(`Attempting memory cleanup...`);
        }
        
        if (mergedConfig.onExceedThreshold) {
          mergedConfig.onExceedThreshold();
        }
        
        if (mergedConfig.cleanup) {
          mergedConfig.cleanup();
        }
      }
    }, mergedConfig.checkInterval);
  }
}

/**
 * Stops memory monitoring
 */
export function stopMemoryMonitor(): void {
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
    memoryMonitorInterval = null;
  }
  
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Handles visibility change events to clean up when tab is hidden
 */
function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    // User navigated away, clean up resources
    console.log('Tab hidden, cleaning up resources');
    disposeWebLLMResources();
    disposeTensorflowResources();
  }
}

/**
 * Cleans up WebLLM engine resources
 */
export function disposeWebLLMResources(): void {
  try {
    // Clear WebLLM cache
    (window as any).webLLMCache = null;
    
    // Force garbage collection if possible
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    console.log('WebLLM cache cleared');
  } catch (e) {
    console.error('Error cleaning up WebLLM resources:', e);
  }
}

/**
 * Cleans up TensorFlow.js resources
 */
export function disposeTensorflowResources(): void {
  try {
    // Clean up TensorFlow.js backend
    if ((window as any).tf && (window as any).tf.disposeVariables) {
      (window as any).tf.disposeVariables();
      console.log('TensorFlow.js resources cleaned up');
    }
  } catch (e) {
    console.error('Error cleaning up TensorFlow.js resources:', e);
  }
}

/**
 * Registers a full cleanup handler for before unload
 */
export function registerBeforeUnloadCleanup(): void {
  window.addEventListener('beforeunload', () => {
    disposeWebLLMResources();
    disposeTensorflowResources();
    stopMemoryMonitor();
  });
}

/**
 * Full resource cleanup
 */
export function cleanupAllResources(): void {
  disposeWebLLMResources();
  disposeTensorflowResources();
}

/**
 * Check for event listener leaks (for debugging)
 */
export function checkEventListenerCount(): void {
  const listeners = window.__eventListenerCountBySite || 0;
  if (listeners > 100) {
    console.warn(`Possible event listener leak, total listeners:`, listeners);
  }
}

// Automatically register the beforeunload handler
registerBeforeUnloadCleanup();

// Add detection of eventListeners for debugging
Object.defineProperty(window, '__eventListenerCountBySite', {
  get: function() {
    let count = 0;
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if ((element as any).__eventListeners) {
        count += Object.keys((element as any).__eventListeners).length;
      }
    }
    return count;
  }
});