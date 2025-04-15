import React from 'react';
import { Button } from '@/components/ui/button';
import { Key, AlertCircle } from 'lucide-react';
import NervGlobe from './nerv-globe';

interface AuthModalProps {
  onClose: () => void;
  onProceed: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onProceed }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--eva-black)] max-w-2xl w-full border-2 border-[var(--eva-orange)] rounded-md p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--eva-orange)]"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[var(--eva-orange)]"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[var(--eva-orange)]"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--eva-orange)]"></div>
        
        {/* Authentication modal decoration globe */}
        <NervGlobe
          size="md"
          variant="orange"
          opacity={0.05}
          className="absolute top-[-5rem] right-[-5rem] z-0"
        />
        
        <h2 className="text-xl text-[var(--eva-orange)] font-mono uppercase tracking-wider mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2" />
          NERV Authentication Required
        </h2>
        
        <div className="space-y-4 text-[var(--eva-text)] font-mono">
          <div className="flex items-start space-x-3 border border-[var(--eva-orange)]/30 p-3 bg-black/30 rounded-md">
            <AlertCircle className="h-5 w-5 text-[var(--eva-orange)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm mb-2">OpenRouter API key is required to use NERV systems.</p>
              <p className="text-xs text-[var(--eva-green)]">
                API key authentication available in the "NERV SYSTEM-B" tab. Once authenticated, you will have access to all NERV systems.
              </p>
            </div>
          </div>
          
          <div className="border border-[var(--eva-orange)]/30 p-3 bg-black/30 rounded-md text-sm mb-3">
            <p className="mb-2 text-[var(--eva-orange)]">INSTRUCTIONS:</p>
            <ol className="list-decimal ml-5 space-y-1 text-xs">
              <li>Click "PROCEED TO AUTHENTICATION" below or navigate to "NERV SYSTEM-B" tab</li>
              <li>Enter your OpenRouter API key or create a new one via the OpenRouter authentication</li>
              <li>Once authorized, you'll have full access to all NERV systems</li>
            </ol>
          </div>
          
          <div className="bg-black/50 border border-[var(--eva-blue)]/30 p-3 rounded-md">
            <p className="text-xs font-mono text-[var(--eva-blue)] mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              MAGI SYSTEM NOTICE
            </p>
            <ul className="list-disc ml-4 text-xs space-y-1">
              <li>You will need a valid OpenRouter API key to use the application</li>
              <li>You can enter your OpenRouter API key directly in the form</li>
              <li>If you don't have a key, you can follow the link to create one on OpenRouter's website</li>
              <li>You can also try the OAuth authentication option (may not work on all deployments)</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="eva-button text-[var(--eva-text)] font-mono"
          >
            CLOSE MESSAGE
          </Button>
          <Button 
            onClick={onProceed}
            className="eva-button text-[var(--eva-orange)] font-mono"
          >
            PROCEED TO AUTHENTICATION
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;