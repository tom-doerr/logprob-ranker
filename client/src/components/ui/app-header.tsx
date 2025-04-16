import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { MessageSquare, BarChart, Menu, Github, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';

export const AppHeader: React.FC = () => {
  const [location] = useLocation();
  const { isAuthenticated, apiKey, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-black/70 backdrop-blur-md border-b border-[var(--eva-orange)] shadow-lg">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
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

        <div className="flex items-center space-x-3">
          {isAuthenticated && (
            <div className="text-xs text-[var(--eva-green)] px-2 py-1 bg-[var(--eva-green-bg)] rounded-md hidden sm:block">
              API Key Active
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="border-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black"
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
              
              {isAuthenticated && (
                <DropdownMenuItem 
                  className="text-[var(--eva-red)] focus:bg-[var(--eva-red)] focus:text-white" 
                  onClick={logout}
                >
                  <div className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Logout / Clear API Key</span>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;