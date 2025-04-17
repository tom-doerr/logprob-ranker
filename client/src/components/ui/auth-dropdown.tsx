import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LogIn, 
  Key, 
  BrainCircuit, 
  Settings, 
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface AuthDropdownProps {
  isAuthenticated: boolean;
  logout: () => void;
  startOAuthFlow: () => Promise<void>;
  enableBrowserModel: () => void;
  manualApiKey: string;
  setManualApiKey: (key: string) => void;
  handleManualKeySubmit: () => void;
  autoAuthenticate: () => boolean;
  children?: React.ReactNode;
}

export const AuthDropdown: React.FC<AuthDropdownProps> = ({
  isAuthenticated,
  logout,
  startOAuthFlow,
  enableBrowserModel,
  manualApiKey,
  setManualApiKey,
  handleManualKeySubmit,
  autoAuthenticate,
  children
}) => {
  const { toast } = useToast();
  const [showManualInput, setShowManualInput] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isAuthenticated ? (
          <Button 
            id="auth-dropdown-trigger"
            variant="outline" 
            size="icon"
            className="border-[var(--eva-green)] text-[var(--eva-green)] hover:bg-[var(--eva-green)] hover:text-black h-9 w-9"
          >
            <Key className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            id="auth-dropdown-trigger"
            variant="outline" 
            size="icon"
            className="border-[var(--eva-orange)] text-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black h-9 w-9 nerv-pulse"
          >
            <Key className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-black/95 border-[var(--eva-orange)]">
        <div className="px-2 py-1.5 text-xs font-mono text-[var(--eva-orange)] uppercase">
          Authentication Options
        </div>
        
        {isAuthenticated ? (
          <>
            <div className="px-2 py-2 text-xs text-[var(--eva-green)] flex items-center">
              <div className="h-2 w-2 rounded-full bg-[var(--eva-green)] mr-2 animate-pulse"></div>
              <span>Authentication Active</span>
            </div>
            <DropdownMenuItem 
              className="text-[var(--eva-red)] focus:bg-[var(--eva-red)] focus:text-white" 
              onClick={logout}
            >
              <div className="flex items-center w-full">
                <Settings className="mr-2 h-4 w-4" />
                <span>Logout / Clear API Key</span>
              </div>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem 
              className="bg-[var(--eva-orange)]/20 text-white border-l-2 border-[var(--eva-orange)] focus:bg-[var(--eva-orange)] focus:text-black mb-2"
              onClick={() => {
                const success = autoAuthenticate();
                if (!success) {
                  // If no previous auth found, show a message
                  toast({
                    title: 'No Saved Authentication',
                    description: 'Choose an authentication method below.',
                    duration: 3000,
                  });
                }
              }}
            >
              <div className="flex items-center w-full">
                <Zap className="mr-2 h-4 w-4 text-[var(--eva-orange)]" />
                <span>Quick Authenticate</span>
                <span className="ml-auto text-xs opacity-70">(Restore Previous)</span>
              </div>
            </DropdownMenuItem>
          
            <DropdownMenuLabel className="text-xs text-[var(--eva-orange)] font-mono">
              AUTHENTICATION METHODS
            </DropdownMenuLabel>
          
            <DropdownMenuItem 
              className="text-[var(--eva-blue)] focus:bg-[var(--eva-blue)] focus:text-white"
              onClick={startOAuthFlow}
            >
              <div className="flex items-center w-full">
                <LogIn className="mr-2 h-4 w-4" />
                <span>OpenRouter OAuth Login</span>
              </div>
            </DropdownMenuItem>
            
            {showManualInput ? (
              <div className="p-2 flex items-center space-x-1">
                <input 
                  type="password"
                  placeholder="Enter API key"
                  value={manualApiKey}
                  onChange={(e) => setManualApiKey(e.target.value)}
                  className="flex-1 h-8 bg-black/50 border border-[var(--eva-orange)]/40 text-[var(--eva-text)] rounded-sm px-2 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    // Prevent dropdown from closing on save
                    e.preventDefault();
                    e.stopPropagation();
                    handleManualKeySubmit();
                    setShowManualInput(false);
                  }}
                  className="h-8 border-[var(--eva-orange)] text-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black text-xs p-0 px-2"
                >
                  Save
                </Button>
              </div>
            ) : (
              <DropdownMenuItem 
                className="text-[var(--eva-orange)] focus:bg-[var(--eva-orange)] focus:text-black"
                onClick={(e) => {
                  // Prevent the dropdown from closing
                  e.preventDefault();
                  e.stopPropagation();
                  setShowManualInput(true);
                }}
              >
                <div className="flex items-center w-full">
                  <Key className="mr-2 h-4 w-4" />
                  <span>Enter API Key Manually</span>
                </div>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem 
              className="text-[var(--eva-green)] focus:bg-[var(--eva-green)] focus:text-black"
              onClick={enableBrowserModel}
            >
              <div className="flex items-center w-full">
                <BrainCircuit className="mr-2 h-4 w-4" />
                <span>Use Browser Models (No API Key)</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator className="bg-[var(--eva-orange)]/20" />
        
        {/* Additional Menu Items */}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AuthDropdown;