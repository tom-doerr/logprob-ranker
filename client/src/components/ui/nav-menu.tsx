import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { MessageSquare, BarChart, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavMenuItemProps {
  path: string;
  current: string;
  icon: React.ReactNode;
  label: string;
}

const NavMenuItem: React.FC<NavMenuItemProps> = ({
  path,
  current,
  icon,
  label
}) => {
  const isActive = current === path;
  
  return (
    <Link href={path}>
      <div className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 cursor-pointer ${
        isActive 
        ? 'bg-[var(--eva-orange)] text-black' 
        : 'text-[var(--eva-text)] hover:bg-black/40 hover:text-[var(--eva-orange)]'
      }`}>
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
};

interface NavMenuProps {
  currentPath: string;
}

export const NavMenu: React.FC<NavMenuProps> = ({ currentPath }) => {
  const navItems = [
    {
      path: '/chat',
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'Chat Interface'
    },
    {
      path: '/ranker',
      icon: <BarChart className="h-4 w-4" />,
      label: 'Output Ranker'
    }
  ];
  
  return (
    <>
      {/* Desktop Nav Menu */}
      <nav className="hidden md:flex items-center space-x-1">
        {navItems.map((item) => (
          <NavMenuItem 
            key={item.path}
            path={item.path}
            current={currentPath}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </nav>
      
      {/* Mobile Nav Menu */}
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
          {navItems.map((item) => (
            <DropdownMenuItem 
              key={item.path}
              className="text-[var(--eva-text)] focus:bg-[var(--eva-orange)] focus:text-black" 
              asChild
            >
              <Link href={item.path}>
                <div className="flex items-center w-full">
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default NavMenu;