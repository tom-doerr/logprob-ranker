import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { MessageSquare, BarChart, Menu, Settings, LogIn, Key, BrainCircuit, ChevronDown, CheckCircle, Zap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const AppHeader: React.FC = () => {
  const [location] = useLocation();
  const { toast } = useToast();
  const { 
    isAuthenticated, 
    apiKey, 
    logout, 
    startOAuthFlow, 
    enableBrowserModel, 
    manualApiKey, 
    setManualApiKey, 
    handleManualKeySubmit,
    autoAuthenticate 
  } = useAuth();
  const [showManualInput, setShowManualInput] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-md border-b border-[var(--eva-orange)] shadow-lg">
      <div className="container mx-auto px-2 sm:px-4 flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <div className="flex items-center space-x-2 text-[var(--eva-orange)] cursor-pointer">
              <div className="relative">
                <div className="eva-title text-xl font-bold tracking-wider">NERV</div>
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-[var(--eva-orange)] mix-blend-overlay opacity-30 animate-pulse"></div>
              </div>
              <span className="hidden sm:inline-block text-sm tracking-widest font-light text-[var(--eva-text)]">MAGI SYSTEM</span>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          <Link href="/chat">
            <div className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 cursor-pointer ${
              location === '/chat' 
              ? 'bg-[var(--eva-orange)] text-black' 
              : 'text-[var(--eva-text)] hover:bg-black/40 hover:text-[var(--eva-orange)]'
            }`}>
              <MessageSquare className="h-4 w-4" />
              <span>Chat Interface</span>
            </div>
          </Link>
          <Link href="/ranker">
            <div className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 cursor-pointer ${
              location === '/ranker' 
              ? 'bg-[var(--eva-orange)] text-black' 
              : 'text-[var(--eva-text)] hover:bg-black/40 hover:text-[var(--eva-orange)]'
            }`}>
              <BarChart className="h-4 w-4" />
              <span>Output Ranker</span>
            </div>
          </Link>
        </nav>

        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Authentication Status & Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  {isAuthenticated ? (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Open the dropdown programmatically
                        document.getElementById('auth-dropdown-trigger')?.click();
                      }}
                      className="border border-[var(--eva-green)] text-[var(--eva-green)] bg-[var(--eva-green-bg)]/30 hover:bg-[var(--eva-green)] hover:text-black px-3 py-1.5 rounded-md hidden sm:flex items-center"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      <span className="font-mono text-xs tracking-wider">AUTHENTICATED</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Open the dropdown programmatically
                        document.getElementById('auth-dropdown-trigger')?.click();
                      }}
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

          {/* Authentication Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isAuthenticated ? (
                <Button 
                  id="auth-dropdown-trigger"
                  variant="outline" 
                  size="icon"
                  className="border-[var(--eva-green)] text-[var(--eva-green)] hover:bg-[var(--eva-green)] hover:text-black h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Key className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  id="auth-dropdown-trigger"
                  variant="outline" 
                  size="icon"
                  className="border-[var(--eva-orange)] text-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black h-8 w-8 sm:h-9 sm:w-9 nerv-pulse"
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
              
              {/* Navigation Options */}
              <div className="px-2 py-1.5 text-xs font-mono text-[var(--eva-orange)] uppercase">
                Navigation
              </div>
              <DropdownMenuItem className="text-[var(--eva-text)] focus:bg-[var(--eva-orange)] focus:text-black" asChild>
                <Link href="/chat">
                  <div className="flex items-center w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Chat Interface</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--eva-text)] focus:bg-[var(--eva-orange)] focus:text-black" asChild>
                <Link href="/ranker">
                  <div className="flex items-center w-full">
                    <BarChart className="mr-2 h-4 w-4" />
                    <span>Output Ranker</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Menu Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="border-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black h-8 w-8 sm:h-9 sm:w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-black/95 border-[var(--eva-orange)]">
              <DropdownMenuItem className="text-[var(--eva-text)] focus:bg-[var(--eva-orange)] focus:text-black" asChild>
                <Link href="/chat">
                  <div className="flex items-center w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Chat Interface</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--eva-text)] focus:bg-[var(--eva-orange)] focus:text-black" asChild>
                <Link href="/ranker">
                  <div className="flex items-center w-full">
                    <BarChart className="mr-2 h-4 w-4" />
                    <span>Output Ranker</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;