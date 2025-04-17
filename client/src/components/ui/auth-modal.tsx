import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Key, AlertCircle, ExternalLink, Lock, BrainCircuit, GithubIcon } from 'lucide-react';
import NervGlobe from './nerv-globe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuthModalProps {
  onClose: () => void;
  onProceed: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onProceed }) => {
  const [activeTab, setActiveTab] = useState("welcome");

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
          NERV Authentication Portal
        </h2>
        
        <Tabs defaultValue="welcome" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4 border border-[var(--eva-orange)] bg-opacity-20">
            <TabsTrigger 
              value="welcome" 
              className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono text-xs uppercase"
            >
              Welcome
            </TabsTrigger>
            <TabsTrigger 
              value="options" 
              className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono text-xs uppercase"
            >
              Auth Options
            </TabsTrigger>
            <TabsTrigger 
              value="local" 
              className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono text-xs uppercase"
            >
              Local Mode
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="welcome" className="space-y-4 text-[var(--eva-text)] font-mono">
            <div className="flex items-start space-x-3 border border-[var(--eva-orange)]/30 p-3 bg-black/30 rounded-md">
              <AlertCircle className="h-5 w-5 text-[var(--eva-orange)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm mb-2">Authentication is required to use NERV AI systems.</p>
                <p className="text-xs text-[var(--eva-green)]">
                  Multiple authentication options are available. See the "Auth Options" tab for details.
                </p>
              </div>
            </div>
            
            <div className="border border-[var(--eva-orange)]/30 p-4 bg-black/30 rounded-md text-sm">
              <p className="text-[var(--eva-orange)] font-bold mb-3">WELCOME TO NERV AI SYSTEMS</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-[var(--eva-green)]/30 p-3 rounded-md bg-black/60">
                  <div className="flex items-center text-[var(--eva-green)] mb-2">
                    <Lock className="h-4 w-4 mr-2" />
                    <span className="text-xs font-bold">API KEY AUTH</span>
                  </div>
                  <p className="text-xs">Enter your OpenRouter API key directly for immediate access.</p>
                </div>
                
                <div className="border border-[var(--eva-blue)]/30 p-3 rounded-md bg-black/60">
                  <div className="flex items-center text-[var(--eva-blue)] mb-2">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    <span className="text-xs font-bold">OAUTH LOGIN</span>
                  </div>
                  <p className="text-xs">Login with your OpenRouter account via OAuth.</p>
                </div>
                
                <div className="border border-[var(--eva-orange)]/30 p-3 rounded-md bg-black/60">
                  <div className="flex items-center text-[var(--eva-orange)] mb-2">
                    <BrainCircuit className="h-4 w-4 mr-2" />
                    <span className="text-xs font-bold">LOCAL MODE</span>
                  </div>
                  <p className="text-xs">Run models locally in your browser without API keys.</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-2">
              <Button 
                onClick={() => setActiveTab("options")}
                className="eva-button text-[var(--eva-orange)] font-mono"
              >
                VIEW AUTH OPTIONS
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="options" className="space-y-4 text-[var(--eva-text)] font-mono">
            <div className="border border-[var(--eva-green)]/30 p-4 bg-black/30 rounded-md text-sm mb-3">
              <p className="text-[var(--eva-green)] font-bold mb-3">AUTHENTICATION METHODS</p>
              <div className="space-y-3">
                <div className="bg-black/50 p-3 rounded-md border border-[var(--eva-orange)]/30">
                  <p className="text-sm font-bold text-[var(--eva-orange)] mb-2">1. DIRECT API KEY</p>
                  <p className="text-xs mb-2">Enter your OpenRouter API key directly in the auth panel.</p>
                  <ol className="list-decimal ml-5 space-y-1 text-xs">
                    <li>Click "PROCEED TO AUTHENTICATION" below</li>
                    <li>Enter your OpenRouter API key in the provided field</li>
                    <li>Click "Submit" to authenticate</li>
                  </ol>
                  <div className="mt-3">
                    <Button 
                      onClick={onProceed}
                      className="h-8 text-xs eva-button text-[var(--eva-green)]"
                    >
                      <Key className="h-3 w-3 mr-2" />
                      ENTER API KEY
                    </Button>
                  </div>
                </div>
                
                <div className="bg-black/50 p-3 rounded-md border border-[var(--eva-blue)]/30">
                  <p className="text-sm font-bold text-[var(--eva-blue)] mb-2">2. OAUTH AUTHENTICATION</p>
                  <p className="text-xs mb-2">Authenticate with your OpenRouter account via OAuth.</p>
                  <ol className="list-decimal ml-5 space-y-1 text-xs">
                    <li>Click "LOGIN WITH OPENROUTER" below</li>
                    <li>Authorize the application on OpenRouter's website</li>
                    <li>You'll be redirected back automatically</li>
                  </ol>
                  <div className="mt-3">
                    <Button 
                      onClick={onProceed}
                      className="h-8 text-xs eva-button text-[var(--eva-blue)]"
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      LOGIN WITH OPENROUTER
                    </Button>
                  </div>
                </div>
                
                <div className="bg-black/50 p-3 rounded-md border border-[var(--eva-orange)]/30">
                  <p className="text-sm font-bold text-[var(--eva-orange)] mb-2">3. GET AN API KEY</p>
                  <p className="text-xs mb-2">Don't have an OpenRouter account? Create one now.</p>
                  <ol className="list-decimal ml-5 space-y-1 text-xs">
                    <li>Visit <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-[var(--eva-blue)] underline">openrouter.ai/keys</a></li>
                    <li>Create an account or sign in</li>
                    <li>Generate a new API key</li>
                    <li>Copy and use it in this application</li>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="local" className="space-y-4 text-[var(--eva-text)] font-mono">
            <div className="border border-[var(--eva-orange)]/30 p-4 bg-black/30 rounded-md">
              <div className="flex items-center mb-3">
                <BrainCircuit className="h-5 w-5 text-[var(--eva-orange)] mr-2" />
                <p className="text-[var(--eva-orange)] font-bold">LOCAL BROWSER MODE</p>
              </div>
              
              <p className="text-xs mb-3">WebLLM allows you to run AI models directly in your browser without requiring an API key. This provides several benefits:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="bg-black/50 p-3 rounded-md border border-[var(--eva-green)]/30">
                  <p className="text-xs font-bold text-[var(--eva-green)] mb-2">BENEFITS</p>
                  <ul className="list-disc ml-4 text-xs space-y-1">
                    <li>Complete privacy - data stays on your device</li>
                    <li>No API costs or rate limits</li>
                    <li>Works offline after model is downloaded</li>
                    <li>No account required</li>
                  </ul>
                </div>
                
                <div className="bg-black/50 p-3 rounded-md border border-[var(--eva-red)]/30">
                  <p className="text-xs font-bold text-[var(--eva-red)] mb-2">LIMITATIONS</p>
                  <ul className="list-disc ml-4 text-xs space-y-1">
                    <li>Limited to available browser models</li>
                    <li>Requires downloading model files (100MB-1GB)</li>
                    <li>Performance depends on your device</li>
                    <li>May use significant memory</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4">
                <Button 
                  onClick={() => {
                    onClose();
                    // Let the parent know we're proceeding with local mode
                    window.dispatchEvent(new CustomEvent('enable-browser-model'));
                  }}
                  className="eva-button text-[var(--eva-orange)] w-full font-mono"
                >
                  <BrainCircuit className="h-4 w-4 mr-2" />
                  ENABLE BROWSER MODEL MODE
                </Button>
              </div>
            </div>
            
            <div className="bg-black/50 border border-[var(--eva-blue)]/30 p-3 rounded-md">
              <p className="text-xs font-mono text-[var(--eva-blue)] mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                BROWSER MODEL INFO
              </p>
              <p className="text-xs mb-1">
                Browser models use WebGPU technology to run models directly in your browser. Some models support:
              </p>
              <ul className="list-disc ml-4 text-xs">
                <li>Phi-2, TinyLlama, and others</li>
                <li>Text generation, classification, and other tasks</li>
                <li>Offline use after initial download</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="eva-button text-[var(--eva-text)] font-mono"
          >
            CLOSE MESSAGE
          </Button>
          {activeTab === "welcome" && (
            <Button 
              onClick={onProceed}
              className="eva-button text-[var(--eva-orange)] font-mono"
            >
              PROCEED TO AUTHENTICATION
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;