import { FC } from 'react';
import { MessageSquare, Github, Twitter } from 'lucide-react';

const Footer: FC = () => {
  return (
    <footer className="bg-[#0F172A] text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="h-6 w-6 bg-[#4F46E5] rounded-md flex items-center justify-center">
              <MessageSquare size={14} className="text-white" />
            </div>
            <span className="font-medium text-sm">OpenRouter Chat</span>
          </div>
          
          <div className="flex space-x-6">
            <a href="https://github.com/openrouter-ai" className="text-neutral-300 hover:text-white">
              <Github size={18} />
            </a>
            <a href="https://twitter.com/openrouter_ai" className="text-neutral-300 hover:text-white">
              <Twitter size={18} />
            </a>
          </div>
          
          <div className="text-neutral-400 text-xs mt-4 md:mt-0 text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} OpenRouter. All rights reserved.</p>
            <p className="mt-1">Using <a href="https://simpleanalytics.com" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">Simple Analytics</a> for privacy-first analytics.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
