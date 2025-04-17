/**
 * Memory manager utility
 * Provides memory monitoring and cleanup functions
 */

// Memory monitoring interval in milliseconds
const MEMORY_MONITOR_INTERVAL = 30000; // 30 seconds

// Memory monitoring threshold in MB
const MEMORY_WARNING_THRESHOLD = 50; // MB

// Memory monitoring state
let memoryMonitoringInterval: number | null = null;
let memoryUsageHistory: number[] = [];

/**
 * Start memory monitoring
 * Periodically checks memory usage and logs warnings if memory usage is high
 */
export function startMemoryMonitoring(): void {
  // Don't start monitoring if already running
  if (memoryMonitoringInterval !== null) {
    return;
  }
  
  console.log('[MemoryManager] Starting memory monitoring');
  
  // Start monitoring interval
  memoryMonitoringInterval = window.setInterval(() => {
    checkMemoryUsage();
  }, MEMORY_MONITOR_INTERVAL);
  
  // Initial check
  checkMemoryUsage();
}

/**
 * Stop memory monitoring
 */
export function stopMemoryMonitoring(): void {
  if (memoryMonitoringInterval === null) {
    return;
  }
  
  console.log('[MemoryManager] Stopping memory monitoring');
  
  // Clear interval
  window.clearInterval(memoryMonitoringInterval);
  memoryMonitoringInterval = null;
  
  // Clear history
  memoryUsageHistory = [];
}

/**
 * Check current memory usage
 */
function checkMemoryUsage(): void {
  // Use performance API to get memory usage if available
  if ('memory' in performance) {
    // Cast to any to access memory property
    const memory = (performance as any).memory;
    
    if (memory && memory.usedJSHeapSize) {
      const usedMemoryMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
      
      // Add to history (keep last 10 readings)
      memoryUsageHistory.push(usedMemoryMB);
      if (memoryUsageHistory.length > 10) {
        memoryUsageHistory.shift();
      }
      
      // Calculate trends
      const memoryTrend = calculateMemoryTrend();
      
      // Log memory usage if above threshold or increasing rapidly
      if (usedMemoryMB > MEMORY_WARNING_THRESHOLD || memoryTrend > 5) {
        console.warn(`[MemoryManager] Memory usage: ${usedMemoryMB}MB, trend: ${memoryTrend > 0 ? '+' : ''}${memoryTrend.toFixed(1)}MB/min`);
        
        // If memory usage is very high or trend is strongly increasing, suggest cleanup
        if (usedMemoryMB > MEMORY_WARNING_THRESHOLD * 2 || memoryTrend > 10) {
          console.warn('[MemoryManager] High memory usage detected, consider cleanup');
          
          // Perform automatic cleanup if memory usage is extreme
          if (usedMemoryMB > MEMORY_WARNING_THRESHOLD * 4) {
            forceCleanup();
          }
        }
      }
    }
  }
}

/**
 * Calculate memory usage trend in MB per minute
 */
function calculateMemoryTrend(): number {
  if (memoryUsageHistory.length < 2) {
    return 0;
  }
  
  // Calculate trend based on first and last reading
  const firstReading = memoryUsageHistory[0];
  const lastReading = memoryUsageHistory[memoryUsageHistory.length - 1];
  const readingCount = memoryUsageHistory.length;
  
  // Calculate trend in MB per minute
  // Each reading is MEMORY_MONITOR_INTERVAL ms apart
  const minutesElapsed = (readingCount - 1) * (MEMORY_MONITOR_INTERVAL / 1000 / 60);
  const memoryDifference = lastReading - firstReading;
  
  return minutesElapsed > 0 ? (memoryDifference / minutesElapsed) : 0;
}

/**
 * Force memory cleanup
 */
function forceCleanup(): void {
  console.warn('[MemoryManager] Forcing memory cleanup');
  
  // Clear caches if available
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
    });
  }
  
  // Release image resources
  cleanupDOMResources();
  
  // Suggest garbage collection
  if (typeof window.gc === 'function') {
    try {
      window.gc();
    } catch (e) {
      console.error('[MemoryManager] Error during forced GC:', e);
    }
  }
}

/**
 * Clean up DOM resources
 * Targets images and large data elements that are not in viewport
 */
function cleanupDOMResources(): void {
  // Find all images that are not in viewport and not recently loaded
  const images = document.querySelectorAll('img:not([data-memory-protected])');
  let clearedCount = 0;
  
  images.forEach((element) => {
    // Ensure the element is an HTMLImageElement
    if (element instanceof HTMLImageElement) {
      const img = element as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      
      // If image is not in viewport and loaded more than 1 minute ago
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        // Check if the image has a data-loaded-at attribute
        const loadedAt = parseInt(img.getAttribute('data-loaded-at') || '0', 10);
        const now = Date.now();
        
        // If the image was loaded more than 1 minute ago
        if (now - loadedAt > 60000) {
          // Save original src
          if (!img.hasAttribute('data-original-src')) {
            img.setAttribute('data-original-src', img.src);
          }
          
          // Clear src to release memory
          img.src = '';
          clearedCount++;
        }
      }
    }
  });
  
  if (clearedCount > 0) {
    console.log(`[MemoryManager] Released ${clearedCount} image resources`);
  }
}

// Export all utility functions
export default {
  startMemoryMonitoring,
  stopMemoryMonitoring,
};