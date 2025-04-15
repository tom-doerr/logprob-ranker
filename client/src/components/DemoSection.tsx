import { FC, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import SectionHeader from './ui/section-header';
import { createChatCompletion } from '../lib/openrouter';
import { 
  generateCodeVerifier, 
  createSHA256CodeChallenge, 
  saveCodeVerifier, 
  getCodeVerifier, 
  clearCodeVerifier,
  getApiKey,
  clearApiKey
} from '../utils/pkce';

enum DemoStep {
  GenerateCodes = 1,
  Authenticate = 2,
  UseApiKey = 3
}

const DemoSection: FC = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<DemoStep>(DemoStep.GenerateCodes);
  const [codeVerifier, setCodeVerifier] = useState<string>('');
  const [codeChallenge, setCodeChallenge] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  
  // Check if we already have an API key stored
  useEffect(() => {
    const storedApiKey = getApiKey();
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setCurrentStep(DemoStep.UseApiKey);
    }
  }, []);

  const handleGenerateCodes = async () => {
    try {
      setIsGenerating(true);
      const verifier = generateCodeVerifier();
      setCodeVerifier(verifier);
      
      const challenge = await createSHA256CodeChallenge(verifier);
      setCodeChallenge(challenge);
      
      saveCodeVerifier(verifier);
      
      toast({
        title: "Codes generated successfully",
        description: "You can now proceed to authentication",
      });
    } catch (error) {
      console.error("Error generating codes:", error);
      toast({
        title: "Error generating codes",
        description: "There was a problem generating the PKCE codes",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConnectClick = () => {
    if (!codeVerifier || !codeChallenge) {
      toast({
        title: "Missing codes",
        description: "Please generate the code verifier and challenge first",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, this redirect would take the user to OpenRouter
    // For this demo, we'll just move to the next step with a simulated auth code
    setAuthCode(`auth_${Math.random().toString(36).substring(2, 15)}`);
    setCurrentStep(DemoStep.Authenticate);
  };

  const handleExchangeCode = async () => {
    // This would usually make a call to the backend to exchange the code
    // but for demo purposes we'll simulate it
    try {
      setIsExchanging(true);
      
      setTimeout(() => {
        const mockApiKey = `or-${Math.random().toString(36).substring(2, 15)}`;
        setApiKey(mockApiKey);
        localStorage.setItem('openrouter_api_key', mockApiKey);
        setCurrentStep(DemoStep.UseApiKey);
        setIsExchanging(false);
        
        toast({
          title: "API key obtained",
          description: "Successfully exchanged code for API key",
        });
      }, 1500);
    } catch (error) {
      console.error("Error exchanging code:", error);
      toast({
        title: "Error exchanging code",
        description: "There was a problem obtaining the API key",
        variant: "destructive",
      });
      setIsExchanging(false);
    }
  };

  const handleTestApiCall = async () => {
    try {
      setIsTesting(true);
      setApiResponse(null);
      
      // Simulate an API response
      setTimeout(() => {
        const mockResponse = {
          id: `chatcmpl-${Math.random().toString(36).substring(2, 10)}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "openai/gpt-4o",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Hello! I'm GPT-4o. How can I assist you today?"
              },
              finish_reason: "stop"
            }
          ],
          usage: {
            prompt_tokens: 8,
            completion_tokens: 13,
            total_tokens: 21
          }
        };
        
        setApiResponse(mockResponse);
        setIsTesting(false);
        
        toast({
          title: "API request successful",
          description: "Received response from OpenRouter",
        });
      }, 1500);
    } catch (error) {
      console.error("Error testing API:", error);
      toast({
        title: "API request failed",
        description: "There was a problem making the API request",
        variant: "destructive",
      });
      setIsTesting(false);
    }
  };

  const handleResetDemo = () => {
    setCodeVerifier('');
    setCodeChallenge('');
    setAuthCode('');
    setApiKey(null);
    setApiResponse(null);
    setCurrentStep(DemoStep.GenerateCodes);
    clearCodeVerifier();
    clearApiKey();
    
    toast({
      title: "Demo reset",
      description: "All demo data has been cleared",
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${type} copied successfully`,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="demo" className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <SectionHeader number={4} title="Live Demo" />
        
        <div className="bg-neutral-50 rounded-lg p-6 mb-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">OAuth PKCE Authentication Example</h3>
            <p className="text-neutral-600">Try the authentication flow with this live demo</p>
          </div>
          
          {/* Demo flow visualization */}
          <div className="relative mb-8 pt-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-neutral-200 flex">
              <div 
                className="h-full bg-[#4F46E5] transition-all duration-500 ease-in-out" 
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <div className="text-center flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 -mt-3 
                  ${currentStep >= DemoStep.GenerateCodes ? 'bg-[#4F46E5] text-white' : 'bg-neutral-300 text-neutral-600'}`}>
                  1
                </div>
                <span>Generate Codes</span>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 -mt-3 
                  ${currentStep >= DemoStep.Authenticate ? 'bg-[#4F46E5] text-white' : 'bg-neutral-300 text-neutral-600'}`}>
                  2
                </div>
                <span>Authenticate</span>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 -mt-3 
                  ${currentStep >= DemoStep.UseApiKey ? 'bg-[#4F46E5] text-white' : 'bg-neutral-300 text-neutral-600'}`}>
                  3
                </div>
                <span>API Key Ready</span>
              </div>
            </div>
          </div>
          
          {/* Step 1: Generate Codes */}
          {currentStep === DemoStep.GenerateCodes && (
            <div className="border border-neutral-200 rounded-lg bg-white p-4 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-1">Step 1: Generate Code Verifier & Challenge</h4>
                  <p className="text-sm text-neutral-600 mb-2">Click the button to generate a random code verifier and its SHA-256 challenge.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button 
                      onClick={handleGenerateCodes}
                      disabled={isGenerating}
                      className="bg-[#4F46E5] text-white py-2 px-4 rounded-md hover:bg-[#6366F1] flex-shrink-0 flex items-center justify-center disabled:opacity-70"
                    >
                      {isGenerating ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i> Generating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-key mr-2"></i> Generate Codes
                        </>
                      )}
                    </button>
                    <button 
                      onClick={handleConnectClick}
                      disabled={!codeVerifier || !codeChallenge}
                      className={`py-2 px-4 rounded-md flex-shrink-0 flex items-center justify-center ${
                        codeVerifier && codeChallenge 
                          ? 'bg-[#4F46E5] text-white hover:bg-[#6366F1]' 
                          : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      <i className="fas fa-link mr-2"></i> Connect to OpenRouter
                    </button>
                  </div>
                </div>
                
                <div className="bg-neutral-50 p-3 rounded-md w-full md:w-1/2">
                  <div className="flex flex-col text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-700 font-medium">Code Verifier:</span>
                      <button 
                        onClick={() => copyToClipboard(codeVerifier, 'Code verifier')}
                        disabled={!codeVerifier}
                        className="text-[#4F46E5] hover:text-[#6366F1] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="far fa-copy"></i> Copy
                      </button>
                    </div>
                    <code className="text-neutral-500 font-mono text-xs break-all my-1">
                      {codeVerifier ? codeVerifier : 'Not generated yet'}
                    </code>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-neutral-700 font-medium">Code Challenge (S256):</span>
                      <button 
                        onClick={() => copyToClipboard(codeChallenge, 'Code challenge')}
                        disabled={!codeChallenge}
                        className="text-[#4F46E5] hover:text-[#6366F1] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="far fa-copy"></i> Copy
                      </button>
                    </div>
                    <code className="text-neutral-500 font-mono text-xs break-all my-1">
                      {codeChallenge ? codeChallenge : 'Not generated yet'}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Authentication */}
          {currentStep === DemoStep.Authenticate && (
            <div className="border border-neutral-200 rounded-lg bg-white p-4 mb-4">
              <h4 className="font-medium text-neutral-900 mb-1">Step 2: Authentication</h4>
              <p className="text-sm text-neutral-600 mb-3">After redirection, extract the code from the URL:</p>
              
              <div className="bg-neutral-50 p-3 rounded-md mb-4">
                <div className="flex flex-col text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-700 font-medium">Authorization Code:</span>
                    <button 
                      onClick={() => copyToClipboard(authCode, 'Authorization code')}
                      className="text-[#4F46E5] hover:text-[#6366F1] text-xs"
                    >
                      <i className="far fa-copy"></i> Copy
                    </button>
                  </div>
                  <code className="text-neutral-500 font-mono text-xs break-all my-1">{authCode}</code>
                </div>
              </div>
              
              <button 
                onClick={handleExchangeCode}
                disabled={isExchanging}
                className="bg-[#4F46E5] text-white py-2 px-4 rounded-md hover:bg-[#6366F1] flex items-center justify-center disabled:opacity-70"
              >
                {isExchanging ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i> Exchanging...
                  </>
                ) : (
                  <>
                    <i className="fas fa-exchange-alt mr-2"></i> Exchange for API Key
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Step 3: API Key Ready */}
          {currentStep === DemoStep.UseApiKey && (
            <div className="border border-neutral-200 rounded-lg bg-white p-4">
              <h4 className="font-medium text-neutral-900 mb-1">Step 3: API Key Ready</h4>
              <p className="text-sm text-neutral-600 mb-3">You can now use this API key to make requests to OpenRouter:</p>
              
              <div className="bg-neutral-50 p-3 rounded-md mb-4">
                <div className="flex flex-col text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-700 font-medium">API Key:</span>
                    <button 
                      onClick={() => apiKey && copyToClipboard(apiKey, 'API key')}
                      className="text-[#4F46E5] hover:text-[#6366F1] text-xs"
                    >
                      <i className="far fa-copy"></i> Copy
                    </button>
                  </div>
                  <code className="text-neutral-500 font-mono text-xs break-all my-1">
                    {apiKey ? '•••••••••••••••••••••••••••••••' : 'No API key available'}
                  </code>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={handleTestApiCall}
                  disabled={!apiKey || isTesting}
                  className="bg-[#4F46E5] text-white py-2 px-4 rounded-md hover:bg-[#6366F1] flex items-center justify-center disabled:opacity-70"
                >
                  {isTesting ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i> Testing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i> Test API Call
                    </>
                  )}
                </button>
                <button 
                  onClick={handleResetDemo}
                  className="bg-neutral-200 text-neutral-700 py-2 px-4 rounded-md hover:bg-neutral-300 flex items-center justify-center"
                >
                  <i className="fas fa-redo mr-2"></i> Reset Demo
                </button>
              </div>
              
              {apiResponse && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-neutral-900 mb-1">API Response:</h5>
                  <div className="bg-neutral-800 p-3 rounded-md">
                    <pre className="text-white font-mono text-xs overflow-x-auto">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
