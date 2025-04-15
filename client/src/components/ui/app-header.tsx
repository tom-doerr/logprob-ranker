import React from 'react';
import { useLocation, Link } from 'wouter';
import { BrainCog, BarChart, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export const AppHeader: React.FC = () => {
  const [location] = useLocation();
  const { apiKey, isAuthenticated } = useAuth();
  
  const navItems = [
    { path: '/', label: 'Chat Interface', icon: <BrainCog className="h-4 w-4 mr-2" /> },
    { path: '/ranker', label: 'Output Ranker', icon: <BarChart className="h-4 w-4 mr-2" /> }
  ];

  return (
    <header className="border-b border-[var(--eva-orange)] bg-black/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto py-2 px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1">
            <div className="text-[var(--eva-orange)] eva-title text-lg mr-6 flex items-center">
              <span className="nerv-blink">NERV</span>
              <span className="ml-2 text-sm text-[var(--eva-text)]">MAGI SYSTEM</span>
            </div>
            
            <nav className="flex space-x-1">
              {navItems.map(item => (
                <Link key={item.path} href={item.path}>
                  <a className={`flex items-center px-3 py-1.5 text-sm rounded-md ${location === item.path 
                    ? 'bg-[var(--eva-orange)] text-black font-medium' 
                    : 'text-[var(--eva-text)] hover:bg-black/20'}`}>
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-md text-xs ${isAuthenticated 
              ? 'bg-[var(--eva-green-bg)] text-[var(--eva-green)]' 
              : 'bg-[var(--eva-red-bg)] text-[var(--eva-red)]'}`}>
              {isAuthenticated ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}
            </span>
            
            <Button variant="outline" size="sm" className="eva-button border-[var(--eva-orange)] text-[var(--eva-orange)]">
              <User className="h-4 w-4 mr-1" />
              Account
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;