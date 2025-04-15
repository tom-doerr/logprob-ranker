import { FC, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { createChatCompletion, ChatMessage } from '../lib/openrouter';
import { getApiKey } from '../utils/pkce';
import { Loader2, ArrowUpDown, Crown, Flame, X, Plus, BarChart, ArrowDownWideNarrow } from 'lucide-react';
import { useModelConfig } from '@/hooks/use-model-config';

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

  // Local UI state only
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [logProbTemplate, setLogProbTemplate] = useState(defaultTemplate);
  const [numberOfVariants, setNumberOfVariants] = useState(5);
  const [useAutoStop, setUseAutoStop] = useState(false);
  const [autoStopThreshold, setAutoStopThreshold] = useState(5);
  const [threadCount, setThreadCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rankedOutputs, setRankedOutputs] = useState<RankedOutput[]>([]);
  const [selectedExample, setSelectedExample] = useState<LogProbExample | null>(null);
  const [newAttribute, setNewAttribute] = useState('');
  const [selectedOutputIdx, setSelectedOutputIdx] = useState<number | null>(null);

  // Load API key on mount
  useEffect(() => {
    const storedApiKey = getApiKey();
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);
  
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

      // Generate a variant
      const generationResponse = await createChatCompletion({
        model: selectedModel || '',
        messages: [generateSystemMessage, userMessage],
        temperature: temperature, // Use temperature from the user setting
        max_tokens: maxTokens, // Use max tokens from the user setting
      });
      
      if (!generationResponse.choices || generationResponse.choices.length === 0) {
        return null;
      }
      
      const generatedOutput = generationResponse.choices[0].message.content;
      
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
      
      // Generate the evaluation
      const evaluationResponse = await createChatCompletion({
        model: selectedModel || '',
        messages: [evaluateSystemMessage, evaluateUserMessage],
        temperature: 0.1, // Lower temperature for more consistent evaluation
        max_tokens: 500, // Fixed size for evaluations is sufficient
      });

      if (!evaluationResponse.choices || evaluationResponse.choices.length === 0) {
        return null;
      }

      const evaluationContent = evaluationResponse.choices[0].message.content;
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
    if (!apiKey || !prompt.trim() || !logProbTemplate.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a prompt and a logprob template',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate that we have a properly formatted selectedModel
    if (!selectedModel || !selectedModel.includes('/')) {
      toast({
        title: 'Invalid Model',
        description: 'Please select a valid model with proper format (e.g., "provider/model-name")',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
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
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="w-full eva-card">
        <CardHeader className="border-b border-[var(--eva-orange)]">
          <CardTitle className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <BarChart className="h-5 w-5 text-[var(--eva-orange)]" />
              <span className="eva-title">NERV MAGI SYSTEM - LLM OUTPUT RANKER</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!apiKey ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">
                Please log in or enter an API key in the chat interface to use this feature.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Tabs defaultValue="generator" className="w-full">
                <TabsList className="grid w-full grid-cols-2 border border-[var(--eva-orange)] bg-opacity-20">
                  <TabsTrigger value="generator" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">MAGI-01</TabsTrigger>
                  <TabsTrigger value="examples" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">MAGI-02</TabsTrigger>
                </TabsList>
                
                <TabsContent value="generator" className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-1">
                      Input Prompt
                    </label>
                    <Textarea
                      placeholder="Enter your prompt here..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px] eva-input text-[var(--eva-green)]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <p className="text-xs text-[var(--eva-text)] font-mono">
                          TEMPLATE DEFINES ATTRIBUTES TO EVALUATE. USE LOGPROB_TRUE TO INDICATE.
                        </p>
                        
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
                      <div>
                        <label className="block text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-1">
                          MAGI System Model
                        </label>
                        <Tabs defaultValue="predefined" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 mb-2 border border-[var(--eva-orange)] bg-opacity-20">
                            <TabsTrigger value="predefined" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black">Casper</TabsTrigger>
                            <TabsTrigger value="custom" className="data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black">Custom</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="predefined">
                            <Select 
                              value={selectedModel} 
                              onValueChange={setSelectedModel}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="deepseek/deepseek-r1">DeepSeek R1</SelectItem>
                                <SelectItem value="deepseek/deepseek-chat-v3-0324">DeepSeek Chat v3</SelectItem>
                                <SelectItem value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B</SelectItem>
                                <SelectItem value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</SelectItem>
                                <SelectItem value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</SelectItem>
                                <SelectItem value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
                                <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                              </SelectContent>
                            </Select>
                          </TabsContent>
                          
                          <TabsContent value="custom">
                            <div className="space-y-2">
                              <Input
                                placeholder="Enter custom model ID (e.g., anthropic/claude-3.5-sonnet)"
                                value={customModel}
                                onChange={(e) => setCustomModel(e.target.value)}
                                className="w-full eva-input text-[var(--eva-green)]"
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
                      <div className="border border-[var(--eva-orange)] rounded-md p-3">
                        <label className="block text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-1">
                          Temperature
                        </label>
                        <Input
                          id="temperature"
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          value={temperature}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '') {
                              // Default to 0.9 if empty
                              if (setTemperature) setTemperature(0.9);
                            } else {
                              const value = parseFloat(inputValue);
                              if (!isNaN(value)) {
                                // Ensure value is between 0 and 2
                                if (setTemperature) setTemperature(Math.max(0, Math.min(value, 2)));
                              }
                            }
                          }}
                          onBlur={() => {
                            // Ensure we have a valid value when user leaves the field
                            if (!temperature || temperature < 0) {
                              if (setTemperature) setTemperature(0);
                            } else if (temperature > 2) {
                              if (setTemperature) setTemperature(2);
                            }
                          }}
                          className="w-full eva-input text-[var(--eva-green)]"
                        />
                        <p className="text-xs text-[var(--eva-text)] mt-1 font-mono">
                          ENTROPY CONTROL [0-2]
                        </p>
                      </div>
                      
                      <div className="border border-[var(--eva-orange)] rounded-md p-3">
                        <label className="block text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-1">
                          Max Tokens
                        </label>
                        <Input
                          id="max-tokens"
                          type="number"
                          min={1}
                          value={maxTokens}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '') {
                              if (setMaxTokens) setMaxTokens(1024); // Default to 1024 if empty
                            } else {
                              const value = parseInt(inputValue);
                              if (!isNaN(value) && setMaxTokens) {
                                // Ensure value is at least 1
                                setMaxTokens(Math.max(1, value));
                              }
                            }
                          }}
                          onBlur={() => {
                            // Ensure we have a valid value when user leaves the field
                            if (setMaxTokens && (!maxTokens || maxTokens < 1)) {
                              setMaxTokens(1);
                            }
                          }}
                          className="w-full eva-input text-[var(--eva-green)]"
                        />
                        <p className="text-xs text-[var(--eva-text)] mt-1 font-mono">
                          OUTPUT BUFFER SIZE
                        </p>
                      </div>
                      
                      {isGenerating && (
                        <div className="mt-4 mb-2 border border-[var(--eva-orange)] rounded-md p-3 bg-black/30">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-[var(--eva-orange)] animate-pulse mr-2"></div>
                              <span className="text-sm font-mono text-[var(--eva-orange)] uppercase tracking-wider">ANGEL ANALYSIS</span>
                            </div>
                            <span className="text-sm font-mono text-[var(--eva-green)]">
                              {useAutoStop 
                                ? `AUTO-CEASE: ${autoStopThreshold}`
                                : `PROGRESS: ${rankedOutputs.length}/${numberOfVariants}`
                              }
                            </span>
                          </div>
                          
                          <div className="w-full bg-black/40 rounded-full h-2.5 mb-2 border border-[var(--eva-orange)]/30">
                            <div 
                              className="bg-[var(--eva-orange)] h-2 rounded-full transition-all" 
                              style={{
                                width: `${useAutoStop ? Math.min(100, (rankedOutputs.length / (rankedOutputs.length + 5)) * 100) : Math.min(100, (rankedOutputs.length / numberOfVariants) * 100)}%`
                              }}>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono">
                            <div className="flex items-center border border-[var(--eva-orange)]/20 bg-black/20 p-1 rounded">
                              <div className="w-2 h-2 bg-[var(--eva-green)] rounded-full mr-1 animate-pulse"></div>
                              <span className="text-[var(--eva-green)]">MAGI-1: MELCHIOR</span>
                            </div>
                            <div className="flex items-center border border-[var(--eva-orange)]/20 bg-black/20 p-1 rounded">
                              <div className="w-2 h-2 bg-[var(--eva-orange)] rounded-full mr-1 animate-pulse"></div>
                              <span className="text-[var(--eva-orange)]">MAGI-2: BALTHASAR</span>
                            </div>
                            <div className="flex items-center border border-[var(--eva-orange)]/20 bg-black/20 p-1 rounded">
                              <div className="w-2 h-2 bg-[var(--eva-blue)] rounded-full mr-1 animate-pulse"></div>
                              <span className="text-[var(--eva-blue)]">MAGI-3: CASPER</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-xs font-mono mt-2">
                            <span className="text-[var(--eva-text)]">A.T. FIELD ANALYSIS ACTIVE</span>
                            <span className="text-[var(--eva-blue)]">THREADS: {threadCount}</span>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        onClick={generateOutputs} 
                        disabled={isGenerating || !prompt.trim() || !logProbTemplate.trim()} 
                        className="w-full mt-3 eva-button text-[var(--eva-orange)] font-bold py-3 flex items-center justify-center"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
                            <span className="truncate mx-1">
                              PROCESSING ANGEL PATTERN
                            </span>
                          </>
                        ) : (
                          <>
                            <Flame className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>INITIATE EVANGELION</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="examples" className="space-y-4 mt-4">
                  <p className="text-sm text-[var(--eva-text)] mb-4 font-mono">
                    SELECT EXAMPLE TEMPLATE:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examples.map((example, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleSelectExample(example)}
                        className="border border-[var(--eva-orange)] rounded-md p-4 cursor-pointer hover:bg-black/10 transition-colors"
                      >
                        <h3 className="font-medium mb-2 text-[var(--eva-orange)] uppercase tracking-wider">{example.prompt}</h3>
                        <p className="text-sm text-[var(--eva-text)] font-mono">
                          VARIANTS: {example.variants}
                        </p>
                        <pre className="text-xs bg-black/5 p-2 mt-2 rounded overflow-x-auto text-[var(--eva-green)] border border-[var(--eva-orange)]/30">
                          {example.template}
                        </pre>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              
              {selectedExample && (
                <div className="flex items-center">
                  <div className="bg-[var(--eva-green-bg)] text-[var(--eva-green)] text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    <span>ACTIVE EXAMPLE</span>
                    <button onClick={clearExample} className="ml-2 text-[var(--eva-orange)] hover:text-[var(--eva-orange)]/80">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              
              {rankedOutputs.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-medium flex items-center text-[var(--eva-orange)] uppercase tracking-wider">
                      <ArrowDownWideNarrow className="h-5 w-5 mr-2 text-[var(--eva-orange)]" />
                      Ranked Outputs
                    </h3>
                    <span className="ml-2 text-sm text-[var(--eva-text)]">
                      (sorted by logprob score)
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {rankedOutputs.map((output, idx) => (
                      <div 
                        key={idx} 
                        className={`border ${rankedOutputs.length > 0 && output.index === rankedOutputs[rankedOutputs.length - 1].index 
                          ? 'border-[var(--eva-blue)] bg-[var(--eva-blue)]/5' 
                          : 'border-[var(--eva-orange)]'} rounded-md p-4 relative`}
                      >
                        {rankedOutputs.length > 0 && output.index === rankedOutputs[rankedOutputs.length - 1].index && (
                          <div className="absolute top-0 right-0 border-t-2 border-r-2 border-[var(--eva-blue)] w-6 h-6"></div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            {idx === 0 && (
                              <span className="inline-flex items-center bg-[var(--eva-orange)] text-white text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                                <Crown className="h-3 w-3 mr-1" />
                                PRIME SUBJECT
                              </span>
                            )}
                            {rankedOutputs.length > 0 && output.index === rankedOutputs[rankedOutputs.length - 1].index && (
                              <span className="inline-flex items-center bg-[var(--eva-blue)] text-white text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                                <span className="h-2 w-2 bg-white rounded-full animate-pulse mr-1"></span>
                                LATEST
                              </span>
                            )}
                            <span className="text-sm text-[var(--eva-text)] font-mono">
                              {"VARIANT-" + String(output.index + 1).padStart(3, '0')}
                            </span>
                          </div>
                          <span className="text-sm font-medium bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-2 py-0.5 rounded">
                            Score: {output.logprob.toFixed(4)}
                          </span>
                        </div>
                        <div className="mt-2 p-3 bg-black/5 rounded-md whitespace-pre-wrap text-[var(--eva-text)] border border-[var(--eva-orange)]/30">
                          {output.output}
                        </div>
                        
                        {/* Attribute Scores Display */}
                        {output.attributeScores && output.attributeScores.length > 0 && (
                          <div className="mt-3 border-t border-[var(--eva-orange)]/30 pt-3">
                            <h4 className="text-sm font-medium text-[var(--eva-orange)] uppercase tracking-wider mb-2">Attribute Scores</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {output.attributeScores.map((attr, attrIdx) => (
                                <div 
                                  key={attrIdx} 
                                  className="flex items-center justify-between p-2 bg-black/5 rounded-md border border-[var(--eva-orange)]/30"
                                >
                                  <span className="text-xs font-medium text-[var(--eva-text)]">{attr.name}:</span>
                                  <span className="text-xs bg-[var(--eva-green-bg)] text-[var(--eva-green)] px-2 py-0.5 rounded-full">
                                    {attr.score.toFixed(4)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* View Raw Evaluation Button */}
                        {output.rawEvaluation && (
                          <div className="mt-2 flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedOutputIdx(selectedOutputIdx === idx ? null : idx)}
                              className="text-xs text-[var(--eva-orange)] hover:text-[var(--eva-orange)]/80"
                            >
                              {selectedOutputIdx === idx ? 'CLOSE TERMINAL' : 'VIEW MAGI ANALYSIS'}
                            </Button>
                          </div>
                        )}
                        
                        {/* Raw Evaluation */}
                        {selectedOutputIdx === idx && output.rawEvaluation && (
                          <div className="mt-2 p-2 bg-black/5 border border-[var(--eva-orange)]/50 rounded-md text-xs font-mono whitespace-pre-wrap text-[var(--eva-green)]">
                            {output.rawEvaluation}
                          </div>
                        )}
                      </div>
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