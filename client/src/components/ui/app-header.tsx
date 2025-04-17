import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { MessageSquare, BarChart } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// Import our custom components
import Logo from './logo';
import AuthButton from './auth-button';
import AuthDropdown from './auth-dropdown';
import NavMenu from './nav-menu';

export const AppHeader: React.FC = () => {
  const [location] = useLocation();
  const { 
    isAuthenticated, 
    logout, 
    startOAuthFlow, 
    enableBrowserModel, 
    manualApiKey, 
    setManualApiKey, 
    handleManualKeySubmit,
    autoAuthenticate 
  } = useAuth();

  // Navigation items for both dropdown and regular nav
  const navItems = (
    <>
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
    </>
  );

  // Handler for the auth button click
  const handleAuthButtonClick = () => {
    // Open the dropdown programmatically
    document.getElementById('auth-dropdown-trigger')?.click();
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-md border-b border-[var(--eva-orange)] shadow-lg">
      <div className="container mx-auto px-2 sm:px-4 flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Logo />
        </div>

        {/* Navigation Menu - Desktop & Mobile */}
        <NavMenu currentPath={location} />
        
        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Authentication Status Button */}
          <AuthButton 
            isAuthenticated={isAuthenticated} 
            onClick={handleAuthButtonClick} 
          />

          {/* Authentication Dropdown Menu */}
          <AuthDropdown
            isAuthenticated={isAuthenticated}
            logout={logout}
            startOAuthFlow={startOAuthFlow}
            enableBrowserModel={enableBrowserModel}
            manualApiKey={manualApiKey}
            setManualApiKey={setManualApiKey}
            handleManualKeySubmit={handleManualKeySubmit}
            autoAuthenticate={autoAuthenticate}
          >
            {navItems}
          </AuthDropdown>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;