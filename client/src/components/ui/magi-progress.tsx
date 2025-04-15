import React from 'react';

interface MagiProgressProps {
  isGenerating: boolean;
  useAutoStop: boolean;
  autoStopThreshold: number;
  rankedOutputs: any[];
  numberOfVariants: number;
  threadCount: number;
}

export const MagiProgress: React.FC<MagiProgressProps> = ({
  isGenerating,
  useAutoStop,
  autoStopThreshold,
  rankedOutputs,
  numberOfVariants,
  threadCount,
}) => {
  if (!isGenerating) return null;
  
  return (
    <div className="mt-4 mb-2 border border-[var(--eva-orange)] rounded-md p-3 bg-black/30 nerv-scanline">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[var(--eva-orange)] animate-pulse mr-2 nerv-pulse"></div>
          <span className="text-sm font-mono text-[var(--eva-orange)] uppercase tracking-wider nerv-blink">ANGEL ANALYSIS</span>
        </div>
        <span className="text-sm font-mono text-[var(--eva-green)] nerv-type">
          {useAutoStop 
            ? `AUTO-CEASE: ${autoStopThreshold}`
            : `PROGRESS: ${rankedOutputs.length}/${numberOfVariants}`
          }
        </span>
      </div>
      
      <div className="w-full bg-black/40 rounded-full h-2.5 mb-2 border border-[var(--eva-orange)]/30 overflow-hidden">
        <div 
          className="bg-[var(--eva-orange)] h-2 rounded-full transition-all magi-progress" 
          style={{
            width: `${useAutoStop ? Math.min(100, (rankedOutputs.length / (rankedOutputs.length + 5)) * 100) : Math.min(100, (rankedOutputs.length / numberOfVariants) * 100)}%`
          }}>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono">
        <div className="flex items-center border border-[var(--eva-orange)]/20 bg-black/20 p-1 rounded nerv-scan">
          <div className="w-2 h-2 bg-[var(--eva-green)] rounded-full mr-1 nerv-pulse"></div>
          <span className="text-[var(--eva-green)] nerv-blink">MAGI-1: MELCHIOR</span>
        </div>
        <div className="flex items-center border border-[var(--eva-orange)]/20 bg-black/20 p-1 rounded nerv-scan">
          <div className="w-2 h-2 bg-[var(--eva-orange)] rounded-full mr-1 nerv-pulse"></div>
          <span className="text-[var(--eva-orange)] nerv-blink animation-delay-500">MAGI-2: BALTHASAR</span>
        </div>
        <div className="flex items-center border border-[var(--eva-orange)]/20 bg-black/20 p-1 rounded nerv-scan">
          <div className="w-2 h-2 bg-[var(--eva-blue)] rounded-full mr-1 nerv-pulse"></div>
          <span className="text-[var(--eva-blue)] nerv-blink">MAGI-3: CASPER</span>
        </div>
      </div>
      
      <div className="flex justify-between text-xs font-mono mt-2">
        <span className="text-[var(--eva-text)] nerv-glitch">A.T. FIELD ANALYSIS ACTIVE</span>
        <span className="text-[var(--eva-blue)] nerv-type">THREADS: {threadCount}</span>
      </div>
    </div>
  );
};

export default MagiProgress;