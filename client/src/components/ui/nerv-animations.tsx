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

export const NervHexagon: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-hexagon ${className}`}>{children}</div>
);

export const NervArm: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-arm ${className}`}>{children}</div>
);

export const NervGrid: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-grid ${className}`}>{children}</div>
);

export const NervPattern: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-pattern ${className}`}>{children}</div>
);

export const NervWarning: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`nerv-warning ${className}`}>{children}</div>
);

export const NervTerminal: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`bg-black/5 border border-[var(--eva-orange)]/50 rounded-md text-xs font-mono whitespace-pre-wrap text-[var(--eva-green)] nerv-scan ${className}`}>
    <span className="nerv-blink">MAGI:</span> <span className="nerv-type">{children}</span>
  </div>
);

export const MagiCard: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`border border-[var(--eva-orange)] rounded-md p-4 relative nerv-scanline ${className}`}>
    <div className="absolute top-0 right-0 w-4 h-4 bg-[var(--eva-orange)]/20 nerv-blink"></div>
    <div className="absolute bottom-0 left-0 w-4 h-4 bg-[var(--eva-blue)]/20 nerv-pulse"></div>
    {children}
  </div>
);

export const MagiSystem: React.FC<NervAnimationProps> = ({ children, className = '' }) => (
  <div className={`border-2 border-[var(--eva-purple)] rounded-md p-4 bg-black/40 relative nerv-pattern ${className}`}>
    <div className="absolute top-2 right-2 font-mono text-[10px] text-[var(--eva-purple)] nerv-blink">MAGI.SYS</div>
    <div className="nerv-grid p-2">{children}</div>
  </div>
);

export const AttributeScore: React.FC<{name: string; score: number; className?: string}> = ({ 
  name, 
  score, 
  className = '' 
}) => (
  <div 
    className={`flex items-center justify-between p-2 bg-black/5 rounded-md border border-[var(--eva-orange)]/30 nerv-progress ${className}`}
    style={{ "--progress-width": `${score * 100}%` } as React.CSSProperties}
  >
    <span className="text-xs font-medium text-[var(--eva-text)]">{name}:</span>
    <span className="text-xs bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-2 py-0.5 rounded-full">
      {score.toFixed(4)}
    </span>
  </div>
);

export const EvaStatus: React.FC<{status: 'active' | 'inactive' | 'warning' | 'error'; label: string; className?: string}> = ({ 
  status, 
  label,
  className = '' 
}) => {
  let statusColor = '';
  let animation = '';
  
  switch(status) {
    case 'active':
      statusColor = 'bg-[var(--eva-green)]';
      animation = 'nerv-pulse';
      break;
    case 'inactive':
      statusColor = 'bg-gray-500';
      animation = '';
      break;
    case 'warning':
      statusColor = 'bg-[var(--eva-orange)]';
      animation = 'nerv-blink';
      break;
    case 'error':
      statusColor = 'bg-[var(--eva-red)]';
      animation = 'nerv-warning';
      break;
  }
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${statusColor} ${animation}`}></div>
      <span className="text-xs font-mono">{label}</span>
    </div>
  );
};