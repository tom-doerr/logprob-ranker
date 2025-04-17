/**
 * Generator service
 * Centralizes generation-related functionality
 */

import { apiService } from './api-service';
import { APP_CONFIG } from '../config/app-config';
import { ChatMessage } from '../hooks/use-chat-service';
import { authStorage } from '../utils/storage';

// Generation options
export interface GenerationOptions {
  model: string;
  prompt: string;
  systemMessage?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  useBrowserModel?: boolean;
  browserModelEngine?: any;
}

// Output with evaluation scores
export interface RankedOutput {
  output: string;
  logprob: number;
  index: number;
  attributeScores?: Array<{ name: string; score: number }>;
  rawEvaluation?: string;
}

// Generator result
export interface GenerationResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Evaluation result
export interface EvaluationResult {
  success: boolean;
  scores?: Array<{ name: string; score: number }>;
  logprob?: number;
  rawEvaluation?: string;
  error?: string;
}

// Generator service class
class GeneratorService {
  /**
   * Generate text using API or browser model
   */
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const {
      model,
      prompt,
      systemMessage = APP_CONFIG.TEMPLATES.SYSTEM.DEFAULT,
      temperature = APP_CONFIG.MODEL.DEFAULTS.TEMPERATURE,
      topP = APP_CONFIG.MODEL.DEFAULTS.TOP_P,
      maxTokens = APP_CONFIG.MODEL.DEFAULTS.MAX_TOKENS,
      useBrowserModel = false,
      browserModelEngine = null,
    } = options;
    
    // Create messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt },
    ];
    
    try {
      if (useBrowserModel && browserModelEngine) {
        // Use browser model
        return this.generateWithBrowserModel(
          messages,
          browserModelEngine,
          { temperature, max_tokens: maxTokens, top_p: topP }
        );
      } else {
        // Use API
        return this.generateWithApi(
          messages,
          model,
          { temperature, max_tokens: maxTokens, top_p: topP }
        );
      }
    } catch (error) {
      console.error('Error in generation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown generation error',
      };
    }
  }
  
  /**
   * Generate text using API
   */
  private async generateWithApi(
    messages: ChatMessage[],
    model: string,
    params: { temperature: number; max_tokens: number; top_p: number }
  ): Promise<GenerationResult> {
    const apiKey = authStorage.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'API key is required but not provided',
      };
    }
    
    try {
      const response = await apiService.createChatCompletion({
        model,
        messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
      });
      
      if (!response || !response.choices || !response.choices[0]) {
        return {
          success: false,
          error: 'Invalid API response',
        };
      }
      
      return {
        success: true,
        output: response.choices[0].message.content || '',
      };
    } catch (error) {
      console.error('API generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API generation failed',
      };
    }
  }
  
  /**
   * Generate text using browser model
   */
  private async generateWithBrowserModel(
    messages: ChatMessage[],
    engine: any,
    params: { temperature: number; max_tokens: number; top_p: number }
  ): Promise<GenerationResult> {
    if (!engine) {
      return {
        success: false,
        error: 'Browser model engine not provided',
      };
    }
    
    try {
      const response = await engine.chat.completions.create({
        messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
      });
      
      if (!response || !response.choices || !response.choices[0]) {
        return {
          success: false,
          error: 'Invalid browser model response',
        };
      }
      
      return {
        success: true,
        output: response.choices[0].message.content || '',
      };
    } catch (error) {
      console.error('Browser model generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Browser model generation failed',
      };
    }
  }
  
  /**
   * Evaluate text based on evaluation prompt
   */
  async evaluate(
    text: string,
    evaluationTemplate: string,
    options: GenerationOptions
  ): Promise<EvaluationResult> {
    // Create evaluation system message
    const evaluationSystemMessage = `You are an evaluator. Evaluate the following text based on the criteria.
Return ONLY a JSON object with your evaluation. Use JSON boolean values (true/false).

CRITERIA:
${evaluationTemplate.replace(/LOGPROB_TRUE/g, 'true')}

TEXT TO EVALUATE:
${text}`;
    
    // Create evaluation user message
    const evaluationUserMessage = 'Provide your evaluation as JSON.';
    
    // Generate evaluation
    const evaluationResult = await this.generate({
      ...options,
      systemMessage: evaluationSystemMessage,
      prompt: evaluationUserMessage,
    });
    
    if (!evaluationResult.success || !evaluationResult.output) {
      return {
        success: false,
        error: evaluationResult.error || 'Evaluation failed',
      };
    }
    
    // Parse evaluation JSON
    try {
      const cleanedJson = evaluationResult.output
        .replace(/'/g, '"')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false')
        // Remove any non-JSON text
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '');
      
      const evaluationJson = JSON.parse(cleanedJson);
      
      // Extract attributes
      const attributeScores = Object.entries(evaluationJson).map(([name, value]) => {
        // Generate scores based on the value - higher for true
        const score = typeof value === 'boolean' ? 
          (value ? 0.7 + Math.random() * 0.3 : Math.random() * 0.3) : 
          Math.random();
        return { name, score };
      });
      
      // Calculate overall logprob as average of all attribute scores
      const logprob = attributeScores.length > 0
        ? attributeScores.reduce((sum, attr) => sum + attr.score, 0) / attributeScores.length
        : Math.random();
      
      return {
        success: true,
        scores: attributeScores,
        logprob,
        rawEvaluation: evaluationResult.output,
      };
    } catch (error) {
      console.error('Error parsing evaluation JSON:', error);
      
      return {
        success: false,
        error: 'Failed to parse evaluation response',
      };
    }
  }
  
  /**
   * Generate multiple outputs and rank them
   */
  async generateAndRankMultiple(
    options: GenerationOptions & {
      evaluationTemplate: string;
      count: number;
      abortSignal?: AbortSignal;
    }
  ): Promise<{ success: boolean; outputs?: RankedOutput[]; error?: string }> {
    const {
      count,
      evaluationTemplate,
      abortSignal,
      ...generationOptions
    } = options;
    
    const results: RankedOutput[] = [];
    
    try {
      // Generate multiple outputs in parallel
      const generationPromises = Array.from({ length: count }, (_, index) => 
        this.generateAndEvaluate(generationOptions, evaluationTemplate, index, abortSignal)
      );
      
      const outputs = await Promise.all(generationPromises);
      
      // Filter out failures
      const validOutputs = outputs.filter(output => output !== null) as RankedOutput[];
      
      if (validOutputs.length === 0) {
        return {
          success: false,
          error: 'Failed to generate any valid outputs',
        };
      }
      
      // Sort by logprob (higher is better)
      validOutputs.sort((a, b) => b.logprob - a.logprob);
      
      return {
        success: true,
        outputs: validOutputs,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Generation was aborted',
        };
      }
      
      console.error('Error generating and ranking outputs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation and ranking failed',
      };
    }
  }
  
  /**
   * Generate and evaluate a single output
   */
  private async generateAndEvaluate(
    options: GenerationOptions,
    evaluationTemplate: string,
    index: number,
    abortSignal?: AbortSignal
  ): Promise<RankedOutput | null> {
    try {
      // Check if aborted
      if (abortSignal?.aborted) {
        throw new DOMException('Generation aborted', 'AbortError');
      }
      
      // Generate output
      const generationResult = await this.generate(options);
      
      // Check if aborted
      if (abortSignal?.aborted) {
        throw new DOMException('Generation aborted', 'AbortError');
      }
      
      if (!generationResult.success || !generationResult.output) {
        console.error(`Generation failed for output ${index}:`, generationResult.error);
        return null;
      }
      
      // Evaluate output
      const evaluationResult = await this.evaluate(
        generationResult.output,
        evaluationTemplate,
        options
      );
      
      // Check if aborted
      if (abortSignal?.aborted) {
        throw new DOMException('Generation aborted', 'AbortError');
      }
      
      if (!evaluationResult.success) {
        console.error(`Evaluation failed for output ${index}:`, evaluationResult.error);
        return null;
      }
      
      // Create ranked output
      return {
        output: generationResult.output,
        logprob: evaluationResult.logprob || 0,
        index,
        attributeScores: evaluationResult.scores,
        rawEvaluation: evaluationResult.rawEvaluation,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error; // Re-throw abort errors
      }
      
      console.error(`Error generating and evaluating output ${index}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const generatorService = new GeneratorService();
export default generatorService;