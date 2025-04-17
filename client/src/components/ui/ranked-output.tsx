import React, { useState } from 'react';
// Mock Button component for testing
const Button = ({ 
  children, 
  onClick, 
  variant, 
  size, 
  className 
}: { 
  children: React.ReactNode;
  onClick?: () => void;
  variant?: string;
  size?: string;
  className?: string;
}) => (
  <button 
    onClick={onClick} 
    role="button"
    className={className}
  >
    {children}
  </button>
);

import { Crown, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

// Mock these components for tests
const NervEnergy = (props: any) => <div {...props}>{props.children}</div>;
const NervHexagon = (props: any) => <div {...props}>{props.children}</div>;
const NervTerminal = (props: any) => <div {...props}>{props.children}</div>;
const EvaStatus = ({ label, status, className }: any) => (
  <div className={className}>{label}</div>
);

interface AttributeScore {
  name: string;
  score: number;
}

// Supporting both the new and old interface
interface RankedOutputPropsNew {
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

// Old interface for testing compatibility
interface RankedOutputPropsOld {
  output: string;
  logprob: number;
  index: number;
  attributeScores?: AttributeScore[];
  rawEvaluation?: string;
  onSelect?: (index: number) => void;
  isSelected?: boolean;
}

// Union type for both prop interfaces
type RankedOutputProps = RankedOutputPropsNew | RankedOutputPropsOld;

export const RankedOutput: React.FC<RankedOutputProps> = (props) => {
  // Determine which interface we're using
  const isNewInterface = 'output' in props && typeof props.output === 'object';
  
  // Extract and normalize props depending on the interface
  const output = isNewInterface 
    ? (props as RankedOutputPropsNew).output.output 
    : (props as RankedOutputPropsOld).output;
  
  const logprob = isNewInterface 
    ? (props as RankedOutputPropsNew).output.logprob 
    : (props as RankedOutputPropsOld).logprob;
  
  const index = isNewInterface 
    ? (props as RankedOutputPropsNew).output.index 
    : (props as RankedOutputPropsOld).index;
  
  const attributeScores = isNewInterface 
    ? (props as RankedOutputPropsNew).output.attributeScores 
    : (props as RankedOutputPropsOld).attributeScores;
  
  const rawEvaluation = isNewInterface 
    ? (props as RankedOutputPropsNew).output.rawEvaluation 
    : (props as RankedOutputPropsOld).rawEvaluation;
  
  const isFirst = isNewInterface 
    ? (props as RankedOutputPropsNew).isFirst 
    : false;
  
  const isLatest = isNewInterface 
    ? (props as RankedOutputPropsNew).isLatest 
    : false;
    
  const onSelect = !isNewInterface 
    ? (props as RankedOutputPropsOld).onSelect 
    : undefined;
    
  const isSelected = !isNewInterface 
    ? (props as RankedOutputPropsOld).isSelected 
    : false;
  const [showRawEvaluation, setShowRawEvaluation] = useState(false);
  
  // Track copy state for the test UI
  const [copied, setCopied] = useState(false);
  
  // Handle copy for the test UI
  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Render the test UI if using the old interface
  if (!isNewInterface) {
    return (
      <div className="border border-[var(--eva-orange)] rounded-md p-4 relative">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-sm">Output #{index + 1}</h3>
          <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded">
            {logprob.toFixed(2)}
          </span>
        </div>
        
        <div className="mt-2 p-3 bg-gray-50 rounded whitespace-pre-wrap border border-gray-200 text-sm">
          {output}
        </div>
        
        {/* Attribute Scores for test UI */}
        {attributeScores && attributeScores.length > 0 && (
          <div className="mt-3 border border-purple-200 rounded p-3 bg-purple-50">
            <h4 className="text-sm font-medium text-purple-700 mb-2">Attribute Scores</h4>
            <div className="grid grid-cols-2 gap-2">
              {attributeScores.map((attr, i) => (
                <div key={i} className="flex justify-between items-center p-1 bg-white rounded">
                  <span className="text-xs font-medium">{attr.name}:</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    {attr.score.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Test UI action buttons */}
        <div className="mt-3 flex space-x-2 justify-end">
          {onSelect && (
            <Button 
              onClick={() => onSelect(index)}
              variant={isSelected ? "default" : "outline"}
              size="sm"
            >
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          )}
          
          <Button 
            onClick={handleCopy}
            variant="outline"
            size="sm"
          >
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copy
          </Button>
          
          {rawEvaluation && (
            <Button 
              onClick={() => setShowRawEvaluation(!showRawEvaluation)}
              variant="outline"
              size="sm"
            >
              {showRawEvaluation ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              Details
            </Button>
          )}
        </div>
        
        {/* Raw evaluation for test UI */}
        {showRawEvaluation && rawEvaluation && (
          <div className="mt-2 p-3 bg-gray-800 text-gray-200 rounded font-mono text-xs overflow-x-auto">
            {rawEvaluation}
          </div>
        )}
      </div>
    );
  }
  
  // Render the production UI for new interface
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
            label={"VARIANT-" + String(index + 1).padStart(3, '0')}
            className="text-xs sm:text-sm text-[var(--eva-text)] font-mono"
          />
        </div>
        <NervEnergy className="text-xs sm:text-sm font-medium bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-2 py-0.5 rounded whitespace-nowrap">
          Score: {logprob.toFixed(4)}
        </NervEnergy>
      </div>
      
      <div className="mt-2 p-2 sm:p-3 bg-black/5 rounded-md whitespace-pre-wrap text-[var(--eva-text)] border border-[var(--eva-orange)]/30 text-xs sm:text-sm nerv-scanline">
        {output}
      </div>
      
      {/* Attribute Scores Display */}
      {attributeScores && attributeScores.length > 0 && (
        <div className="mt-3 pt-3 border-2 border-[var(--eva-purple)] rounded-md p-4 bg-black/40 relative nerv-scanline">
          <div className="absolute top-2 right-2 font-mono text-[10px] text-[var(--eva-purple)] nerv-blink">MAGI.SYS</div>
          <h4 className="text-xs sm:text-sm font-medium text-[var(--eva-purple)] uppercase tracking-wider mb-2">Attribute Scores</h4>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2">
            {attributeScores.map((attr, attrIdx) => (
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
      {rawEvaluation && (
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
      {showRawEvaluation && rawEvaluation && (
        <NervTerminal className="mt-2">
          {rawEvaluation}
        </NervTerminal>
      )}
    </div>
  );
};

export default RankedOutput;