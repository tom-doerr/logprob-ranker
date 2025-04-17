import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { 
  NervProgress, 
  NervEnergy, 
  NervData, 
  NervHexagon, 
  NervPattern, 
  NervGrid, 
  MagiSystem,
  NervTerminal,
  EvaStatus
} from '@/components/ui/nerv-animations';

interface AttributeScore {
  name: string;
  score: number;
}

interface RankedOutputProps {
  output: {
    index: number;
    output: string;
    logprob: number;
    attributeScores?: AttributeScore[];
    rawEvaluation?: string;
  };
  isFirst: boolean;
  isLatest: boolean;
}

export const RankedOutput: React.FC<RankedOutputProps> = ({
  output,
  isFirst,
  isLatest,
}) => {
  const [showRawEvaluation, setShowRawEvaluation] = useState(false);
  
  return (
    <div 
      className={`border ${isLatest 
        ? 'border-[var(--eva-blue)] bg-[var(--eva-blue)]/5' 
        : 'border-[var(--eva-orange)]'} rounded-md p-3 sm:p-4 relative nerv-scanline`}
    >
      {isLatest && (
        <div className="absolute top-0 right-0 border-t-2 border-r-2 border-[var(--eva-blue)] w-4 sm:w-6 h-4 sm:h-6 nerv-blink"></div>
      )}
      
      <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
        <div className="flex flex-wrap items-center gap-1 sm:gap-0">
          {isFirst && (
            <NervHexagon className="inline-flex items-center bg-[var(--eva-orange)] text-white text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-0.5 rounded mr-1 sm:mr-2">
              <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 nerv-pulse" />
              PRIME SUBJECT
            </NervHexagon>
          )}
          {isLatest && (
            <span className="inline-flex items-center bg-[var(--eva-blue)] text-white text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-0.5 rounded mr-1 sm:mr-2">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white rounded-full animate-pulse mr-0.5 sm:mr-1"></span>
              LATEST
            </span>
          )}
          <EvaStatus
            status="active"
            label={"VARIANT-" + String(output.index + 1).padStart(3, '0')}
            className="text-xs sm:text-sm text-[var(--eva-text)] font-mono"
          />
        </div>
        <NervEnergy className="text-xs sm:text-sm font-medium bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-2 py-0.5 rounded whitespace-nowrap">
          Score: {output.logprob.toFixed(4)}
        </NervEnergy>
      </div>
      
      <div className="mt-2 p-2 sm:p-3 bg-black/5 rounded-md whitespace-pre-wrap text-[var(--eva-text)] border border-[var(--eva-orange)]/30 text-xs sm:text-sm nerv-scanline">
        {output.output}
      </div>
      
      {/* Attribute Scores Display */}
      {output.attributeScores && output.attributeScores.length > 0 && (
        <div className="mt-3 pt-3 border-2 border-[var(--eva-purple)] rounded-md p-4 bg-black/40 relative nerv-scanline">
          <div className="absolute top-2 right-2 font-mono text-[10px] text-[var(--eva-purple)] nerv-blink">MAGI.SYS</div>
          <h4 className="text-xs sm:text-sm font-medium text-[var(--eva-purple)] uppercase tracking-wider mb-2">Attribute Scores</h4>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2">
            {output.attributeScores.map((attr, attrIdx) => (
              <div
                key={attrIdx} 
                className="flex items-center justify-between p-1.5 sm:p-2 bg-black/10 rounded-md border border-[var(--eva-purple)]/30 nerv-progress"
                style={{ "--progress-width": `${attr.score * 100}%` } as React.CSSProperties}
              >
                <span className="text-[10px] sm:text-xs font-medium text-[var(--eva-text)]">{attr.name}:</span>
                <span className="text-[10px] sm:text-xs bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-1.5 sm:px-2 py-0.5 rounded-full">
                  {attr.score.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* View Raw Evaluation Button */}
      {output.rawEvaluation && (
        <div className="mt-2 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowRawEvaluation(!showRawEvaluation)}
            className="text-[10px] sm:text-xs text-[var(--eva-orange)] hover:text-[var(--eva-orange)]/80 h-7 sm:h-8 px-2 sm:px-3 nerv-pulse"
          >
            {showRawEvaluation ? 'CLOSE TERMINAL' : 'VIEW MAGI ANALYSIS'}
          </Button>
        </div>
      )}
      
      {/* Raw Evaluation */}
      {showRawEvaluation && output.rawEvaluation && (
        <NervTerminal className="mt-2">
          {output.rawEvaluation}
        </NervTerminal>
      )}
    </div>
  );
};

export default RankedOutput;