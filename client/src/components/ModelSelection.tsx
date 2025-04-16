import { FC, useState } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Cpu, 
  Cloud, 
  Thermometer, 
  Crosshair, 
  CirclePlay, 
  Maximize, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useModelConfig } from '@/hooks/use-model-config';
import { useAuth } from '@/hooks/use-auth';

const ModelSelection: FC = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  // Get model configuration from context
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

  // Local tab state
  const [activeTab, setActiveTab] = useState<string>(isUsingBrowserModel ? 'local' : 'openrouter');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update model type in context
    if (value === 'local') {
      if (!isUsingBrowserModel) {
        setIsUsingBrowserModel(true);
        toast({
          title: 'Switched to Local Mode',
          description: 'Using browser-based models. No API key required.',
        });
      }
    } else {
      if (isUsingBrowserModel) {
        setIsUsingBrowserModel(false);
        toast({
          title: 'Switched to API Mode',
          description: 'Using OpenRouter API. API key required.',
        });
      }
    }
  };

  return (
    <Card className="mb-6 border border-[var(--eva-orange)] bg-black/40">
      <CardHeader className="border-b border-[var(--eva-orange)]/30 relative">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
        <div className="absolute top-1 left-4 font-mono text-[10px] text-[var(--eva-blue)] tracking-widest opacity-70">
          NERV-MAGI:PRIMARY
        </div>
        <div className="absolute top-1 right-4 font-mono text-[10px] text-[var(--eva-blue)] tracking-widest opacity-70">
          STATUS:OPERATIONAL
        </div>
        <CardTitle className="text-[var(--eva-orange)] font-mono uppercase tracking-wider pt-5">
          <div className="w-5 h-5 bg-[var(--eva-orange)] mr-2 inline-flex items-center justify-center">
            <div className="w-3 h-3 bg-black"></div>
          </div>
          MODEL CONTROL
        </CardTitle>
        <CardDescription className="font-mono text-xs text-[var(--eva-text)]/60">
          Configure model parameters and generation settings
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <Tabs 
          defaultValue={isUsingBrowserModel ? 'local' : 'openrouter'} 
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-8 border border-[var(--eva-orange)] bg-opacity-20">
            <TabsTrigger 
              value="openrouter" 
              className="flex items-center justify-center data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase"
            >
              <Cloud className="h-4 w-4 mr-2" />
              OPENROUTER API
            </TabsTrigger>
            <TabsTrigger 
              value="local" 
              className="flex items-center justify-center data-[state=active]:bg-[var(--eva-blue)] data-[state=active]:text-black font-mono uppercase"
            >
              <Cpu className="h-4 w-4 mr-2" />
              LOCAL MODELS
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="openrouter" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="model-select" className="font-mono text-[var(--eva-orange)]">
                    MODEL SELECTION
                  </Label>
                  
                  <Select
                    value={selectedModel}
                    onValueChange={(value) => {
                      setSelectedModel(value);
                      toast({
                        title: 'Model Selected',
                        description: `${popularModels.find(m => m.id === value)?.name || value}`,
                      });
                    }}
                  >
                    <SelectTrigger className="font-mono eva-input border-[var(--eva-orange)]/30 bg-black/40 w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="font-mono bg-black border-[var(--eva-orange)]/30">
                      {popularModels.map((model) => {
                        // Determine badge color and text based on model
                        let badgeColor = "";
                        let badgeText = "";
                        
                        if (model.id.includes("gemini-2.0-flash")) {
                          badgeColor = "bg-green-900/60 text-green-400";
                          badgeText = "FAST";
                        } else if (model.id.includes("quasar-alpha")) {
                          badgeColor = "bg-purple-900/60 text-purple-400";
                          badgeText = "UNIQUE";
                        } else if (model.id.includes("deepseek-chat-v3")) {
                          badgeColor = "bg-cyan-900/60 text-cyan-400";
                          badgeText = "PRECISE";
                        } else if (model.id.includes("deepseek-r1")) {
                          badgeColor = "bg-emerald-900/60 text-emerald-400";
                          badgeText = "REASONING";
                        } else if (model.id.includes("claude-3.5-sonnet")) {
                          badgeColor = "bg-blue-900/60 text-blue-400";
                          badgeText = "BALANCED";
                        } else if (model.id.includes("gpt-4o")) {
                          badgeColor = "bg-yellow-900/60 text-yellow-400";
                          badgeText = "VERSATILE";
                        } else if (model.id.includes("claude-3-opus")) {
                          badgeColor = "bg-red-900/60 text-red-400";
                          badgeText = "PREMIUM";
                        } else if (model.id.includes("gemini-1.5-pro")) {
                          badgeColor = "bg-indigo-900/60 text-indigo-400";
                          badgeText = "CONTEXT";
                        } else if (model.id.includes("llama-3-70b")) {
                          badgeColor = "bg-orange-900/60 text-orange-400";
                          badgeText = "POWERFUL";
                        } else if (model.id.includes("mistral-large")) {
                          badgeColor = "bg-teal-900/60 text-teal-400";
                          badgeText = "CAPABLE";
                        }
                        
                        return (
                          <SelectItem
                            key={model.id}
                            value={model.id}
                            className="font-mono"
                          >
                            <div className="flex flex-col w-full">
                              <div className="flex items-center justify-between">
                                <span>{model.name}</span>
                                {badgeText && (
                                  <span className={`px-1.5 py-0.5 ${badgeColor} text-[10px] rounded-sm ml-2`}>
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs opacity-60 mt-1">
                                {model.description}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                      <SelectItem value="custom" className="font-mono">
                        <div className="flex flex-col">
                          <span>Custom Model</span>
                          <span className="text-xs opacity-60">
                            Use a specific model ID
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedModel === 'custom' && (
                    <div className="pt-2">
                      <Label htmlFor="custom-model" className="font-mono text-xs text-[var(--eva-orange)]">
                        CUSTOM MODEL ID
                      </Label>
                      <Input
                        id="custom-model"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="Enter custom model ID (e.g., openrouter/quasar-alpha)"
                        className="font-mono eva-input border-[var(--eva-orange)]/30 bg-black/40"
                      />
                    </div>
                  )}
                </div>
                
                {selectedModel !== 'custom' && (
                  <div className="mt-4 border border-[var(--eva-orange)]/30 rounded-md p-3 bg-black/20">
                    <div className="font-mono text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[var(--eva-orange)]">MODEL:</span>
                        <span className="text-[var(--eva-text)]">
                          {popularModels.find(m => m.id === selectedModel)?.name || selectedModel}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--eva-orange)]">CONTEXT:</span>
                        <span className="text-[var(--eva-text)]">
                          {popularModels.find(m => m.id === selectedModel)?.contextSize || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--eva-orange)]">PRICING:</span>
                        <span className="text-[var(--eva-text)]">
                          {popularModels.find(m => m.id === selectedModel)?.pricing || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-mono text-[var(--eva-orange)] flex items-center">
                    <Thermometer className="h-3 w-3 mr-1 text-[var(--eva-orange)]" />
                    TEMPERATURE: {temperature.toFixed(2)}
                  </Label>
                  <Slider
                    value={[temperature]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={(values) => setTemperature(values[0])}
                    className="eva-slider"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-mono text-[var(--eva-orange)] flex items-center">
                    <Crosshair className="h-3 w-3 mr-1 text-[var(--eva-orange)]" />
                    TOP-P: {topP.toFixed(2)}
                  </Label>
                  <Slider
                    value={[topP]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={(values) => setTopP(values[0])}
                    className="eva-slider"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-mono text-[var(--eva-orange)] flex items-center">
                    <Maximize className="h-3 w-3 mr-1 text-[var(--eva-orange)]" />
                    MAX TOKENS: {maxTokens}
                  </Label>
                  <Slider
                    value={[maxTokens]}
                    min={100}
                    max={4000}
                    step={100}
                    onValueChange={(values) => setMaxTokens(values[0])}
                    className="eva-slider"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              {!isAuthenticated ? (
                <Alert className="border border-[var(--eva-orange)]/30 bg-black/20">
                  <AlertTriangle className="h-4 w-4 text-[var(--eva-orange)]" />
                  <AlertTitle className="text-[var(--eva-orange)] font-mono">
                    API KEY REQUIRED
                  </AlertTitle>
                  <AlertDescription className="text-xs font-mono">
                    OpenRouter API mode requires authentication. Please provide your API key in the interface above.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border border-[var(--eva-green)]/30 bg-black/20">
                  <CheckCircle className="h-4 w-4 text-[var(--eva-green)]" />
                  <AlertTitle className="text-[var(--eva-green)] font-mono">
                    AUTHENTICATION ACTIVE
                  </AlertTitle>
                  <AlertDescription className="text-xs font-mono">
                    API key authenticated. You can now use all available models.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="local" className="space-y-4">
            <Alert className="border border-[var(--eva-blue)] bg-black/20">
              <Cpu className="h-4 w-4 text-[var(--eva-blue)]" />
              <AlertTitle className="text-[var(--eva-blue)] font-mono">
                LOCAL MODEL MODE
              </AlertTitle>
              <AlertDescription className="text-xs font-mono">
                Browser-based models run directly in your browser. No API calls, no API keys required.
                Models will be downloaded the first time they are used (~4GB).
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-[var(--eva-blue)]">
                  AVAILABLE LOCAL MODELS
                </Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {browserModelOptions.map((model) => (
                    <Button
                      key={model.id}
                      variant={selectedModel === model.id ? "default" : "outline"}
                      size="sm"
                      className={`justify-start font-mono ${
                        selectedModel === model.id 
                          ? "bg-[var(--eva-blue)] hover:bg-[var(--eva-blue)]/80 text-black" 
                          : "border-[var(--eva-blue)]/30 text-[var(--eva-blue)]"
                      }`}
                      onClick={() => {
                        setSelectedModel(model.id);
                        toast({
                          title: 'Local Model Selected',
                          description: model.name,
                        });
                      }}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span>{model.name}</span>
                        <span className="text-xs opacity-70 mt-1">{model.description}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="font-mono text-[var(--eva-blue)]">
                    LOCAL MODEL PARAMETERS
                  </Label>
                  
                  <div className="space-y-2 mt-2">
                    <div className="space-y-2">
                      <Label className="font-mono text-[var(--eva-blue)] flex items-center text-xs">
                        <Thermometer className="h-3 w-3 mr-1 text-[var(--eva-blue)]" />
                        TEMPERATURE: {temperature.toFixed(2)}
                      </Label>
                      <Slider
                        value={[temperature]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={(values) => setTemperature(values[0])}
                        className="eva-slider"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="font-mono text-[var(--eva-blue)] flex items-center text-xs">
                        <Crosshair className="h-3 w-3 mr-1 text-[var(--eva-blue)]" />
                        TOP-P: {topP.toFixed(2)}
                      </Label>
                      <Slider
                        value={[topP]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={(values) => setTopP(values[0])}
                        className="eva-slider"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="font-mono text-[var(--eva-blue)] flex items-center text-xs">
                        <Maximize className="h-3 w-3 mr-1 text-[var(--eva-blue)]" />
                        MAX TOKENS: {maxTokens}
                      </Label>
                      <Slider
                        value={[maxTokens]}
                        min={100}
                        max={2000}
                        step={100}
                        onValueChange={(values) => setMaxTokens(values[0])}
                        className="eva-slider"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={isUsingBrowserModel}
                    onCheckedChange={setIsUsingBrowserModel}
                    className="data-[state=checked]:bg-[var(--eva-blue)]"
                  />
                  <Label className="font-mono text-xs text-[var(--eva-blue)]">
                    BROWSER-BASED EXECUTION ENABLED
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ModelSelection;