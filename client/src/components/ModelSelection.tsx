import { FC, useState } from 'react';
import { Settings, Zap, Download, ExternalLink, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useModelConfig } from '@/hooks/use-model-config';
import { getApiKey } from '../utils/pkce';

// Unified model selection component that handles all model sources (API & browser)
const ModelSelection: FC = () => {
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [primaryTab, setPrimaryTab] = useState<string>('api');

  // Get model config from context
  const {
    isUsingBrowserModel,
    setIsUsingBrowserModel,
    selectedModel,
    setSelectedModel,
    temperature,
    setTemperature,
    topP,
    setTopP,
    maxTokens,
    setMaxTokens,
    customModel,
    setCustomModel,
    popularModels,
    browserModelOptions
  } = useModelConfig();

  // Toggle model picker view
  const toggleModelPicker = () => {
    setModelPickerOpen(!modelPickerOpen);
  };

  // Handle model selection from popular models
  const handleSelectModelFromPopular = (modelId: string) => {
    setSelectedModel(modelId);
    setModelPickerOpen(false);
  };

  // Handle custom model selection
  const handleSelectCustomModel = () => {
    if (customModel.trim()) {
      setSelectedModel('custom');
      setModelPickerOpen(false);
    }
  };

  // Check for API key
  const hasApiKey = !!getApiKey();

  // Handle switching between API and Browser models
  const handleModelSourceChange = (value: string) => {
    setPrimaryTab(value);
    setIsUsingBrowserModel(value === 'browser');
  };

  return (
    <Card className="eva-card border border-[var(--eva-orange)]/50 bg-black/50 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-[var(--eva-orange)] font-mono uppercase tracking-wider text-sm flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            MAGI SYSTEM CONFIGURATION
          </div>
          <Tabs value={primaryTab} onValueChange={handleModelSourceChange} className="w-auto">
            <TabsList className="h-8 border border-[var(--eva-orange)] bg-opacity-20">
              <TabsTrigger 
                value="api" 
                className="h-7 data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase text-xs"
                disabled={!hasApiKey}
              >
                <Zap className="h-3 w-3 mr-1" />
                API
              </TabsTrigger>
              <TabsTrigger 
                value="browser" 
                className="h-7 data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase text-xs"
              >
                <Layers className="h-3 w-3 mr-1" />
                LOCAL
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardTitle>
        {!hasApiKey && primaryTab === 'api' && (
          <CardDescription className="text-[var(--eva-orange)]/70 font-mono text-xs mt-2">
            No API key found. Please authenticate to use API models.
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Model Selection for API Models */}
        {primaryTab === 'api' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-medium text-[var(--eva-orange)] font-mono uppercase">MODEL SELECTION</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleModelPicker} 
                className="h-6 px-2 text-xs text-[var(--eva-green)]"
                disabled={!hasApiKey}
              >
                {modelPickerOpen ? 'CLOSE' : 'CHANGE'}
              </Button>
            </div>
            
            {modelPickerOpen ? (
              <div className="p-4 bg-black/30 border border-[var(--eva-orange)] rounded-md mb-4">
                <Tabs defaultValue="popular" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 border border-[var(--eva-orange)] bg-opacity-20">
                    <TabsTrigger value="popular" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">MAGI DATABASE</TabsTrigger>
                    <TabsTrigger value="custom" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">CUSTOM MODEL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="popular" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {popularModels.map((model) => (
                        <div 
                          key={model.id}
                          onClick={() => handleSelectModelFromPopular(model.id)}
                          className={`p-3 border rounded-md cursor-pointer transition-colors ${
                            selectedModel === model.id 
                              ? 'border-[var(--eva-orange)] bg-[var(--eva-orange)]/10' 
                              : 'border-[var(--eva-blue)]/30 hover:border-[var(--eva-orange)]/50 hover:bg-black/20'
                          }`}
                        >
                          <h4 className="font-medium text-sm text-[var(--eva-orange)] font-mono">{model.name}</h4>
                          <p className="text-xs text-[var(--eva-text)] mt-1 font-mono">{model.description}</p>
                          <div className="flex justify-between mt-2 text-xs text-[var(--eva-green)] font-mono">
                            <span>CAPACITY: {model.contextSize}</span>
                            <span>RESOURCES: {model.pricing}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="custom" className="mt-4">
                    <div className="space-y-4 py-2 border border-[var(--eva-orange)]/30 rounded-md p-4 bg-black/20">
                      <p className="text-xs text-[var(--eva-text)]/60 font-mono">
                        ENTER CUSTOM MODEL IDENTIFIER (e.g., "anthropic/claude-3-opus-20240229"):
                      </p>
                      <Input
                        placeholder="Enter model identifier"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        className="eva-input text-[var(--eva-green)] font-mono"
                      />
                      <Button 
                        onClick={handleSelectCustomModel}
                        disabled={!customModel.trim()}
                        className="w-full mt-2 eva-button text-[var(--eva-orange)] font-mono uppercase"
                      >
                        INITIATE CUSTOM SYNCHRONIZATION
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="p-3 border border-[var(--eva-orange)]/40 rounded-md bg-black/20">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-[var(--eva-orange)] font-mono text-sm">
                      {selectedModel === 'custom' 
                        ? customModel 
                        : popularModels.find(m => m.id === selectedModel)?.name || 'Loading...'}
                    </h4>
                    <p className="text-xs text-[var(--eva-text)]/60 font-mono mt-1">
                      Remote execution via OpenRouter API
                    </p>
                  </div>
                  <div className="text-[var(--eva-green)] bg-[var(--eva-green)]/10 border border-[var(--eva-green)]/20 px-2 py-1 rounded text-xs font-mono">
                    API
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Browser model selection is handled separately in BrowserModels component */}
        {primaryTab === 'browser' && (
          <div className="p-3 border border-[var(--eva-orange)]/40 rounded-md bg-black/20">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[var(--eva-orange)] font-mono text-sm">
                  Local Browser Execution
                </h4>
                <p className="text-xs text-[var(--eva-text)]/60 font-mono mt-1">
                  Models run directly in your browser without API calls
                </p>
              </div>
              <div className="text-[var(--eva-green)] bg-[var(--eva-green)]/10 border border-[var(--eva-green)]/20 px-2 py-1 rounded text-xs font-mono">
                LOCAL
              </div>
            </div>
            <p className="text-xs text-[var(--eva-orange)]/70 font-mono mt-3">
              Configure browser model settings in the dedicated panel below
            </p>
          </div>
        )}
        
        {/* Generation Parameters - Always visible for both API and local modes */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-[var(--eva-orange)] font-mono uppercase">GENERATION PARAMETERS</h3>
          
          <div className="space-y-4 p-3 border border-[var(--eva-orange)]/40 rounded-md bg-black/20">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-[var(--eva-green)] font-mono">TEMPERATURE: {temperature.toFixed(1)}</label>
              </div>
              <Slider
                value={[temperature]}
                max={2}
                step={0.1}
                onValueChange={(value) => setTemperature(value[0])}
                className="[&>span:first-child]:h-2 [&>span:first-child]:bg-[var(--eva-blue)]/20"
              />
              <div className="flex justify-between text-[0.6rem] text-[var(--eva-text)]/40 font-mono mt-1">
                <span>PRECISE</span>
                <span>CREATIVE</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-[var(--eva-green)] font-mono">TOP-P: {topP.toFixed(2)}</label>
              </div>
              <Slider
                value={[topP]}
                max={1}
                min={0.1}
                step={0.01}
                onValueChange={(value) => setTopP(value[0])}
                className="[&>span:first-child]:h-2 [&>span:first-child]:bg-[var(--eva-blue)]/20"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-[var(--eva-green)] font-mono">MAX TOKENS: {maxTokens}</label>
              </div>
              <Slider
                value={[maxTokens]}
                max={4000}
                min={100}
                step={100}
                onValueChange={(value) => setMaxTokens(value[0])}
                className="[&>span:first-child]:h-2 [&>span:first-child]:bg-[var(--eva-blue)]/20"
              />
            </div>
          </div>
        </div>
        
        {/* API Key Status */}
        {primaryTab === 'api' && (
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--eva-text)]/60 font-mono">API KEY STATUS:</span>
              <span className={`text-xs font-mono ${hasApiKey ? 'text-[var(--eva-green)]' : 'text-[var(--eva-orange)]'}`}>
                {hasApiKey ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}
              </span>
            </div>
            {!hasApiKey && (
              <Button 
                variant="link" 
                className="p-0 h-6 text-xs text-[var(--eva-blue)] hover:text-[var(--eva-blue)]/80 font-mono"
                asChild
              >
                <a href="/callback" className="flex items-center">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  AUTHENTICATE WITH OPENROUTER
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelSelection;