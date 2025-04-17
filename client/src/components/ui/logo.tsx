import React from 'react';
import { Link } from 'wouter';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <Link href="/">
      <div className={`flex items-center space-x-2 text-[var(--eva-orange)] cursor-pointer ${className}`}>
        <div className="relative">
          <div className="eva-title text-xl font-bold tracking-wider">NERV</div>
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-[var(--eva-orange)] mix-blend-overlay opacity-30 animate-pulse"></div>
        </div>
        <span className="hidden sm:inline-block text-sm tracking-widest font-light text-[var(--eva-text)]">MAGI SYSTEM</span>
      </div>
    </Link>
  );
};

export default Logo;