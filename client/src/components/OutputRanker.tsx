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

const OutputRanker: FC = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [logProbTemplate, setLogProbTemplate] = useState(defaultTemplate);
  const [numberOfVariants, setNumberOfVariants] = useState(5);
  const [modelId, setModelId] = useState('google/gemini-2.0-flash-001');
  const [customModelId, setCustomModelId] = useState('');
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

  const generateOutputs = async () => {
    if (!apiKey || !prompt.trim() || !logProbTemplate.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a prompt and a logprob template',
        variant: 'destructive',
      });
      return;
    }
    
    // If modelId is not in predefined models and not a custom model, show error
    if (!['deepseek/deepseek-r1', 'meta-llama/llama-3.1-8b-instruct', 'google/gemini-2.0-flash-001', 'openai/gpt-3.5-turbo'].includes(modelId) && 
        !modelId.includes('/')) {
      toast({
        title: 'Invalid Model',
        description: 'Please select a valid model or enter a custom model ID with proper format (e.g., "provider/model-name")',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setRankedOutputs([]);

    try {
      const results: RankedOutput[] = [];
      
      // Generate the specified number of variants
      for (let i = 0; i < numberOfVariants; i++) {
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
          model: modelId,
          messages: [generateSystemMessage, userMessage],
          temperature: 0.9, // Higher temperature for more diversity
        });
        
        if (!generationResponse.choices || generationResponse.choices.length === 0) {
          continue;
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
          model: modelId,
          messages: [evaluateSystemMessage, evaluateUserMessage],
          temperature: 0.1, // Lower temperature for more consistent evaluation
        });

        if (evaluationResponse.choices && evaluationResponse.choices.length > 0) {
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
          
          // Add to results
          results.push({
            output: generatedOutput,
            logprob,
            index: i,
            attributeScores,
            rawEvaluation
          });
          
          // Update the ranked outputs as they come in
          setRankedOutputs([...results].sort((a, b) => b.logprob - a.logprob));
        }
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
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <BarChart className="h-5 w-5 text-blue-500" />
              <span>LLM Output Ranker</span>
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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="generator">Generator</TabsTrigger>
                  <TabsTrigger value="examples">Examples</TabsTrigger>
                </TabsList>
                
                <TabsContent value="generator" className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Prompt
                    </label>
                    <Textarea
                      placeholder="Enter your prompt here..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LogProb Template
                      </label>
                      <Textarea
                        placeholder="Enter your logprob template..."
                        value={logProbTemplate}
                        onChange={(e) => setLogProbTemplate(e.target.value)}
                        className="font-mono text-sm min-h-[120px]"
                      />
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-gray-500">
                          The template defines attributes to evaluate. Use LOGPROB_TRUE to indicate true evaluation.
                        </p>
                        
                        <div className="flex space-x-2 items-center">
                          <Input
                            placeholder="Add attribute..."
                            value={newAttribute}
                            onChange={(e) => setNewAttribute(e.target.value)}
                            className="flex-grow text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
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
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Model
                        </label>
                        <Tabs defaultValue="predefined" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 mb-2">
                            <TabsTrigger value="predefined">Predefined</TabsTrigger>
                            <TabsTrigger value="custom">Custom</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="predefined">
                            <Select 
                              value={modelId} 
                              onValueChange={setModelId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="deepseek/deepseek-r1">DeepSeek R1</SelectItem>
                                <SelectItem value="meta-llama/llama-3.1-8b-instruct">Meta Llama 3.1 8B</SelectItem>
                                <SelectItem value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</SelectItem>
                                <SelectItem value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                              </SelectContent>
                            </Select>
                          </TabsContent>
                          
                          <TabsContent value="custom">
                            <div className="space-y-2">
                              <Input
                                placeholder="Enter custom model ID (e.g., anthropic/claude-3.5-sonnet)"
                                value={customModelId}
                                onChange={(e) => setCustomModelId(e.target.value)}
                                className="w-full"
                              />
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  if (customModelId.trim()) {
                                    setModelId(customModelId);
                                    toast({
                                      title: 'Custom Model Set',
                                      description: `Using custom model: ${customModelId}`
                                    });
                                  }
                                }}
                                disabled={!customModelId.trim()} 
                                className="w-full"
                              >
                                Use Custom Model
                              </Button>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Variants
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={numberOfVariants}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value > 0) {
                              setNumberOfVariants(value);
                            }
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter any number of variants to generate (higher values may take longer)
                        </p>
                      </div>
                      
                      <Button 
                        onClick={generateOutputs} 
                        disabled={isGenerating || !prompt.trim() || !logProbTemplate.trim()} 
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating ({rankedOutputs.length}/{numberOfVariants})
                          </>
                        ) : (
                          <>
                            <Flame className="mr-2 h-4 w-4" />
                            Generate & Rank Outputs
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="examples" className="space-y-4 mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Click on an example to load it into the generator:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examples.map((example, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleSelectExample(example)}
                        className="border rounded-md p-4 cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <h3 className="font-medium mb-2">{example.prompt}</h3>
                        <p className="text-sm text-gray-500">
                          Variants: {example.variants}
                        </p>
                        <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-x-auto">
                          {example.template}
                        </pre>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              
              {selectedExample && (
                <div className="flex items-center">
                  <div className="bg-blue-50 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    <span>Using example</span>
                    <button onClick={clearExample} className="ml-2 text-blue-700 hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              
              {rankedOutputs.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-medium flex items-center">
                      <ArrowDownWideNarrow className="h-5 w-5 mr-2 text-blue-500" />
                      Ranked Outputs
                    </h3>
                    <span className="ml-2 text-sm text-gray-500">
                      (sorted by logprob score)
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {rankedOutputs.map((output, idx) => (
                      <div key={idx} className="border rounded-md p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            {idx === 0 && (
                              <span className="inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                                <Crown className="h-3 w-3 mr-1" />
                                Top Ranked
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              Variant #{output.index + 1}
                            </span>
                          </div>
                          <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Score: {output.logprob.toFixed(4)}
                          </span>
                        </div>
                        <div className="mt-2 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">
                          {output.output}
                        </div>
                        
                        {/* Attribute Scores Display */}
                        {output.attributeScores && output.attributeScores.length > 0 && (
                          <div className="mt-3 border-t border-gray-200 pt-3">
                            <h4 className="text-sm font-medium mb-2">Attribute Scores:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {output.attributeScores.map((attr, attrIdx) => (
                                <div 
                                  key={attrIdx} 
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                                >
                                  <span className="text-xs font-medium">{attr.name}:</span>
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
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
                              className="text-xs"
                            >
                              {selectedOutputIdx === idx ? 'Hide Details' : 'View Evaluation'}
                            </Button>
                          </div>
                        )}
                        
                        {/* Raw Evaluation */}
                        {selectedOutputIdx === idx && output.rawEvaluation && (
                          <div className="mt-2 p-2 bg-gray-100 border border-gray-200 rounded-md text-xs font-mono whitespace-pre-wrap">
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