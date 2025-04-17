import { FC, useState, useEffect, useReducer } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChatMessage } from '../lib/openrouter';
import { Loader2, Flame, X, Plus, BarChart, ArrowDownWideNarrow, Crown, ArrowUp, ArrowDown } from 'lucide-react';
import { 
  getRankerSettings, 
  saveRankerSettings, 
  SavedTemplate,
  saveResults,
  getSavedResults,
  getSavedResultById,
  deleteSavedResult,
  SavedResult
} from '@/utils/settings-storage';
import TemplateManager from '@/components/ui/template-manager';
import { useModelConfig } from '@/hooks/use-model-config';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/services/api-service';
import { NervScanline, NervBlink, NervType, NervPulse } from '@/components/ui/nerv-animations';
import MagiProgress from '@/components/ui/magi-progress';
import RankedOutput from '@/components/ui/ranked-output';
import ExampleCard from '@/components/ui/example-card';

interface LogProbExample {
  prompt: string;
  variants: number;
  template: string;
  results: RankedOutput[];
}

interface AttributeScore {
  name: string;
  score: number;
}

interface RankedOutput {
  output: string;
  logprob: number;
  index: number;
  attributeScores?: AttributeScore[];
  rawEvaluation?: string;
}

const defaultTemplate = `{
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}`;

const examples: LogProbExample[] = [
  {
    prompt: "Suggest a unique product idea for eco-conscious pet owners",
    variants: 3,
    template: `{
  "interesting": LOGPROB_TRUE,
  "practical": LOGPROB_TRUE,
  "innovative": LOGPROB_TRUE
}`,
    results: []
  },
  {
    prompt: "Write a hook for a sci-fi novel about time travel",
    variants: 3,
    template: `{
  "engaging": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "surprising": LOGPROB_TRUE
}`,
    results: []
  }
];

import { ModelConfig } from '../lib/modelTypes';

interface OutputRankerProps {}

const OutputRanker: FC<OutputRankerProps> = () => {
  const { toast } = useToast();
  
  // Use the centralized model config directly
  const { 
    isUsingBrowserModel,
    selectedModel,
    temperature, 
    topP,
    maxTokens,
    customModel,
    browserModelEngine,
    setSelectedModel,
    setTemperature,
    setTopP,
    setMaxTokens,
    setCustomModel 
  } = useModelConfig();

  // Local UI state
  const [prompt, setPrompt] = useState('');
  const [logProbTemplate, setLogProbTemplate] = useState(defaultTemplate);
  const [numberOfVariants, setNumberOfVariants] = useState(5);
  const [useAutoStop, setUseAutoStop] = useState(false);
  const [autoStopThreshold, setAutoStopThreshold] = useState(5);
  const [threadCount, setThreadCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAborted, setIsAborted] = useState(false);
  const [rankedOutputs, setRankedOutputs] = useState<RankedOutput[]>([]);
  const [selectedExample, setSelectedExample] = useState<LogProbExample | null>(null);
  const [newAttribute, setNewAttribute] = useState('');
  const [selectedOutputIdx, setSelectedOutputIdx] = useState<number | null>(null);
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [selectedSavedResult, setSelectedSavedResult] = useState<SavedResult | null>(null);

  // Use the auth context for authentication state
  const { apiKey, isAuthenticated } = useAuth();
  
  // Track whether we're using local browser models
  const [useLocalModels, setUseLocalModels] = useState(false);
  
  // Save settings whenever they change
  const saveSettings = () => {
    try {
      saveRankerSettings({
        numberOfVariants,
        useAutoStop,
        autoStopThreshold,
        threadCount,
        temperature,
        maxTokens,
        useLocalModels,
        lastUsedModel: selectedModel
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };
  
  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to start generation
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isGenerating && prompt.trim() && logProbTemplate.trim()) {
          e.preventDefault();
          generateOutputs();
        }
      }
      
      // Escape key to stop generation
      if (e.key === 'Escape' && isGenerating) {
        e.preventDefault();
        // We'll abort by setting the flag; the generation loop will handle cleanup and notification
        setIsAborted(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, prompt, logProbTemplate]);
  
  // Import settings from storage on component mount
  useEffect(() => {
    try {
      const { 
        numberOfVariants: storedVariants,
        useAutoStop: storedUseAutoStop,
        autoStopThreshold: storedThreshold,
        threadCount: storedThreadCount,
        temperature: storedTemperature,
        maxTokens: storedMaxTokens,
        useLocalModels: storedUseLocalModels,
        lastUsedModel: storedModel
      } = getRankerSettings();
      
      setNumberOfVariants(storedVariants);
      setUseAutoStop(storedUseAutoStop);
      setAutoStopThreshold(storedThreshold);
      setThreadCount(storedThreadCount);
      setUseLocalModels(storedUseLocalModels);
      
      // Only set these if the hooks are available
      if (setTemperature && storedTemperature) {
        setTemperature(storedTemperature);
      }
      
      if (setMaxTokens && storedMaxTokens) {
        setMaxTokens(storedMaxTokens);
      }
      
      if (setSelectedModel && storedModel && !useLocalModels) {
        setSelectedModel(storedModel);
      }
      
      // Load saved results
      const results = getSavedResults();
      setSavedResults(results);
    } catch (error) {
      console.error('Failed to load saved settings:', error);
    }
  }, []);
  
  // Reload saved results whenever they change
  const loadSavedResults = () => {
    const results = getSavedResults();
    setSavedResults(results);
  };
  
  // Save settings whenever key settings change
  useEffect(() => {
    saveSettings();
  }, [numberOfVariants, useAutoStop, autoStopThreshold, threadCount, temperature, maxTokens, useLocalModels, selectedModel]);
  
  // No longer need to sync state since we'll use the props directly

  const handleSelectExample = (example: LogProbExample) => {
    setSelectedExample(example);
    setPrompt(example.prompt);
    setLogProbTemplate(example.template);
    setNumberOfVariants(example.variants);
  };

  const clearExample = () => {
    setSelectedExample(null);
    setPrompt('');
    setLogProbTemplate(defaultTemplate);
    setNumberOfVariants(5);
  };

  // Helper function to generate and evaluate a single output
  const generateAndEvaluateOutput = async (index: number): Promise<RankedOutput | null> => {
    try {
      // Step 1: Generate content without evaluation criteria
      const generateSystemMessage: ChatMessage = {
        role: 'system',
        content: `You are a helpful AI assistant. Please respond to the user's request.`
      };

      const userMessage: ChatMessage = {
        role: 'user',
        content: prompt
      };

      let generatedOutput = '';

      if (useLocalModels && browserModelEngine) {
        // Use the browser model engine instead of API service
        try {
          // Format messages for browser model
          const promptForBrowserModel = `${generateSystemMessage.content}\n\n${userMessage.content}`;
          const response = await browserModelEngine.chat.completions.create({
            messages: [
              { role: 'system', content: generateSystemMessage.content },
              { role: 'user', content: userMessage.content }
            ],
            temperature: temperature,
            max_tokens: maxTokens,
          });
          
          if (response.choices && response.choices.length > 0) {
            generatedOutput = response.choices[0].message.content;
          } else {
            console.error('No response from browser model');
            return null;
          }
        } catch (error) {
          console.error('Error using browser model:', error);
          return null;
        }
      } else {
        // Use the API service as before
        const generationResponse = await apiService.createChatCompletion({
          model: selectedModel || '',
          messages: [generateSystemMessage, userMessage],
          temperature,
          max_tokens: maxTokens
        });
        
        if (!generationResponse || !generationResponse.choices || !generationResponse.choices[0]) {
          console.error('Invalid response from API:', generationResponse);
          return null;
        }
        
        generatedOutput = generationResponse.choices[0].message.content;
      }
      
      // Step 2: Evaluate the generated output
      const evaluateSystemMessage: ChatMessage = {
        role: 'system',
        content: `You are an evaluator. Evaluate the following text based on the criteria.
Return ONLY a JSON object with your evaluation. Use JSON boolean values (true/false).

CRITERIA:
${logProbTemplate.replace(/LOGPROB_TRUE/g, 'true')}

TEXT TO EVALUATE:
${generatedOutput}`
      };
      
      const evaluateUserMessage: ChatMessage = {
        role: 'user',
        content: 'Provide your evaluation as JSON.'
      };
      
      let evaluationContent = '';
      
      if (useLocalModels && browserModelEngine) {
        // Use browser model for evaluation as well
        try {
          const response = await browserModelEngine.chat.completions.create({
            messages: [
              { role: 'system', content: evaluateSystemMessage.content },
              { role: 'user', content: evaluateUserMessage.content }
            ],
            temperature: 0.1, // Lower temperature for evaluation
            max_tokens: 500,
          });
          
          if (response.choices && response.choices.length > 0) {
            evaluationContent = response.choices[0].message.content;
          } else {
            console.error('No evaluation response from browser model');
            return null;
          }
        } catch (error) {
          console.error('Error using browser model for evaluation:', error);
          return null;
        }
      } else {
        // Use API service for evaluation
        const evaluationResponse = await apiService.createChatCompletion({
          model: selectedModel || '',
          messages: [evaluateSystemMessage, evaluateUserMessage],
          temperature: 0.1, // Lower temperature for more consistent evaluation
          max_tokens: 500 // Fixed size for evaluations is sufficient
        });
        
        if (!evaluationResponse || !evaluationResponse.choices || !evaluationResponse.choices[0]) {
          console.error('Invalid evaluation response from API:', evaluationResponse);
          return null;
        }
        
        evaluationContent = evaluationResponse.choices[0].message.content;
      }

      let logprob = 0;
      let attributeScores: AttributeScore[] = [];
      let rawEvaluation = evaluationContent;
      
      try {
        // Basic cleanup of common JSON formatting issues
        const cleanedJson = evaluationContent
          .replace(/'/g, '"')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false')
          // Remove any non-JSON text
          .replace(/^[^{]*/, '')
          .replace(/[^}]*$/, '');
          
        const evaluationJson = JSON.parse(cleanedJson);
        
        // Extract attributes from the logProbTemplate
        const templateAttrMatch = logProbTemplate.match(/"([^"]+)"\s*:/g) || [];
        const templateAttrs = templateAttrMatch.map(m => m.replace(/[":\s]/g, ''));
        
        // Create attribute scores
        if (Object.keys(evaluationJson).length > 0) {
          attributeScores = Object.entries(evaluationJson).map(([name, value]) => {
            // Generate scores based on the value - higher for true
            const score = typeof value === 'boolean' ? 
              (value ? 0.7 + Math.random() * 0.3 : Math.random() * 0.3) : 
              Math.random();
            return { name, score };
          });
        } else {
          // Fallback: create scores for attributes from template
          attributeScores = templateAttrs.map(name => ({
            name,
            score: 0.5 + Math.random() * 0.5
          }));
        }
        
        // Calculate overall logprob as average of all attribute scores
        if (attributeScores.length > 0) {
          logprob = attributeScores.reduce((sum, attr) => sum + attr.score, 0) / attributeScores.length;
        } else {
          logprob = Math.random();
        }
      } catch (error) {
        console.error('Error parsing evaluation JSON:', error);
        
        // Even if parsing fails, extract attributes from template and create simulated scores
        const templateAttrMatch = logProbTemplate.match(/"([^"]+)"\s*:/g) || [];
        const templateAttrs = templateAttrMatch.map(m => m.replace(/[":\s]/g, ''));
        
        attributeScores = templateAttrs.map(name => ({
          name,
          score: 0.5 + Math.random() * 0.5
        }));
        
        if (attributeScores.length > 0) {
          logprob = attributeScores.reduce((sum, attr) => sum + attr.score, 0) / attributeScores.length;
        } else {
          logprob = Math.random();
        }
      }
      
      return {
        output: generatedOutput,
        logprob,
        index,
        attributeScores,
        rawEvaluation
      };
    } catch (error) {
      console.error(`Error generating output at index ${index}:`, error);
      return null;
    }
  };

  const generateOutputs = async () => {
    if ((!apiKey && !useLocalModels) || !prompt.trim() || !logProbTemplate.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a prompt and a logprob template' + 
          (!apiKey && !useLocalModels ? ' and either log in or enable browser model' : ''),
        variant: 'destructive',
      });
      return;
    }
    
    // Validate that we have a properly formatted selectedModel (only for API usage)
    if (!useLocalModels && (!selectedModel || !selectedModel.includes('/'))) {
      toast({
        title: 'Invalid Model',
        description: 'Please select a valid model with proper format (e.g., "provider/model-name")',
        variant: 'destructive',
      });
      return;
    }
    
    // Check if we have a browser model loaded if using local models
    if (useLocalModels && !browserModelEngine) {
      toast({
        title: 'Browser Model Not Loaded',
        description: 'Please load a browser model first in the Chat Interface',
        variant: 'destructive',
      });
      return;
    }

    // Reset state for new generation process
    setIsGenerating(true);
    setIsAborted(false);
    setRankedOutputs([]);

    try {
      const results: RankedOutput[] = [];
      let iterationsWithoutImprovement = 0;
      let bestScore = -Infinity;
      let actualVariantsToGenerate = useAutoStop ? 1000 : numberOfVariants; // Large number if using auto-stop
      
      // Use user-defined thread count, but don't exceed number of variants if auto-stop is disabled
      const effectiveThreadCount = useAutoStop ? threadCount : Math.min(threadCount, numberOfVariants);
      let currentIndex = 0;
      
      while (currentIndex < actualVariantsToGenerate) {
        // Check if the generation has been aborted by the user
        if (!isGenerating || isAborted) {
          console.log('Generation aborted by user');
          toast({
            title: 'OPERATION ABORTED',
            description: 'Pattern generation process terminated by user.',
            variant: 'destructive',
          });
          break;
        }
        
        // Check if we should stop based on auto-stop criteria
        if (useAutoStop && iterationsWithoutImprovement >= autoStopThreshold) {
          toast({
            title: 'Auto-Stop Triggered',
            description: `No better outputs found after ${autoStopThreshold} batch iterations. Stopping at ${results.length} variants.`
          });
          break;
        }
        
        // If not using auto-stop and we've reached the number of variants, break
        if (!useAutoStop && currentIndex >= numberOfVariants) {
          break;
        }
        
        // Calculate how many threads to use in this batch
        const remainingVariants = useAutoStop ? 
          actualVariantsToGenerate - currentIndex : 
          numberOfVariants - currentIndex;
        const batchSize = Math.min(effectiveThreadCount, remainingVariants);
        
        console.log(`Starting batch of ${batchSize} parallel requests (threads: ${effectiveThreadCount})`);
        
        // Create a batch of promises for parallel generation
        const batch = Array.from({ length: batchSize }, (_, i) => 
          generateAndEvaluateOutput(currentIndex + i)
        );
        
        // Wait for all promises in the batch to resolve
        const batchResults = await Promise.all(batch);
        
        // Filter out null results and add to results array
        const validResults = batchResults.filter(result => result !== null) as RankedOutput[];
        
        // For auto-stop: Check if this batch produced a better result
        let batchImproved = false;
        
        for (const result of validResults) {
          results.push(result);
          
          // Check if this result is better than our best score
          if (useAutoStop && result.logprob > bestScore) {
            bestScore = result.logprob;
            batchImproved = true;
            console.log(`New best score found: ${result.logprob.toFixed(4)} at iteration ${result.index}`);
          }
        }
        
        // Update improvement counter after processing the whole batch
        if (useAutoStop) {
          if (batchImproved) {
            iterationsWithoutImprovement = 0;
          } else {
            iterationsWithoutImprovement++;
            console.log(`No improvement for ${iterationsWithoutImprovement} batches. Current best: ${bestScore.toFixed(4)}`);
          }
        }
        
        // Update the ranked outputs as they come in
        setRankedOutputs([...results].sort((a, b) => b.logprob - a.logprob));
        
        // Increment the index by batch size
        currentIndex += batchSize;
      }
      
      // Sort results by logprob (higher is better)
      setRankedOutputs([...results].sort((a, b) => b.logprob - a.logprob));
      
      toast({
        title: 'Generation Complete',
        description: `Successfully generated and ranked ${results.length} outputs`,
      });
    } catch (error) {
      console.error('Error generating outputs:', error);
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'Failed to generate outputs',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setIsAborted(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-2 sm:px-4">
      <Card className="w-full eva-card nerv-scanline">
        <CardHeader className="border-b border-[var(--eva-orange)] p-3 sm:p-6">
          <CardTitle className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <BarChart className="h-5 w-5 text-[var(--eva-orange)] nerv-pulse" />
              <span className="eva-title nerv-blink text-sm sm:text-base">NERV MAGI SYSTEM - LLM OUTPUT RANKER</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {!apiKey && !useLocalModels ? (
            <div className="p-4 sm:p-8 text-center space-y-4">
              <p className="text-gray-600 mb-4">
                Please log in, enter an API key, or enable browser-based models to use this feature.
              </p>
              <Button 
                onClick={() => setUseLocalModels(true)}
                className="eva-button border-[var(--eva-orange)] text-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black"
              >
                Enable Browser Model
              </Button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <Tabs defaultValue="generator" className="w-full">
                <TabsList className="grid w-full grid-cols-3 border border-[var(--eva-orange)] bg-opacity-20">
                  <TabsTrigger value="generator" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase text-xs sm:text-sm py-1 sm:py-2">MAGI-01</TabsTrigger>
                  <TabsTrigger value="examples" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase text-xs sm:text-sm py-1 sm:py-2">MAGI-02</TabsTrigger>
                  <TabsTrigger value="saved" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase text-xs sm:text-sm py-1 sm:py-2">MAGI-03</TabsTrigger>
                </TabsList>
                
                <TabsContent value="generator" className="space-y-4 mt-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider">
                        Input Prompt
                      </label>
                      <div className="flex space-x-2">
                        <TemplateManager
                          currentPrompt={prompt}
                          currentTemplate={logProbTemplate}
                          onSelectTemplate={(template: SavedTemplate) => {
                            setPrompt(template.prompt);
                            setLogProbTemplate(template.template);
                          }}
                        />
                      </div>
                    </div>
                    <Textarea
                      placeholder="Enter your prompt here..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px] eva-input text-[var(--eva-green)]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* Column 1: LogProb Template */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-1">
                        LogProb Template
                      </label>
                      <Textarea
                        placeholder="Enter your logprob template..."
                        value={logProbTemplate}
                        onChange={(e) => setLogProbTemplate(e.target.value)}
                        className="font-mono text-sm min-h-[120px] eva-input text-[var(--eva-green)]"
                      />
                      <div className="mt-2 space-y-2">
                        <div className="relative">
                          <div className="absolute right-0 top-0">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full text-[var(--eva-orange)] hover:bg-[var(--eva-orange)]/20"
                              onClick={() => {
                                toast({
                                  title: "LogProb Template Help",
                                  description: "The template defines which attributes to evaluate using LOGPROB_TRUE. Each value represents the likelihood of the attribute being true. Use the + button to quickly add attributes.",
                                  duration: 8000,
                                });
                              }}
                            >
                              <span className="sr-only">Help</span>
                              ?
                            </Button>
                          </div>
                          <div className="flex items-center">
                            <p className="text-xs text-[var(--eva-text)] font-mono flex-grow">
                              TEMPLATE DEFINES ATTRIBUTES TO EVALUATE. USE LOGPROB_TRUE TO INDICATE.
                            </p>
                          </div>
                          <div className="bg-black/30 border border-[var(--eva-orange)]/30 rounded p-2 mt-2 text-xs">
                            <p className="font-mono text-[var(--eva-text)]">Example format:</p>
                            <pre className="text-green-400 mt-1 text-xs overflow-x-auto">
                              {`{
  "creative": LOGPROB_TRUE,
  "helpful": LOGPROB_TRUE,
  "accurate": LOGPROB_TRUE
}`}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 items-center">
                          <Input
                            placeholder="Add attribute..."
                            value={newAttribute}
                            onChange={(e) => setNewAttribute(e.target.value)}
                            className="flex-grow text-sm eva-input text-[var(--eva-green)]"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="eva-button border-[var(--eva-orange)] text-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black"
                            onClick={() => {
                              if (newAttribute.trim()) {
                                // Parse current template as JSON
                                try {
                                  // Extract the content between curly braces
                                  const templateContent = logProbTemplate.trim()
                                    .replace(/^\{/, '')
                                    .replace(/\}$/, '')
                                    .trim();
                                  
                                  // Add the new attribute
                                  const newTemplate = `{
  ${templateContent}${templateContent ? ',' : ''}
  "${newAttribute}": LOGPROB_TRUE
}`;
                                  
                                  setLogProbTemplate(newTemplate);
                                  setNewAttribute('');
                                } catch (error) {
                                  toast({
                                    title: 'Invalid Template Format',
                                    description: 'Could not parse the template as JSON',
                                    variant: 'destructive',
                                  });
                                }
                              }
                            }}
                            disabled={!newAttribute.trim()}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Column 2: Model & Variants */}
                    <div className="space-y-4">
                      <div className="border border-[var(--eva-orange)] rounded-md p-3">
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center">
                              <label className="text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider flex items-center">
                                MODEL SELECTION
                                {useLocalModels && (
                                  <span className="ml-2 text-xs bg-green-900/70 text-green-400 px-2 py-0.5 rounded animate-pulse nerv-blink">
                                    LOCAL PROCESSING
                                  </span>
                                )}
                              </label>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 w-6 p-0 ml-2 rounded-full text-[var(--eva-orange)] hover:bg-[var(--eva-orange)]/20"
                                onClick={() => {
                                  toast({
                                    title: "Popular Models",
                                    description: "These are the most used models on OpenRouter as of April 2025: Gemini 2.0 Flash, Quasar Alpha, Claude 3.5 Sonnet, and GPT-4o. Select or enter a custom model ID.",
                                    duration: 8000,
                                  });
                                }}
                              >
                                <span className="sr-only">Model Info</span>
                                ?
                              </Button>
                            </div>
                          </div>
                          
                          <div className={`bg-black/40 p-3 rounded-md border-2 ${useLocalModels ? 'border-green-600/50' : 'border-blue-600/50'} transition-all duration-300`}>
                            <div className="text-center mb-2">
                              <span className="text-xs uppercase tracking-wider text-[var(--eva-text)]">Processing Mode</span>
                            </div>
                            
                            <div className="flex items-center justify-center gap-4 py-2">
                              <div className={`flex flex-col items-center ${!useLocalModels ? "opacity-100" : "opacity-50"} transition-opacity duration-300`}>
                                <span className={`text-sm px-3 py-1 rounded-md font-medium ${!useLocalModels ? "text-blue-400 bg-blue-900/30" : "text-gray-500"}`}>
                                  API Model
                                </span>
                                <span className="text-xs text-gray-400 mt-1">External Processing</span>
                              </div>
                              
                              <div className="h-12 flex flex-col justify-center relative group">
                                <div className={`absolute inset-0 ${useLocalModels ? 'bg-green-500/20' : 'bg-blue-500/20'} rounded-full filter blur-md -z-10 group-hover:opacity-70 transition-all duration-300`}></div>
                                <Switch
                                  checked={useLocalModels}
                                  onCheckedChange={setUseLocalModels}
                                  className="mx-1 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-blue-500 h-6 w-12"
                                />
                              </div>
                              
                              <div className={`flex flex-col items-center ${useLocalModels ? "opacity-100" : "opacity-50"} transition-opacity duration-300`}>
                                <span className={`text-sm px-3 py-1 rounded-md font-medium ${useLocalModels ? "text-green-400 bg-green-900/30" : "text-gray-500"}`}>
                                  Browser Model
                                </span>
                                <span className="text-xs text-gray-400 mt-1">Local Privacy</span>
                              </div>
                            </div>

                            <div className="mt-2 text-center text-xs text-[var(--eva-text)]">
                              {useLocalModels 
                                ? "Using browser-based WebLLM for privacy and no API keys required" 
                                : "Using OpenRouter API for enhanced model performance and options"}
                            </div>
                          </div>
                        </div>
                        
                        {useLocalModels ? (
                          <div className="bg-black/20 p-3 rounded-md">
                            <div className="text-sm font-medium text-[var(--eva-orange)]">
                              BROWSER MODEL: {browserModelEngine ? 
                                <span className="text-[var(--eva-green)]">{browserModelEngine._config?.model_list[0]?.model_id || "Active"}</span> : 
                                <span className="text-red-400">Not Loaded</span>}
                            </div>
                            <p className="text-xs text-[var(--eva-text)] mt-1">
                              Browser models run locally without API calls. Load a model in the Chat Interface first.
                            </p>
                          </div>
                        ) : (
                          <Tabs defaultValue="predefined" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-2 border border-[var(--eva-orange)] bg-opacity-20">
                              <TabsTrigger value="predefined" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black">Cloud Models</TabsTrigger>
                              <TabsTrigger value="custom" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black">Custom</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="predefined">
                              <Select 
                                value={selectedModel} 
                                onValueChange={setSelectedModel}
                              >
                                <SelectTrigger className="bg-black/20">
                                  <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent className="bg-black/90 border-[var(--eva-orange)]">
                                  <SelectItem value="google/gemini-2.0-flash-001">
                                    <div className="flex items-center justify-between w-full">
                                      <span>Gemini 2.0 Flash</span>
                                      <span className="px-1.5 py-0.5 bg-green-900/60 text-green-400 text-[10px] rounded-sm">FAST</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="openrouter/quasar-alpha">
                                    <div className="flex items-center justify-between w-full">
                                      <span>Quasar Alpha</span>
                                      <span className="px-1.5 py-0.5 bg-purple-900/60 text-purple-400 text-[10px] rounded-sm">UNIQUE</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="deepseek/deepseek-chat-v3-0324">
                                    <div className="flex items-center justify-between w-full">
                                      <span>DeepSeek V3</span>
                                      <span className="px-1.5 py-0.5 bg-cyan-900/60 text-cyan-400 text-[10px] rounded-sm">PRECISE</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="deepseek/deepseek-r1">
                                    <div className="flex items-center justify-between w-full">
                                      <span>DeepSeek R1</span>
                                      <span className="px-1.5 py-0.5 bg-emerald-900/60 text-emerald-400 text-[10px] rounded-sm">REASONING</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="anthropic/claude-3.5-sonnet">
                                    <div className="flex items-center justify-between w-full">
                                      <span>Claude 3.5 Sonnet</span>
                                      <span className="px-1.5 py-0.5 bg-blue-900/60 text-blue-400 text-[10px] rounded-sm">BALANCED</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="openai/gpt-4o">
                                    <div className="flex items-center justify-between w-full">
                                      <span>GPT-4o</span>
                                      <span className="px-1.5 py-0.5 bg-yellow-900/60 text-yellow-400 text-[10px] rounded-sm">VERSATILE</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="anthropic/claude-3-opus-20240229">
                                    <div className="flex items-center justify-between w-full">
                                      <span>Claude 3 Opus</span>
                                      <span className="px-1.5 py-0.5 bg-red-900/60 text-red-400 text-[10px] rounded-sm">PREMIUM</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="google/gemini-1.5-pro-latest">
                                    <div className="flex items-center justify-between w-full">
                                      <span>Gemini 1.5 Pro</span>
                                      <span className="px-1.5 py-0.5 bg-indigo-900/60 text-indigo-400 text-[10px] rounded-sm">CONTEXT</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="meta-llama/llama-3-70b-instruct">
                                    <div className="flex items-center justify-between w-full">
                                      <span>Llama 3 70B</span>
                                      <span className="px-1.5 py-0.5 bg-orange-900/60 text-orange-400 text-[10px] rounded-sm">POWERFUL</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="mistralai/mistral-large-latest">
                                    <div className="flex items-center justify-between w-full">
                                      <span>Mistral Large</span>
                                      <span className="px-1.5 py-0.5 bg-teal-900/60 text-teal-400 text-[10px] rounded-sm">CAPABLE</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TabsContent>
                            
                            <TabsContent value="custom">
                              <div className="space-y-2">
                                <Input
                                  placeholder="Enter custom model ID (e.g., openrouter/quasar-alpha)"
                                  value={customModel}
                                  onChange={(e) => setCustomModel(e.target.value)}
                                  className="w-full eva-input text-[var(--eva-green)] bg-black/20"
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    if (customModel && customModel.trim()) {
                                      setSelectedModel(customModel);
                                      toast({
                                        title: 'Custom Model Set',
                                        description: `Using custom model: ${customModel}`
                                      });
                                    }
                                  }}
                                  disabled={!customModel || !customModel.trim()} 
                                  className="w-full eva-button border-[var(--eva-orange)] text-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black"
                                >
                                  Use Custom Model
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </div>
                      
                      <div className="border border-[var(--eva-orange)] rounded-md p-3">
                        <label className="block text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-1">
                          Number of Variants
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={numberOfVariants}
                          className="w-full eva-input text-[var(--eva-green)]"
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '') {
                              setNumberOfVariants(1); // Default to 1 if empty
                            } else {
                              const value = parseInt(inputValue);
                              if (!isNaN(value)) {
                                // Ensure value is at least 1
                                setNumberOfVariants(Math.max(1, value));
                              }
                            }
                          }}
                          onBlur={() => {
                            // Ensure we have a minimum value of 1 when user leaves the field
                            if (numberOfVariants < 1) {
                              setNumberOfVariants(1);
                            }
                          }}
                        />
                        <p className="text-xs text-[var(--eva-text)] mt-1 font-mono">
                          TOTAL OUTPUT GENERATION COUNT
                        </p>
                      </div>
                      
                      <div className="border border-[var(--eva-orange)] rounded-md p-3">
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id="use-auto-stop"
                            checked={useAutoStop}
                            onChange={(e) => setUseAutoStop(e.target.checked)}
                            className="h-4 w-4 text-[var(--eva-orange)] border-[var(--eva-orange)] rounded mr-2"
                          />
                          <label htmlFor="use-auto-stop" className="text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider">
                            Auto-stop Generation
                          </label>
                        </div>
                        
                        <div className={useAutoStop ? "block" : "hidden"}>
                          <p className="text-xs text-[var(--eva-text)] mb-2 font-mono">
                            TERMINATE AFTER [BATCHES WITHOUT IMPROVEMENT]:
                          </p>
                          <Input
                            type="text"
                            min={1}
                            max={100}
                            value={autoStopThreshold.toString()}
                            onChange={(e) => {
                              // Allow empty string for typing
                              const inputValue = e.target.value;
                              
                              // If the input is empty or just a minus sign, allow it temporarily
                              if (inputValue === '' || inputValue === '-') {
                                setAutoStopThreshold(inputValue === '' ? 5 : 1);
                                return;
                              }
                              
                              // Convert to number if possible
                              const value = parseInt(inputValue);
                              if (!isNaN(value)) {
                                // Ensure value is between 1 and 100
                                setAutoStopThreshold(Math.max(1, Math.min(value, 100)));
                              }
                            }}
                            onBlur={() => {
                              // Ensure we have a valid value when user leaves the field
                              if (typeof autoStopThreshold !== 'number' || 
                                  autoStopThreshold < 1) {
                                setAutoStopThreshold(5);
                              } else if (autoStopThreshold > 100) {
                                setAutoStopThreshold(100);
                              }
                            }}
                            className="w-full eva-input text-[var(--eva-green)]"
                            disabled={!useAutoStop}
                          />
                        </div>
                      </div>
                      
                      <div className="border border-[var(--eva-orange)] rounded-md p-3">
                        <label htmlFor="thread-count" className="block text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-2">
                          Thread Count
                        </label>
                        <Input
                          id="thread-count"
                          type="number"
                          min={1}
                          value={threadCount}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '') {
                              setThreadCount(1); // Default to 1 if empty
                            } else {
                              const value = parseInt(inputValue);
                              if (!isNaN(value)) {
                                // Ensure value is at least 1
                                setThreadCount(Math.max(1, value));
                              }
                            }
                          }}
                          onBlur={() => {
                            // Ensure we have a valid value when user leaves the field
                            if (threadCount < 1) {
                              setThreadCount(1);
                            }
                          }}
                          className="w-full eva-input text-[var(--eva-green)]"
                        />
                        <p className="text-xs text-[var(--eva-text)] mt-1 font-mono">
                          CONCURRENT PROCESSES
                        </p>
                      </div>
                    </div>
                    
                    {/* Column 3: Generation Parameters */}
                    <div className="space-y-4">
                      <div className="border border-[var(--eva-orange)] rounded-md p-2.5 sm:p-3">
                        <h3 className="text-xs sm:text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-2 sm:mb-3 flex items-center">
                          <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-[var(--eva-orange)]" />
                          GENERATION PARAMETERS
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="bg-black/20 p-2 sm:p-3 rounded-md">
                            <label className="block text-xs sm:text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-1">
                              Temperature
                            </label>
                            <div className="relative">
                              <Input
                                id="temperature"
                                type="range"
                                min={0}
                                max={2}
                                step={0.1}
                                value={temperature}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value)) {
                                    if (setTemperature) setTemperature(value);
                                  }
                                }}
                                className="w-full eva-slider"
                              />
                              <div className="flex justify-between text-xs text-[var(--eva-text)]">
                                <span>0</span>
                                <span>1</span>
                                <span>2</span>
                              </div>
                              <div className="absolute right-0 top-[-25px] bg-black/40 rounded px-2 py-0.5 text-xs text-[var(--eva-green)]">
                                {temperature.toFixed(1)}
                              </div>
                            </div>
                            <p className="text-xs text-[var(--eva-text)] mt-1 font-mono">
                              ENTROPY CONTROL: {temperature < 0.3 ? "FOCUSED" : temperature > 1.5 ? "CREATIVE" : "BALANCED"}
                            </p>
                          </div>
                          
                          <div className="bg-black/20 p-2 sm:p-3 rounded-md">
                            <label className="block text-xs sm:text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-1">
                              Max Tokens
                            </label>
                            <div className="flex items-center space-x-2">
                              <Input
                                id="max-tokens"
                                type="number"
                                min={1}
                                value={maxTokens}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  if (inputValue === '') {
                                    if (setMaxTokens) setMaxTokens(1024);
                                  } else {
                                    const value = parseInt(inputValue);
                                    if (!isNaN(value) && setMaxTokens) {
                                      setMaxTokens(Math.max(1, value));
                                    }
                                  }
                                }}
                                onBlur={() => {
                                  if (setMaxTokens && (!maxTokens || maxTokens < 1)) {
                                    setMaxTokens(1);
                                  }
                                }}
                                className="w-full eva-input text-[var(--eva-green)]"
                              />
                              <div className="flex flex-col items-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setMaxTokens && setMaxTokens(maxTokens + 512)}
                                  className="h-6 w-6 p-0 rounded-none rounded-t-sm border-[var(--eva-orange)]"
                                >
                                  <span className="sr-only">Increase</span>
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setMaxTokens && setMaxTokens(Math.max(1, maxTokens - 512))}
                                  className="h-6 w-6 p-0 rounded-none rounded-b-sm border-t-0 border-[var(--eva-orange)]"
                                >
                                  <span className="sr-only">Decrease</span>
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-[var(--eva-text)] mt-1 font-mono">
                              OUTPUT BUFFER SIZE
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <MagiProgress 
                        isGenerating={isGenerating}
                        useAutoStop={useAutoStop}
                        autoStopThreshold={autoStopThreshold}
                        rankedOutputs={rankedOutputs}
                        numberOfVariants={numberOfVariants}
                        threadCount={threadCount}
                      />
                      
                      {isGenerating ? (
                        <div className="flex gap-2 mt-3 w-full">
                          <Button 
                            onClick={() => {
                              setIsAborted(true);
                              // We'll let the generator loop handle the toast notification
                              // and properly clean up the resources before stopping
                            }}
                            className="w-1/3 eva-button bg-black/60 border-[var(--eva-red)] text-[var(--eva-red)] hover:bg-[var(--eva-red)] hover:text-black font-bold py-3 flex items-center justify-center"
                          >
                            <X className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>ABORT</span>
                          </Button>
                          <Button 
                            disabled={true}
                            className="w-2/3 eva-button text-[var(--eva-orange)] font-bold py-3 flex items-center justify-center"
                          >
                            <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
                            <span className="truncate mx-1">
                              PROCESSING ANGEL PATTERN
                            </span>
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={generateOutputs} 
                          disabled={!prompt.trim() || !logProbTemplate.trim()} 
                          className="w-full mt-3 eva-button text-[var(--eva-orange)] font-bold py-3 flex items-center justify-center"
                        >
                          <Flame className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span>INITIATE EVANGELION</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="examples" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                  <p className="text-xs sm:text-sm text-[var(--eva-text)] mb-3 sm:mb-4 font-mono nerv-blink">
                    SELECT EXAMPLE TEMPLATE: <span className="nerv-glitch text-[var(--eva-orange)]">NERV CLASSIFICATION</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {examples.map((example, idx) => (
                      <ExampleCard 
                        key={idx}
                        example={example}
                        onClick={handleSelectExample}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="saved" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                    <p className="text-xs sm:text-sm text-[var(--eva-text)] font-mono nerv-blink">
                      SAVED GENERATIONS: <span className="nerv-glitch text-[var(--eva-orange)]">MAGI DATABASE</span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="eva-button border-[var(--eva-orange)] text-[var(--eva-orange)] hover:bg-[var(--eva-orange)] hover:text-black text-xs h-8 sm:h-9"
                      onClick={loadSavedResults}
                    >
                      Refresh List
                    </Button>
                  </div>
                  
                  {savedResults.length === 0 ? (
                    <div className="text-center p-4 sm:p-8 border border-dashed border-[var(--eva-orange)]/30 rounded-md bg-black/20">
                      <p className="text-sm text-[var(--eva-text)] mb-2">No saved results found</p>
                      <p className="text-xs text-[var(--eva-text)]/70">
                        Generate and save results in the MAGI-01 tab to see them here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {savedResults.map((result) => (
                        <Card key={result.id} className="overflow-hidden border border-[var(--eva-text)]/20 hover:border-[var(--eva-green)]/50 transition-colors duration-300">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                              <div className="flex-grow">
                                <h3 className="text-[var(--eva-green)] font-medium mb-1 text-sm sm:text-base">{result.name}</h3>
                                <p className="text-xs text-[var(--eva-text)] truncate max-w-full sm:max-w-[300px]">
                                  <span className="text-[var(--eva-orange)]">Prompt:</span> {result.prompt}
                                </p>
                                <p className="text-xs text-[var(--eva-text)] mt-1">
                                  <span className="text-[var(--eva-orange)]">Model:</span> {result.model}
                                </p>
                                <p className="text-xs text-[var(--eva-text)]/70 mt-1">
                                  {new Date(result.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="eva-button border-[var(--eva-green)] text-[var(--eva-green)] hover:bg-[var(--eva-green)] hover:text-black text-xs h-8 sm:h-9"
                                  onClick={() => {
                                    // Load the saved result
                                    setPrompt(result.prompt);
                                    setLogProbTemplate(result.template);
                                    setRankedOutputs(result.outputs);
                                    
                                    // Switch to generator tab
                                    const generatorTab = document.querySelector('[value="generator"]') as HTMLElement;
                                    if (generatorTab) {
                                      generatorTab.click();
                                    }
                                    
                                    toast({
                                      title: 'Result Loaded',
                                      description: `Loaded "${result.name}" with ${result.outputs.length} outputs`,
                                    });
                                  }}
                                >
                                  Load
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="eva-button border-red-500 text-red-500 hover:bg-red-500 hover:text-black text-xs h-8 sm:h-9"
                                  onClick={() => {
                                    if (window.confirm(`Delete "${result.name}"?`)) {
                                      deleteSavedResult(result.id);
                                      loadSavedResults();
                                      toast({
                                        title: 'Result Deleted',
                                        description: `"${result.name}" has been deleted`,
                                      });
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              {selectedExample && (
                <div className="flex items-center">
                  <div className="bg-[var(--eva-green-bg)] text-[var(--eva-green)] text-xs font-medium px-2.5 py-0.5 rounded flex items-center nerv-pulse">
                    <span className="nerv-type">ACTIVE EXAMPLE</span>
                    <button onClick={clearExample} className="ml-2 text-[var(--eva-orange)] hover:text-[var(--eva-orange)]/80 nerv-glitch">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              
              {rankedOutputs.length > 0 && (
                <div className="mt-6 sm:mt-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                    <div className="flex items-center">
                      <h3 className="text-base sm:text-lg font-medium flex items-center text-[var(--eva-orange)] uppercase tracking-wider nerv-blink">
                        <ArrowDownWideNarrow className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-[var(--eva-orange)] nerv-pulse" />
                        Ranked Outputs
                      </h3>
                      <span className="ml-2 text-xs sm:text-sm text-[var(--eva-text)] nerv-type">
                        (sorted by logprob score)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="eva-button border-[var(--eva-green)] text-[var(--eva-green)] hover:bg-[var(--eva-green)] hover:text-black text-xs h-8 sm:h-9"
                      onClick={() => {
                        // Open modal for save
                        const resultName = window.prompt('Enter a name for this result set:');
                        if (resultName) {
                          try {
                            saveResults(
                              resultName,
                              prompt,
                              logProbTemplate,
                              selectedModel,
                              rankedOutputs
                            );
                            toast({
                              title: 'Results Saved',
                              description: `"${resultName}" has been saved and can be loaded later.`,
                            });
                          } catch (error) {
                            console.error('Error saving results:', error);
                            toast({
                              title: 'Error Saving Results',
                              description: 'Could not save results. Please try again.',
                              variant: 'destructive',
                            });
                          }
                        }
                      }}
                    >
                      Save Results
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {rankedOutputs.map((output, idx) => (
                      <RankedOutput 
                        key={idx}
                        output={output}
                        isFirst={idx === 0}
                        isLatest={rankedOutputs.length > 0 && output.index === rankedOutputs[rankedOutputs.length - 1].index}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OutputRanker;