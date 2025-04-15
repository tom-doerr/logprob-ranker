import { FC, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Cpu, Info, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '../lib/openrouter';
import { useModelConfig } from '@/hooks/use-model-config';
import * as webllm from '@mlc-ai/web-llm';

const BrowserModels: FC = () => {
  const { toast } = useToast();
  const {
    browserModelOptions,
    selectedModel,
    setSelectedModel,
    isModelLoaded,
    isLoadingModel,
    loadingProgress,
    loadingMessage,
    browserModelEngine,
    loadBrowserModel,
    resetEngine,
    temperature,
    topP,
    maxTokens
  } = useModelConfig();
  
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedTab, setSelectedTab] = useState<string>('webllm');

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending message to the model
  const handleSendMessage = async () => {
    if (!input.trim() || !isModelLoaded || isProcessing) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Generate response using the loaded model
      const response = await browserModelEngine.chat.completions.create({
        messages: [...messages, userMessage],
        temperature: temperature,
        top_p: topP,
        max_tokens: maxTokens,
      });

      // Extract the response from the model
      if (response.choices && response.choices.length > 0) {
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: response.choices[0].message.content 
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Error generating response. Please try again or reload the model.',
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate response',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start or restart the model
  const handleLoadModel = async () => {
    try {
      await loadBrowserModel();
      toast({
        title: 'Model Loaded',
        description: `${selectedModel} has been loaded successfully.`,
      });
    } catch (error) {
      console.error('Error loading model:', error);
      toast({
        title: 'Model Load Error',
        description: error instanceof Error ? error.message : 'Failed to load model',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-2 max-w-4xl">
      <Alert className="mb-4 border border-[var(--eva-blue)] bg-black/20">
        <Cpu className="h-4 w-4 text-[var(--eva-blue)]" />
        <AlertTitle className="text-[var(--eva-blue)] font-mono uppercase tracking-wider">
          NERV LOCAL MAGI SYSTEM
        </AlertTitle>
        <AlertDescription className="text-xs font-mono">
          Running models directly in your browser. No API calls or API keys required.
          {!isModelLoaded && !isLoadingModel && (
            <div className="mt-2 text-[var(--eva-orange)]">
              <AlertTriangle className="h-4 w-4 inline mr-1 text-[var(--eva-orange)]" />
              No model loaded. Please select and load a model to begin.
            </div>
          )}
        </AlertDescription>
      </Alert>

      <Tabs 
        defaultValue="webllm" 
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="mb-4"
      >
        <TabsList className="grid w-full grid-cols-1 mb-2 border border-[var(--eva-orange)] bg-opacity-20">
          <TabsTrigger 
            value="webllm" 
            className="flex items-center justify-center data-[state=active]:bg-[var(--eva-blue)] data-[state=active]:text-black font-mono uppercase"
          >
            <Cpu className="h-4 w-4 mr-2" />
            WebLLM Browser Models
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="webllm" className="space-y-4">
          {/* Browser model configuration */}
          <div className="border border-[var(--eva-blue)]/40 bg-black/20 rounded-md p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-sm text-[var(--eva-blue)]">SELECT MODEL:</h3>
              
              <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {browserModelOptions.map((model) => (
                  <Button
                    key={model.id}
                    size="sm"
                    variant={selectedModel === model.id ? "default" : "outline"}
                    className={`font-mono text-xs ${
                      selectedModel === model.id 
                        ? "bg-[var(--eva-blue)] hover:bg-[var(--eva-blue)]/80 text-black" 
                        : "border-[var(--eva-blue)]/30 text-[var(--eva-blue)]"
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    {model.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleLoadModel}
                disabled={isLoadingModel}
                className="font-mono bg-[var(--eva-blue)] hover:bg-[var(--eva-blue)]/80 text-black"
              >
                {isLoadingModel ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    LOADING MODEL...
                  </>
                ) : isModelLoaded ? (
                  <>RESTART MODEL</>
                ) : (
                  <>LOAD MODEL</>
                )}
              </Button>
              
              {isModelLoaded && (
                <Button
                  variant="outline"
                  onClick={resetEngine}
                  className="font-mono border-[var(--eva-orange)]/30 text-[var(--eva-orange)]"
                >
                  RESET ENGINE
                </Button>
              )}
            </div>
            
            {isLoadingModel && (
              <div className="space-y-2">
                <Progress value={loadingProgress * 100} className="h-2 bg-black/50" />
                <p className="text-xs font-mono text-[var(--eva-text)]">
                  {loadingMessage || 'Initializing WebLLM...'}
                </p>
              </div>
            )}

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="details" className="border-[var(--eva-blue)]/20">
                <AccordionTrigger className="font-mono text-xs text-[var(--eva-blue)] py-2">
                  <Info className="h-3 w-3 mr-2" />
                  MODEL INFORMATION
                </AccordionTrigger>
                <AccordionContent className="text-xs font-mono">
                  <p className="mb-1 text-[var(--eva-text)]">
                    <span className="text-[var(--eva-blue)]">➤ WebLLM</span> runs models directly in your browser using WebGPU.
                  </p>
                  <p className="mb-1 text-[var(--eva-text)]">
                    <span className="text-[var(--eva-blue)]">➤ Requirements:</span> Chrome/Edge 113+ with WebGPU enabled.
                  </p>
                  <p className="mb-1 text-[var(--eva-text)]">
                    <span className="text-[var(--eva-blue)]">➤ First load</span> downloads the model (~4GB). Future sessions use cached model.
                  </p>
                  <p className="text-[var(--eva-text)]">
                    <span className="text-[var(--eva-blue)]">➤ GPU VRAM usage:</span> 7-8GB for 8B models, 12-13GB for 13B models.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* Chat interface for local models */}
          <div className="flex flex-col h-[40vh] border border-[var(--eva-blue)]/40 bg-black/20 rounded-md p-4">
            <div className="flex-grow overflow-y-auto mb-4 space-y-4 p-2">
              {messages.length === 0 ? (
                <div className="text-center text-[var(--eva-text)]/60 my-8 font-mono">
                  {isModelLoaded 
                    ? "MODEL READY. ENTER PROMPT TO BEGIN."
                    : "LOAD A MODEL FIRST TO CHAT."}
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg max-w-[80%] font-mono text-sm ${
                      message.role === 'user'
                        ? 'ml-auto bg-[var(--eva-blue)]/20 text-[var(--eva-blue)] border border-[var(--eva-blue)]/40'
                        : 'bg-[var(--eva-green-bg)] text-[var(--eva-green)] border border-[var(--eva-blue)]/40'
                    }`}
                  >
                    {message.content}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="flex space-x-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isModelLoaded 
                  ? "ENTER PROMPT HERE..." 
                  : "LOAD A MODEL FIRST TO BEGIN CHAT..."}
                disabled={!isModelLoaded || isProcessing}
                className="flex-grow eva-input text-[var(--eva-blue)] font-mono bg-black/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!isModelLoaded || isProcessing || !input.trim()}
                className="eva-button bg-[var(--eva-blue)] hover:bg-[var(--eva-blue)]/80 text-black"
              >
                {isProcessing 
                  ? <Loader2 className="h-4 w-4 animate-spin" /> 
                  : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrowserModels;