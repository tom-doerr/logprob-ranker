/**
 * Model Cleanup Utility
 * 
 * This utility provides functions to help clean up memory used by AI models
 * running in the browser, particularly WebLLM and TensorFlow.js models.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Unloads resources used by WebLLM
 */
export function unloadWebLLMResources() {
  try {
    // Clear WebLLM-related caches from IndexedDB if possible
    const indexedDBRequest = window.indexedDB.open('WebLLM');
    
    indexedDBRequest.onsuccess = function() {
      try {
        const db = indexedDBRequest.result;
        // Try to clear model caches and other data
        if (db.objectStoreNames.contains('models')) {
          const transaction = db.transaction(['models'], 'readwrite');
          const modelStore = transaction.objectStore('models');
          modelStore.clear();
        }
        
        // Close the database connection
        db.close();
        console.log('WebLLM cache cleared');
      } catch (err) {
        console.error('Error clearing WebLLM cache:', err);
      }
    };
    
    // Also try to clear any service workers
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      });
    }
    
    // Force a garbage collection if possible
    if (window.gc) {
      window.gc();
    }
    
    return true;
  } catch (e) {
    console.error('Error unloading WebLLM resources:', e);
    return false;
  }
}

/**
 * Unloads TensorFlow.js resources
 */
export function unloadTensorFlowResources() {
  try {
    // Dispose all variables and tensors
    tf.disposeVariables();
    
    // Get all tensors and dispose them
    const tensors = tf.memory().numTensors;
    if (tensors > 0) {
      console.log(`Cleaning up ${tensors} tensors...`);
      tf.dispose();
    }
    
    // Reset the backend if needed
    const backend = tf.getBackend();
    if (backend) {
      // Access internal methods to perform deep cleanup
      // @ts-ignore: Accessing internal property
      if (tf.engine && tf.engine().backend) {
        // @ts-ignore: Accessing internal property
        if (typeof tf.engine().backend.dispose === 'function') {
          // @ts-ignore: Accessing internal property
          tf.engine().backend.dispose();
        }
      }
      
      // Attempt to reset WebGL contexts in case of WebGL backend
      if (backend === 'webgl') {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          // @ts-ignore: Accessing WebGL context property
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
      }
    }
    
    // Force a garbage collection if possible
    if (window.gc) {
      window.gc();
    }
    
    console.log('TensorFlow.js resources cleaned up');
    return true;
  } catch (e) {
    console.error('Error unloading TensorFlow.js resources:', e);
    return false;
  }
}

/**
 * Clean up all AI model resources
 */
export function cleanupAllModelResources() {
  unloadWebLLMResources();
  unloadTensorFlowResources();
  
  // Clear any additional caches
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        if (cacheName.includes('model') || cacheName.includes('llm') || cacheName.includes('tensor')) {
          caches.delete(cacheName);
        }
      });
    });
  }
  
  // Hint to browser that now would be a good time for GC
  setTimeout(() => {
    if (window.gc) window.gc();
  }, 1000);
  
  return true;
}

/**
 * Register cleanup handler to run on page visibility change
 * This helps clean up resources when the user switches tabs
 */
export function registerVisibilityCleanupHandler() {
  let lastCleanupTime = 0;
  const CLEANUP_INTERVAL = 30000; // 30 seconds
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const now = Date.now();
      if (now - lastCleanupTime > CLEANUP_INTERVAL) {
        lastCleanupTime = now;
        cleanupAllModelResources();
      }
    }
  });
  
  console.log('Visibility-based cleanup handler registered');
  return true;
}

/**
 * Helper to check current memory usage
 */
export function getMemoryUsage(): { available: boolean; usage: number } {
  if (
    window.performance &&
    (performance as any).memory &&
    (performance as any).memory.usedJSHeapSize
  ) {
    const memoryInfo = (performance as any).memory;
    const usedHeapSize = memoryInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
    return {
      available: true,
      usage: parseFloat(usedHeapSize.toFixed(2)),
    };
  }
  
  return {
    available: false,
    usage: 0,
  };
}