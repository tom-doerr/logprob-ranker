import { FC } from 'react';
import { Link } from 'wouter';
import { MessageSquare } from 'lucide-react';

const Header: FC = () => {
  return (
    <header className="bg-[#0F172A] shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Link to="/">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-[#4F46E5] rounded-md flex items-center justify-center">
                  <MessageSquare size={18} className="text-white" />
                </div>
                <span className="text-white font-semibold text-xl">OpenRouter Chat</span>
              </div>
            </Link>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="flex items-center space-x-4">
            <a href="https://openrouter.ai/docs" target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Documentation</a>
            <a href="https://openrouter.ai/api" target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">API</a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
