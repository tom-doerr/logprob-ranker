import { useState, useEffect } from 'react';

/**
 * Component to display current memory usage in the app
 * Used to help debug random reloads and memory issues
 */
export function MemoryUsage() {
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);
  const [isHighMemory, setIsHighMemory] = useState(false);

  useEffect(() => {
    // Function to update memory usage
    const updateMemoryUsage = () => {
      if ('performance' in window && 'memory' in (performance as any)) {
        const memory = (performance as any).memory;
        // Convert from bytes to MB 
        const usedJSHeapSize = Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100;
        const totalJSHeapSize = Math.round((memory.totalJSHeapSize / 1024 / 1024) * 100) / 100;
        
        setMemoryUsage(usedJSHeapSize);
        setIsHighMemory(usedJSHeapSize > 150); // Warning if > 150MB
      }
    };

    // Update immediately and then every 2 seconds
    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 2000);

    return () => clearInterval(interval);
  }, []);

  if (memoryUsage === null) return null;

  return (
    <div className="fixed bottom-2 right-2 z-50 px-2 py-1 text-xs font-mono rounded bg-black/60 border border-[var(--eva-orange)]/50">
      <div className={`flex items-center gap-1 ${isHighMemory ? 'text-red-400' : 'text-[var(--eva-green)]'}`}>
        <div className={`w-2 h-2 rounded-full ${isHighMemory ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
        <span>
          {memoryUsage} MB
        </span>
      </div>
    </div>
  );
}