import React, { ReactNode } from 'react';

interface NervAnimationProps {
  children: ReactNode;
  className?: string;
}

export const NervScanline: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-scanline ${className}`}>{children}</div>
);

export const NervBlink: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <span className={`nerv-blink ${className}`}>{children}</span>
);

export const NervPulse: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <span className={`nerv-pulse ${className}`}>{children}</span>
);

export const NervProgress: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-progress ${className}`}>{children}</div>
);

export const NervData: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-data ${className}`}>{children}</div>
);

export const NervEnergy: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-energy ${className}`}>{children}</div>
);

export const NervType: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <span className={`nerv-type ${className}`}>{children}</span>
);

export const NervGlitch: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <span className={`nerv-glitch ${className}`}>{children}</span>
);

export const NervScan: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-scan ${className}`}>{children}</div>
);

export const NervTerminal: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`bg-black/5 border border-[var(--eva-orange)]/50 rounded-md text-xs font-mono whitespace-pre-wrap text-[var(--eva-green)] nerv-scan ${className}`}>
    <span className="nerv-blink">MAGI:</span> <span className="nerv-type">{children}</span>
  </div>
);

export const MagiCard: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`border border-[var(--eva-orange)] rounded-md p-4 relative nerv-scanline ${className}`}>
    {children}
  </div>
);

export const AttributeScore: React.FC<{name: string; score: number; className?: string}> = ({ 
  name, 
  score, 
  className = '' 
}) => (
  <div className={`flex items-center justify-between p-2 bg-black/5 rounded-md border border-[var(--eva-orange)]/30 nerv-progress ${className}`}>
    <span className="text-xs font-medium text-[var(--eva-text)]">{name}:</span>
    <span className="text-xs bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-2 py-0.5 rounded-full nerv-energy">
      {score.toFixed(4)}
    </span>
  </div>
);