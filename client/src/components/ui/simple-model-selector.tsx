import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Thermometer, 
  Crosshair, 
  Maximize, 
  CloudLightning, 
  Cpu,
  Zap,
  BadgeInfo
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useModels } from '@/hooks/use-models';
import { toast } from '@/hooks/use-toast';
import { useSimplifiedAuth } from '@/hooks/simplified-auth';

/**
 * Simple model selector component with optimized code structure
 * - Uses custom hooks for authentication and model selection
 * - Clearly separated UI sections
 * - Simplified event handlers
 */
export function SimpleModelSelector() {
  const { 
    isAuthenticated, 
    method
  } = useSimplifiedAuth();

  const {
    browserModels,
    cloudModels,
    selectedModelId,
    isUsingBrowserModel,
    temperature,
    topP,
    maxTokens,
    selectModel,
    toggleBrowserModel,
    updateParameters
  } = useModels();

  // Show appropriate tab based on model selection
  const activeTab = isUsingBrowserModel ? 'local' : 'cloud';
  
  // Event handlers for parameters
  const handleTemperatureChange = (values: number[]) => {
    updateParameters({ temperature: values[0] });
  };
  
  const handleTopPChange = (values: number[]) => {
    updateParameters({ topP: values[0] });
  };
  
  const handleMaxTokensChange = (values: number[]) => {
    updateParameters({ maxTokens: values[0] });
  };

  return (
    <Card className="border-[var(--eva-orange)]/40 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-[var(--eva-orange)] font-mono flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          MODEL SELECTION
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => toggleBrowserModel(value === 'local')}>
          <TabsList className="grid grid-cols-2 mb-4 bg-black/40 border border-[var(--eva-orange)]/30">
            <TabsTrigger 
              value="cloud" 
              className={activeTab === 'cloud' ? 'data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black' : 'text-[var(--eva-orange)]'}
            >
              <CloudLightning className="h-4 w-4 mr-2" />
              <span>Cloud Models</span>
            </TabsTrigger>
            <TabsTrigger 
              value="local" 
              className={activeTab === 'local' ? 'data-[state=active]:bg-[var(--eva-blue)] data-[state=active]:text-black' : 'text-[var(--eva-blue)]'}
            >
              <Cpu className="h-4 w-4 mr-2" />
              <span>Browser Models</span>
            </TabsTrigger>
          </TabsList>
          
          {/* CLOUD MODELS */}
          <TabsContent value="cloud" className="space-y-4">
            {!isAuthenticated && (
              <div className="p-4 border border-[var(--eva-orange)]/30 bg-black/20 rounded-md flex items-center text-[var(--eva-orange)] mb-4">
                <BadgeInfo className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">
                  Authentication required for cloud models. Use the auth menu in the header.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-[var(--eva-orange)]">
                  CLOUD MODELS
                </Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {cloudModels.map((model) => (
                    <ModelButton
                      key={model.id}
                      id={model.id}
                      name={model.name}
                      description={model.description}
                      isSelected={selectedModelId === model.id}
                      onSelect={() => {
                        selectModel(model.id);
                        toast({
                          title: 'Model Selected',
                          description: model.name,
                        });
                      }}
                      theme="orange"
                      isDisabled={!isAuthenticated || method === 'browser'}
                    />
                  ))}
                </div>
              </div>
              
              {/* PARAMETER CONTROLS */}
              <ParameterControls 
                theme="orange"
                temperature={temperature}
                topP={topP}
                maxTokens={maxTokens}
                onTemperatureChange={handleTemperatureChange}
                onTopPChange={handleTopPChange}
                onMaxTokensChange={handleMaxTokensChange}
                isDisabled={!isAuthenticated || method === 'browser'}
              />
            </div>
          </TabsContent>
          
          {/* BROWSER MODELS */}
          <TabsContent value="local" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-[var(--eva-blue)]">
                  BROWSER MODELS
                </Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {browserModels.map((model) => (
                    <ModelButton
                      key={model.id}
                      id={model.id}
                      name={model.name}
                      description={model.description}
                      isSelected={selectedModelId === model.id}
                      onSelect={() => {
                        selectModel(model.id);
                        toast({
                          title: 'Local Model Selected',
                          description: model.name,
                        });
                      }}
                      theme="blue"
                    />
                  ))}
                </div>
              </div>
              
              {/* PARAMETER CONTROLS */}
              <ParameterControls 
                theme="blue"
                temperature={temperature}
                topP={topP}
                maxTokens={maxTokens}
                onTemperatureChange={handleTemperatureChange}
                onTopPChange={handleTopPChange}
                onMaxTokensChange={handleMaxTokensChange}
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={isUsingBrowserModel}
                onCheckedChange={toggleBrowserModel}
                className="data-[state=checked]:bg-[var(--eva-blue)]"
              />
              <Label className="font-mono text-xs text-[var(--eva-blue)]">
                BROWSER-BASED EXECUTION ENABLED
              </Label>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Reusable model button component
interface ModelButtonProps {
  id: string;
  name: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
  theme: 'orange' | 'blue';
  isDisabled?: boolean;
}

function ModelButton({ 
  id, 
  name, 
  description, 
  isSelected, 
  onSelect, 
  theme,
  isDisabled = false
}: ModelButtonProps) {
  const color = theme === 'orange' ? 'var(--eva-orange)' : 'var(--eva-blue)';
  
  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      size="sm"
      className={`justify-start font-mono ${
        isSelected 
          ? `bg-[${color}] hover:bg-[${color}]/80 text-black` 
          : `border-[${color}]/30 text-[${color}]`
      }`}
      onClick={onSelect}
      disabled={isDisabled}
    >
      <div className="flex flex-col items-start text-left">
        <span>{name}</span>
        <span className="text-xs opacity-70 mt-1">{description}</span>
      </div>
    </Button>
  );
}

// Reusable parameter controls component
interface ParameterControlsProps {
  theme: 'orange' | 'blue';
  temperature: number;
  topP: number;
  maxTokens: number;
  onTemperatureChange: (values: number[]) => void;
  onTopPChange: (values: number[]) => void;
  onMaxTokensChange: (values: number[]) => void;
  isDisabled?: boolean;
}

function ParameterControls({
  theme,
  temperature,
  topP,
  maxTokens,
  onTemperatureChange,
  onTopPChange,
  onMaxTokensChange,
  isDisabled = false
}: ParameterControlsProps) {
  const color = theme === 'orange' ? 'var(--eva-orange)' : 'var(--eva-blue)';
  
  return (
    <div className="space-y-4">
      <div>
        <Label className={`font-mono text-[${color}]`}>
          MODEL PARAMETERS
        </Label>
        
        <div className="space-y-2 mt-2">
          <TooltipProvider>
            <div className="space-y-2">
              <Label className={`font-mono text-[${color}] flex items-center text-xs`}>
                <Thermometer className={`h-3 w-3 mr-1 text-[${color}]`} />
                TEMPERATURE: {temperature.toFixed(2)}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Slider
                    value={[temperature]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={onTemperatureChange}
                    className="eva-slider"
                    disabled={isDisabled}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="w-80 p-2 bg-black text-xs">
                  Controls randomness: Higher values produce more creative outputs, lower values are more deterministic.
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="space-y-2">
              <Label className={`font-mono text-[${color}] flex items-center text-xs`}>
                <Crosshair className={`h-3 w-3 mr-1 text-[${color}]`} />
                TOP-P: {topP.toFixed(2)}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Slider
                    value={[topP]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={onTopPChange}
                    className="eva-slider"
                    disabled={isDisabled}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="w-80 p-2 bg-black text-xs">
                  Controls diversity: Only consider tokens with this cumulative probability. Lower values stay closer to high-confidence options.
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="space-y-2">
              <Label className={`font-mono text-[${color}] flex items-center text-xs`}>
                <Maximize className={`h-3 w-3 mr-1 text-[${color}]`} />
                MAX TOKENS: {maxTokens}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Slider
                    value={[maxTokens]}
                    min={100}
                    max={2000}
                    step={100}
                    onValueChange={onMaxTokensChange}
                    className="eva-slider"
                    disabled={isDisabled}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="w-80 p-2 bg-black text-xs">
                  Maximum number of tokens to generate. One token is roughly 4 characters or 3/4 of a word.
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}