import React, { ReactNode } from 'react';
import { Power } from 'lucide-react';
import NervGlobe from './nerv-globe';

interface NervContainerProps {
  children: ReactNode;
  className?: string;
  withGlobes?: boolean;
}

export const NervContainer: React.FC<NervContainerProps> = ({ 
  children, 
  className = '', 
  withGlobes = true 
}) => {
  return (
    <div className={`container mx-auto p-4 relative ${className}`}>
      {/* Eva Interface Decorations */}
      <div className="absolute top-0 left-0 w-full h-4 bg-[var(--eva-orange)] opacity-30 z-10"></div>
      <div className="absolute top-4 left-0 w-full opacity-75 text-center text-[var(--eva-orange)] font-mono text-sm tracking-widest z-10">
        NERV CENTRAL DOGMA - EVA COORDINATION SYSTEM
      </div>
      <div className="absolute top-0 right-0 p-2 text-[var(--eva-orange)] font-mono text-xs z-10 flex items-center">
        <Power className="h-4 w-4 mr-1 animate-pulse" />
        MAGI SYSTEM ACTIVE
      </div>
      
      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
      
      {/* NERV Logo Watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[var(--eva-orange)] opacity-5 text-9xl font-bold z-0">
        NERV
      </div>
      
      {/* Spinning NERV Globes - conditionally rendered */}
      {withGlobes && (
        <>
          <NervGlobe 
            size="xl" 
            variant="orange" 
            opacity={0.07} 
            className="absolute bottom-[-10rem] right-[-10rem] z-0" 
          />
          <NervGlobe 
            size="lg" 
            variant="blue" 
            opacity={0.05} 
            className="absolute top-[-5rem] left-[-5rem] z-0" 
          />
        </>
      )}
      
      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default NervContainer;