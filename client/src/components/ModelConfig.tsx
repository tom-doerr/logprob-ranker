import { FC, useState } from 'react';
import { Settings, Flame, Zap, RefreshCw, Sparkles, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModelConfig } from '@/hooks/use-model-config';

// Simplified component that doesn't need props anymore
const ModelConfig: FC = () => {
  // Get all model configuration from our centralized context
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
    loadBrowserModel,
    isModelLoaded,
    isLoadingModel,
    loadingProgress,
    loadingMessage,
    browserModelOptions,
    popularModels
  } = useModelConfig();
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  
  const toggleModelPicker = () => {
    setModelPickerOpen(!modelPickerOpen);
  };

  const handleSelectModelFromPopular = (modelId: string) => {
    setSelectedModel(modelId);
    setModelPickerOpen(false);
  };

  const handleSelectCustomModel = () => {
    if (customModel.trim()) {
      setSelectedModel('custom');
      setModelPickerOpen(false);
    }
  };

  const handleBrowserModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  return (
    <Card className="eva-card border border-[var(--eva-orange)]/50 bg-black/50 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-[var(--eva-orange)] font-mono uppercase tracking-wider text-sm flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            MAGI SYSTEM CONFIGURATION
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsUsingBrowserModel(!isUsingBrowserModel)}
              className="eva-button text-[var(--eva-orange)]"
            >
              {isUsingBrowserModel ? <Zap className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {isUsingBrowserModel ? "API MODE" : "LOCAL MODE"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Selection */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-medium text-[var(--eva-orange)] font-mono uppercase">PILOT SELECTION</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleModelPicker} 
              className="h-6 px-2 text-xs text-[var(--eva-green)]"
            >
              {modelPickerOpen ? 'CLOSE' : 'CHANGE'}
            </Button>
          </div>
          
          {modelPickerOpen ? (
            <div className="p-4 bg-black/30 border border-[var(--eva-orange)] rounded-md mb-4">
              {isUsingBrowserModel ? (
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <label className="text-xs text-[var(--eva-orange)] font-mono">SELECT LOCAL MODEL:</label>
                    <Select 
                      value={selectedModel} 
                      onValueChange={handleBrowserModelSelect}
                      disabled={isLoadingModel}
                    >
                      <SelectTrigger className="eva-select text-[var(--eva-green)] font-mono">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="eva-select-content">
                        {browserModelOptions.map((model) => (
                          <SelectItem key={model.id} value={model.id} className="font-mono">
                            {model.name} ({model.source})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[var(--eva-text)]/60 font-mono pt-2">
                      {browserModelOptions.find(m => m.id === selectedModel)?.description || 'Select a model to continue'}
                    </p>
                    
                    {!isModelLoaded && !isLoadingModel && (
                      <div className="pt-4">
                        <Button 
                          onClick={loadBrowserModel} 
                          className="w-full eva-button text-[var(--eva-orange)] font-mono uppercase tracking-wider"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          INITIALIZE MAGI SYSTEM
                        </Button>
                      </div>
                    )}
                    
                    {isLoadingModel && (
                      <div className="pt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-[var(--eva-green)] font-mono">{loadingMessage}</p>
                          <p className="text-xs text-[var(--eva-green)] font-mono">{loadingProgress}%</p>
                        </div>
                        <div className="bg-[var(--eva-blue)]/30 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-[var(--eva-green)] h-full transition-all duration-300 ease-in-out rounded-full"
                            style={{ width: `${loadingProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="popular" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 border border-[var(--eva-orange)] bg-opacity-20">
                    <TabsTrigger value="popular" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">MAGI DATABASE</TabsTrigger>
                    <TabsTrigger value="custom" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">CUSTOM PILOT</TabsTrigger>
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
                        ENTER CUSTOM PILOT IDENTIFIER (e.g., "anthropic/claude-3-opus-20240229"):
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
              )}
            </div>
          ) : (
            <div className="p-3 border border-[var(--eva-orange)]/40 rounded-md bg-black/20">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-[var(--eva-orange)] font-mono text-sm">
                    {isUsingBrowserModel 
                      ? (browserModelOptions.find(m => m.id === selectedModel)?.name || 'Loading...')
                      : (selectedModel === 'custom' 
                        ? customModel 
                        : popularModels.find(m => m.id === selectedModel)?.name || 'Loading...')}
                  </h4>
                  <p className="text-xs text-[var(--eva-text)]/60 font-mono mt-1">
                    {isUsingBrowserModel 
                      ? 'Local execution mode (WebLLM)'
                      : 'Remote execution mode (OpenRouter API)'}
                  </p>
                </div>
                <div className="text-[var(--eva-green)] bg-[var(--eva-green)]/10 border border-[var(--eva-green)]/20 px-2 py-1 rounded text-xs font-mono">
                  {isUsingBrowserModel ? 'LOCAL' : 'API'}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Generation Parameters */}
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
      </CardContent>
    </Card>
  );
};

export default ModelConfig;