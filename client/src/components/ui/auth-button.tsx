import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Key, ChevronDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AuthButtonProps {
  isAuthenticated: boolean;
  onClick: () => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ 
  isAuthenticated, 
  onClick 
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {isAuthenticated ? (
              <Button 
                variant="outline"
                size="sm"
                onClick={onClick}
                className="border border-[var(--eva-green)] text-[var(--eva-green)] bg-[var(--eva-green-bg)]/30 hover:bg-[var(--eva-green)] hover:text-black px-3 py-1.5 rounded-md hidden sm:flex items-center"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                <span className="font-mono text-xs tracking-wider">AUTHENTICATED</span>
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onClick}
                className="border-[var(--eva-orange)] text-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black hidden sm:flex items-center nerv-pulse"
              >
                <Key className="h-3.5 w-3.5 mr-1.5" />
                <span className="font-mono text-xs tracking-wider">AUTHENTICATE</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-black border border-[var(--eva-orange)] text-[var(--eva-text)] text-xs">
          {isAuthenticated 
            ? "Authentication active - Click to manage API key options" 
            : "Click to authenticate with OpenRouter"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AuthButton;