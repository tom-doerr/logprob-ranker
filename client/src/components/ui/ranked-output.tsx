import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';

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
        : 'border-[var(--eva-orange)]'} rounded-md p-4 relative nerv-scanline`}
    >
      {isLatest && (
        <div className="absolute top-0 right-0 border-t-2 border-r-2 border-[var(--eva-blue)] w-6 h-6"></div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          {isFirst && (
            <span className="inline-flex items-center bg-[var(--eva-orange)] text-white text-xs font-medium px-2.5 py-0.5 rounded mr-2">
              <Crown className="h-3 w-3 mr-1" />
              PRIME SUBJECT
            </span>
          )}
          {isLatest && (
            <span className="inline-flex items-center bg-[var(--eva-blue)] text-white text-xs font-medium px-2.5 py-0.5 rounded mr-2">
              <span className="h-2 w-2 bg-white rounded-full animate-pulse mr-1"></span>
              LATEST
            </span>
          )}
          <span className="text-sm text-[var(--eva-text)] font-mono">
            {"VARIANT-" + String(output.index + 1).padStart(3, '0')}
          </span>
        </div>
        <span className="text-sm font-medium bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-2 py-0.5 rounded">
          Score: {output.logprob.toFixed(4)}
        </span>
      </div>
      <div className="mt-2 p-3 bg-black/5 rounded-md whitespace-pre-wrap text-[var(--eva-text)] border border-[var(--eva-orange)]/30">
        {output.output}
      </div>
      
      {/* Attribute Scores Display */}
      {output.attributeScores && output.attributeScores.length > 0 && (
        <div className="mt-3 border-t border-[var(--eva-orange)]/30 pt-3">
          <h4 className="text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-2">Attribute Scores</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {output.attributeScores.map((attr, attrIdx) => (
              <div 
                key={attrIdx} 
                className="flex items-center justify-between p-2 bg-black/5 rounded-md border border-[var(--eva-orange)]/30 nerv-pulse"
              >
                <span className="text-xs font-medium text-[var(--eva-text)]">{attr.name}:</span>
                <span className="text-xs bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-2 py-0.5 rounded-full">
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
            className="text-xs text-[var(--eva-orange)] hover:text-[var(--eva-orange)]/80"
          >
            {showRawEvaluation ? 'CLOSE TERMINAL' : 'VIEW MAGI ANALYSIS'}
          </Button>
        </div>
      )}
      
      {/* Raw Evaluation */}
      {showRawEvaluation && output.rawEvaluation && (
        <div className="mt-2 p-2 bg-black/5 border border-[var(--eva-orange)]/50 rounded-md text-xs font-mono whitespace-pre-wrap text-[var(--eva-green)] nerv-scan">
          <span className="nerv-blink">MAGI:</span> <span className="nerv-type">{output.rawEvaluation}</span>
        </div>
      )}
    </div>
  );
};

export default RankedOutput;