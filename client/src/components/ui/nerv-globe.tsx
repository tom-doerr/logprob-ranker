import React from 'react';

interface NervGlobeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'orange' | 'blue' | 'green';
  opacity?: number;
}

export const NervGlobe: React.FC<NervGlobeProps> = ({
  className = '',
  size = 'md',
  variant = 'orange',
  opacity = 0.15
}) => {
  // Size mapping
  const sizeMap = {
    sm: 'w-32 h-32',
    md: 'w-64 h-64',
    lg: 'w-96 h-96',
    xl: 'w-[32rem] h-[32rem]'
  };

  // Color mapping
  const colorMap = {
    orange: 'var(--eva-orange)',
    blue: 'var(--eva-blue)',
    green: 'var(--eva-green)'
  };

  return (
    <div 
      className={`nerv-globe-container ${sizeMap[size]} absolute pointer-events-none ${className}`}
      style={{ opacity }}
    >
      <div 
        className="nerv-globe-outer absolute w-full h-full rounded-full border-2 nerv-globe-spin"
        style={{ borderColor: colorMap[variant] }}
      ></div>
      <div 
        className="nerv-globe-inner absolute w-3/4 h-3/4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border nerv-globe-spin-reverse"
        style={{ borderColor: colorMap[variant] }}
      ></div>
      <div 
        className="nerv-globe-meridian absolute w-full h-full left-0 top-0 nerv-globe-spin-slow"
      >
        <div 
          className="nerv-globe-line absolute left-1/2 top-0 w-[1px] h-full -translate-x-1/2"
          style={{ backgroundColor: colorMap[variant] }}
        ></div>
      </div>
      <div 
        className="nerv-globe-meridian absolute w-full h-full left-0 top-0 rotate-45 nerv-globe-spin-slow"
      >
        <div 
          className="nerv-globe-line absolute left-1/2 top-0 w-[1px] h-full -translate-x-1/2"
          style={{ backgroundColor: colorMap[variant] }}
        ></div>
      </div>
      <div 
        className="nerv-globe-meridian absolute w-full h-full left-0 top-0 rotate-90 nerv-globe-spin-slow"
      >
        <div 
          className="nerv-globe-line absolute left-1/2 top-0 w-[1px] h-full -translate-x-1/2"
          style={{ backgroundColor: colorMap[variant] }}
        ></div>
      </div>
      <div 
        className="nerv-globe-meridian absolute w-full h-full left-0 top-0 rotate-[135deg] nerv-globe-spin-slow"
      >
        <div 
          className="nerv-globe-line absolute left-1/2 top-0 w-[1px] h-full -translate-x-1/2"
          style={{ backgroundColor: colorMap[variant] }}
        ></div>
      </div>
      <div 
        className="nerv-globe-equator absolute top-1/2 left-0 w-full h-[1px] -translate-y-1/2"
        style={{ backgroundColor: colorMap[variant] }}
      ></div>
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 h-1/4"
      >
        <div 
          className="relative w-full h-full nerv-pulse"
        >
          <div 
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: colorMap[variant], opacity: 0.3 }}
          ></div>
          <div 
            className="absolute inset-[30%] rounded-full"
            style={{ backgroundColor: colorMap[variant], opacity: 0.5 }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default NervGlobe;