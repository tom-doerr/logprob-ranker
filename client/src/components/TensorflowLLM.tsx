import React, { FC, useState, useCallback, useEffect } from 'react';
import { Cpu, Loader2, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as tf from '@tensorflow/tfjs';
import { ChatMessage } from '@/lib/openrouter';

interface TensorflowLLMProps {
  onSelectBrowserModel: (isUsingBrowserModel: boolean) => void;
  onMessageSent: (message: ChatMessage) => void;
  onResponseReceived: (message: ChatMessage) => void;
  isUsingBrowserModel: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  source: string;
  description: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'simulation',
    name: 'TensorFlow.js (Simulation)',
    source: 'Demo',
    description: 'Simulated TensorFlow.js mode for demonstration'
  },
  {
    id: 'text-generation',
    name: 'TensorFlow.js Text Generation',
    source: 'TensorFlow',
    description: 'Simple text generation using TensorFlow.js'
  },
  {
    id: 'toxicity',
    name: 'Toxicity Classifier',
    source: 'TensorFlow',
    description: 'Detects toxicity in text using TensorFlow.js'
  }
];

const TensorflowLLM: FC<TensorflowLLMProps> = ({
  onSelectBrowserModel,
  onMessageSent,
  onResponseReceived,
  isUsingBrowserModel
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_OPTIONS[0].id);
  const [model, setModel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isModelReady, setIsModelReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [input, setInput] = useState('');
  const [tokenizer, setTokenizer] = useState<any>(null);

  // Initialize TensorFlow.js
  const initializeTensorflow = useCallback(async (modelId: string) => {
    try {
      setIsInitializing(true);
      setIsModelReady(false);
      setLoadingMessage('Initializing TensorFlow.js environment...');
      setLoadingProgress(10);

      // Make sure TensorFlow.js is ready
      await tf.ready();
      setLoadingProgress(20);
      setLoadingMessage('TensorFlow.js ready, preparing model...');

      // Simulation mode doesn't load a real model
      if (modelId === 'simulation') {
        // Simulate a loading process
        const totalSteps = 5;
        const messages = [
          'Loading TensorFlow.js environment...',
          'Initializing tokenizer...',
          'Preparing model architecture...',
          'Loading model weights...',
          'Configuring inference parameters...'
        ];

        for (let i = 0; i < totalSteps; i++) {
          setLoadingMessage(messages[i]);
          setLoadingProgress(20 + ((i + 1) / totalSteps) * 70);
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Set up mock model with chat.completions.create API that matches our interface
        const mockModel = {
          chat: {
            completions: {
              create: async ({ messages }: { messages: any[] }) => {
                // Extract the user's message
                const userMessage = messages[messages.length - 1]?.content || '';
                
                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Generate response based on input
                let response = '';
                
                if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
                  response = "Hello! I'm running on TensorFlow.js in your browser. How can I help you today?";
                } else if (userMessage.toLowerCase().includes('help')) {
                  response = "I'm a TensorFlow.js-powered AI assistant running directly in your browser. This means all processing happens locally without sending your data to external servers. How can I assist you?";
                } else if (userMessage.toLowerCase().includes('tensorflow')) {
                  response = "TensorFlow.js is a JavaScript library for training and deploying machine learning models in the browser and in Node.js. It provides flexible and intuitive APIs for building and training models from scratch, as well as for loading and using pre-trained models.";
                } else {
                  response = `Thanks for your message: "${userMessage}". This is a TensorFlow.js simulation running in your browser. In a real implementation, I would process your request with an actual machine learning model.`;
                }
                
                // Return in a format compatible with OpenRouter API
                return {
                  choices: [
                    {
                      message: {
                        role: 'assistant',
                        content: response
                      }
                    }
                  ]
                };
              }
            }
          }
        };

        setModel(mockModel);
        setIsModelReady(true);
        setLoadingProgress(100);
        setLoadingMessage('TensorFlow.js simulation ready!');
        console.log('TensorFlow.js simulation mode initialized');
      }
      // A real TensorFlow.js implementation would go here
      else if (modelId === 'text-generation') {
        setLoadingMessage('This would load a real text generation model. Currently in simulation mode.');
        setLoadingProgress(30);
        
        // In a real implementation, we would load a pre-trained model
        // For example:
        // const model = await tf.loadLayersModel('path/to/model');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Falling back to simulation with compatible chat.completions API
        const mockModel = {
          chat: {
            completions: {
              create: async ({ messages }: { messages: any[] }) => {
                // Extract the user's message
                const userMessage = messages[messages.length - 1]?.content || '';
                
                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Generate response
                const response = `[TensorFlow.js Text Generation] I would generate text based on your input: "${userMessage}". This is currently a simulation.`;
                
                return {
                  choices: [
                    {
                      message: {
                        role: 'assistant',
                        content: response
                      }
                    }
                  ]
                };
              }
            }
          }
        };
        
        setModel(mockModel);
        setIsModelReady(true);
        setLoadingProgress(100);
        setLoadingMessage('TensorFlow.js text generation ready (simulation)');
      } 
      else if (modelId === 'toxicity') {
        setLoadingMessage('This would load the toxicity classifier model. Currently in simulation mode.');
        setLoadingProgress(30);
        
        // In a real implementation, we would load the toxicity model
        // For example:
        // import * as toxicity from '@tensorflow-models/toxicity';
        // const model = await toxicity.load(threshold, labels);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Falling back to simulation with compatible chat.completions API
        const mockModel = {
          chat: {
            completions: {
              create: async ({ messages }: { messages: any[] }) => {
                // Extract the user's message
                const userMessage = messages[messages.length - 1]?.content || '';
                
                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Simple toxicity check
                const isToxic = userMessage.toLowerCase().includes('hate') || 
                              userMessage.toLowerCase().includes('stupid') || 
                              userMessage.toLowerCase().includes('idiot');
                
                // Generate response
                let response = '';
                if (isToxic) {
                  response = `[Toxicity Analysis] I've detected potentially harmful content in your message. In a real implementation, I would provide detailed toxicity scores.`;
                } else {
                  response = `[Toxicity Analysis] Your message appears to be non-toxic. This is a simulation of TensorFlow.js toxicity detection.`;
                }
                
                return {
                  choices: [
                    {
                      message: {
                        role: 'assistant',
                        content: response
                      }
                    }
                  ]
                };
              }
            }
          }
        };
        
        setModel(mockModel);
        setIsModelReady(true);
        setLoadingProgress(100);
        setLoadingMessage('TensorFlow.js toxicity classifier ready (simulation)');
      }
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error);
      setLoadingMessage(`Error initializing TensorFlow.js: ${error instanceof Error ? error.message : String(error)}`);
      setLoadingProgress(0);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Handle model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelReady(false);
  };

  // Initialize the model
  const handleInitializeModel = async () => {
    if (isInitializing) return;
    await initializeTensorflow(selectedModel);
  };

  // Send a message using the TensorFlow.js model
  const handleSendMessage = async () => {
    if (!model || !isModelReady || !input.trim()) return;
    
    const userMessage: ChatMessage = { role: 'user', content: input };
    onMessageSent(userMessage);
    
    setInput('');
    setIsLoading(true);
    
    try {
      // Check if model has chat.completions API (simulation mode)
      if (model.chat && model.chat.completions) {
        const response = await model.chat.completions.create({
          messages: [{ role: 'user', content: input }],
          temperature: 0.7,
          max_tokens: 1024
        });
        
        if (response.choices && response.choices.length > 0) {
          onResponseReceived(response.choices[0].message);
        } else {
          throw new Error("Invalid response format");
        }
      } 
      // Fallback for models with predict API
      else if (model.predict) {
        const responseText = await model.predict(input);
        
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: responseText
        };
        
        onResponseReceived(assistantMessage);
      }
      else {
        throw new Error("Model doesn't have a valid prediction interface");
      }
    } catch (error) {
      console.error('Error generating response:', error);
      onResponseReceived({ 
        role: 'assistant', 
        content: `Error: Unable to generate a response. ${error instanceof Error ? error.message : String(error)}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isModelReady) {
      handleSendMessage();
    }
  };

  // Toggle between browser model and API
  const handleToggleModelSource = () => {
    onSelectBrowserModel(!isUsingBrowserModel);
  };

  // Initialize TensorFlow
  useEffect(() => {
    // Just ensure TensorFlow is ready, but don't load a model yet
    const initTf = async () => {
      try {
        await tf.ready();
        console.log('TensorFlow.js ready');
      } catch (err) {
        console.error('Error initializing TensorFlow.js:', err);
      }
    };
    
    initTf();
    
    return () => {
      // No explicit cleanup needed for TensorFlow.js
    };
  }, []);

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Header with model selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleToggleModelSource}
            className="eva-button text-[var(--eva-orange)]"
          >
            <Cpu className="h-4 w-4 mr-2" />
            Use API Model
          </Button>
          
          {!isModelReady && !isInitializing && (
            <select 
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-transparent text-[var(--eva-green)] border border-[var(--eva-blue)]/40 rounded p-1 text-sm font-mono"
            >
              {MODEL_OPTIONS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {!isModelReady && !isInitializing && (
          <Button
            size="sm"
            className="eva-button bg-[var(--eva-orange)]/80 hover:bg-[var(--eva-orange)]"
            onClick={handleInitializeModel}
          >
            Initialize TensorFlow
          </Button>
        )}
      </div>

      {/* Loading progress or error message */}
      {(isInitializing || (!isModelReady && loadingMessage && !isInitializing)) && (
        <div className={`w-full p-4 border rounded-md ${
          !isInitializing && loadingMessage && !isModelReady 
            ? 'border-[var(--eva-orange)]/50 bg-[var(--eva-black)]/60'
            : 'border-[var(--eva-blue)]/30 bg-[var(--eva-black)]/40'
        }`}>
          <h3 className={`text-sm font-mono mb-2 flex items-center ${
            !isInitializing && loadingMessage && !isModelReady
              ? 'text-[var(--eva-orange)]'
              : 'text-[var(--eva-blue)]'
          }`}>
            {isInitializing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading TensorFlow.js...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m9.75 9.75 4.5 4.5"/><path d="m14.25 9.75-4.5 4.5"/><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/></svg>
                Initialization Error
              </>
            )}
          </h3>
          
          {isInitializing && (
            <div className="w-full h-2 bg-[var(--eva-black)] border border-[var(--eva-blue)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--eva-blue)]" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          )}
          
          <p className={`text-xs mt-2 font-mono ${
            !isInitializing && loadingMessage && !isModelReady
              ? 'text-[var(--eva-text)]'
              : 'text-[var(--eva-text)]/70'
          }`}>
            {loadingMessage}
          </p>
          
          {!isInitializing && loadingMessage && !isModelReady && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLoadingMessage('')}
                className="text-xs eva-button text-[var(--eva-orange)]"
              >
                Dismiss Error
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Input form */}
      {isModelReady && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 eva-input text-[var(--eva-green)] font-mono"
            placeholder="Type a message to process with TensorFlow.js..."
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            variant="default"
            className="eva-button bg-[var(--eva-orange)]/80 hover:bg-[var(--eva-orange)]"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </form>
      )}

      {/* Info message when not ready */}
      {!isModelReady && !isInitializing && !loadingMessage && (
        <div className="p-4 border border-[var(--eva-blue)]/30 rounded-md bg-[var(--eva-blue)]/5">
          <p className="text-sm text-[var(--eva-text)] font-mono">
            <strong>TENSORFLOW.JS MODE</strong><br/>
            Select a model option and click Initialize to run AI directly in your browser using TensorFlow.js.
            No API key required - all processing happens locally.
          </p>
          <p className="text-xs mt-2 text-[var(--eva-text)]/70 font-mono">
            Note: TensorFlow.js leverages hardware acceleration when available. Select "Simulation" for the best demo experience.
          </p>
          
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleModelSource}
              className="text-xs eva-button text-[var(--eva-orange)]"
            >
              Switch to API Mode Instead
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TensorflowLLM;