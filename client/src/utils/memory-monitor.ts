/**
 * Memory Monitor Utility
 * 
 * This utility helps detect and prevent memory leaks in the application
 * by monitoring memory usage and identifying potential issues.
 */

// Configuration options
const OPTIONS = {
  // Whether to log memory usage to console
  enableLogging: false,
  
  // Memory threshold in MB to trigger warnings
  warningThreshold: 150,
  
  // Critical threshold in MB
  criticalThreshold: 200,
  
  // Monitoring interval in milliseconds
  checkInterval: 30000, // 30 seconds
  
  // Number of samples to keep for trend analysis
  samples: 5,
};

// State
let memoryMonitorInterval: number | null = null;
let memorySamples: number[] = [];
let previousGrowth = 0;
let growthWarningsCount = 0;
let lastGC = 0;

/**
 * Gets current memory usage if available
 */
export function getCurrentMemoryUsage(): { available: boolean; usage: number } {
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

/**
 * Detects consistent memory growth (potential leak)
 */
function detectMemoryLeak(): boolean {
  if (memorySamples.length < OPTIONS.samples) {
    return false;
  }
  
  // Calculate average growth over last N samples
  let totalGrowth = 0;
  for (let i = 1; i < memorySamples.length; i++) {
    totalGrowth += memorySamples[i] - memorySamples[i - 1];
  }
  
  const avgGrowth = totalGrowth / (memorySamples.length - 1);
  
  // If we have consistent positive growth across samples, it's suspicious
  if (avgGrowth > 1.0 && previousGrowth > 0 && avgGrowth >= previousGrowth) {
    growthWarningsCount++;
    previousGrowth = avgGrowth;
    return growthWarningsCount >= 3; // Three consecutive warnings
  } else {
    previousGrowth = avgGrowth > 0 ? avgGrowth : 0;
    growthWarningsCount = 0;
    return false;
  }
}

/**
 * Takes action on potential memory leak
 */
function handlePotentialLeak() {
  console.warn('⚠️ Potential memory leak detected! Memory usage keeps growing.');
  
  // Find potential sources of memory leaks
  checkForEventListenerLeaks();
  checkForIntervalLeaks();
  
  // Attempt to free memory
  attemptMemoryCleanup();
}

/**
 * Checks for event listener leaks
 */
function checkForEventListenerLeaks() {
  // This is an estimate since we can't directly access all listeners
  let windowKeys = Object.keys(window);
  let listenerKeys = windowKeys.filter(key => 
    key.startsWith('on') && (window as any)[key] !== null
  );
  
  if (listenerKeys.length > 20) { // Arbitrary threshold
    console.warn('Large number of event listeners detected:', listenerKeys.length);
  }
}

/**
 * Checks for interval leaks
 */
function checkForIntervalLeaks() {
  // This is a best-effort heuristic since we can't enumerate all intervals
  // We'll create a dummy interval and compare its numeric value
  
  // Store current count of intervals
  const initialCount = window.setInterval(() => {}, 10000);
  window.clearInterval(initialCount);
  
  // Create another interval to see the difference
  const nextCount = window.setInterval(() => {}, 10000);
  window.clearInterval(nextCount);
  
  // Calculate difference (this will work regardless of the actual type)
  const diff = Number(nextCount) - Number(initialCount);
  
  // If the difference is 1, that's normal. If larger, might indicate leaked intervals
  if (diff > 1) {
    console.warn('Possible interval/timeout leak detected');
  }
  
  // Check if the raw count is very high (arbitrary threshold)
  if (Number(nextCount) > 100) {
    console.warn('Large number of intervals/timeouts detected:', Number(nextCount));
  }
}

/**
 * Attempts to clean up memory
 */
function attemptMemoryCleanup() {
  const now = Date.now();
  
  // Don't trigger GC hint too frequently
  if (now - lastGC < 60000) {
    return;
  }
  
  lastGC = now;
  
  console.log('Attempting memory cleanup...');
  
  // Clear old memo caches
  memorySamples = [];
  growthWarningsCount = 0;
  
  // Hint to garbage collector (if browser supports it)
  if (window.gc) {
    try {
      window.gc();
      console.log('Garbage collection requested');
    } catch (e) {
      console.log('Unable to force garbage collection');
    }
  }
}

/**
 * Checks memory usage and responds to issues
 */
function checkMemoryUsage() {
  const { available, usage } = getCurrentMemoryUsage();
  
  if (!available) {
    return;
  }
  
  // Add to samples
  memorySamples.push(usage);
  if (memorySamples.length > OPTIONS.samples) {
    memorySamples.shift();
  }
  
  // Log memory usage if enabled
  if (OPTIONS.enableLogging) {
    console.log(`Memory usage: ${usage} MB`);
  }
  
  // Check thresholds
  if (usage > OPTIONS.criticalThreshold) {
    console.warn(`⚠️ Critical memory usage: ${usage} MB`);
    attemptMemoryCleanup();
  } else if (usage > OPTIONS.warningThreshold) {
    console.warn(`⚠️ High memory usage: ${usage} MB`);
  }
  
  // Check for memory leaks
  if (detectMemoryLeak()) {
    handlePotentialLeak();
  }
}

/**
 * Starts memory monitoring
 */
export function startMemoryMonitoring(options = {}) {
  // Update options
  Object.assign(OPTIONS, options);
  
  // Stop any existing monitoring
  stopMemoryMonitoring();
  
  console.log('Memory monitoring started');
  
  // Start monitoring
  memoryMonitorInterval = window.setInterval(checkMemoryUsage, OPTIONS.checkInterval);
  
  // Take initial reading
  checkMemoryUsage();
  
  // Return control functions
  return {
    takeSnapshot: checkMemoryUsage,
    cleanup: attemptMemoryCleanup,
  };
}

/**
 * Stops memory monitoring
 */
export function stopMemoryMonitoring() {
  if (memoryMonitorInterval !== null) {
    window.clearInterval(memoryMonitorInterval);
    memoryMonitorInterval = null;
    console.log('Memory monitoring stopped');
  }
}

/**
 * Checks for WebSocket leaks
 */
export function checkForWebSocketLeaks() {
  // Count open WebSockets by adding a temporary WebSocket
  // and checking its instance ID
  try {
    const tempWs = new WebSocket('wss://echo.websocket.org');
    const closeWs = () => tempWs.close();
    setTimeout(closeWs, 500);
    
    // Extract numeric ID from object string
    const wsString = tempWs.toString();
    const match = wsString.match(/\[object WebSocket(\d+)\]/);
    
    if (match && match[1]) {
      const wsId = parseInt(match[1], 10);
      if (wsId > 5) { // Arbitrary threshold
        console.warn('Potential WebSocket leak detected:', wsId, 'instances');
        return true;
      }
    }
  } catch (e) {
    // Unable to detect
  }
  
  return false;
}

/**
 * Fixes common React memory leaks
 */
export function fixCommonReactLeaks() {
  // 1. Check for event listener cleanup
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  
  // Keep track of listeners for debugging
  const listeners: Record<string, number> = {};
  
  // Override addEventListener to track listeners
  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    listeners[type] = (listeners[type] || 0) + 1;
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // Override removeEventListener to track removals
  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    listeners[type] = (listeners[type] || 1) - 1;
    return originalRemoveEventListener.call(this, type, listener, options);
  };
  
  // Periodically check for abandoned listeners
  setInterval(() => {
    let total = 0;
    for (const type in listeners) {
      total += listeners[type];
    }
    
    if (total > 100) { // Arbitrary threshold
      console.warn('Possible event listener leak, total listeners:', total);
    }
  }, 60000);
}

/**
 * Example usage:
 * 
 * // In your main.tsx or similar entry point:
 * import { startMemoryMonitoring, fixCommonReactLeaks } from './utils/memory-monitor';
 * 
 * // Start monitoring with custom options
 * if (process.env.NODE_ENV === 'development') {
 *   startMemoryMonitoring({
 *     enableLogging: true,
 *     checkInterval: 15000
 *   });
 *   
 *   fixCommonReactLeaks();
 * }
 */