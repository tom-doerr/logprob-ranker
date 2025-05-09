import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import apiRoutes from "./api-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register the OpenRouter API proxy routes
  app.use('/api/v1', apiRoutes);
  // Exchange code for OpenRouter API key
  app.post("/api/exchange-code", async (req, res) => {
    try {
      // Use the exact parameter names that OpenRouter expects
      const { code, code_verifier, code_challenge_method } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Missing authorization code" });
      }

      // Use the exact parameter names that OpenRouter expects in its API
      const body: Record<string, string> = { code };
      
      // Add code verifier and challenge method if provided - using the exact naming from OpenRouter docs
      if (code_verifier) body.code_verifier = code_verifier;
      if (code_challenge_method) body.code_challenge_method = code_challenge_method;

      try {
        // Log request details for debugging
        console.log("=== OPENROUTER OAUTH DEBUG ===");
        console.log("URL: https://openrouter.ai/api/v1/auth/keys");
        console.log("Method: POST");
        console.log("Headers: Content-Type: application/json");
        console.log("Body:", JSON.stringify(body, null, 2));
        
        // Try to exchange the code for an API key with OpenRouter
        const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        // Log response details for debugging
        console.log("===== OAUTH DEBUG INFO =====");
        console.log("OpenRouter auth response status:", response.status);
        console.log("Request URL:", "https://openrouter.ai/api/v1/auth/keys");
        console.log("Request body:", JSON.stringify(body, null, 2));
        
        // Convert headers to object safely for logging
        const headerObj: Record<string, string> = {};
        // Type-safe way to iterate headers
        for (const [key, value] of Array.from(response.headers)) {
          headerObj[key] = value;
        }
        console.log("OpenRouter auth response headers:", JSON.stringify(headerObj, null, 2));
        
        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          console.error("Non-JSON response:", textResponse);
          
          // Log possible redirect URLs from the response
          const matches = textResponse.match(/href=["']([^"']+)["']/g);
          if (matches && matches.length > 0) {
            console.log("Possible redirect URLs found in HTML response:");
            matches.forEach(match => {
              console.log("  -", match);
            });
          }
          
          // Check if the response contains an API key pattern
          const possibleApiKey = textResponse.match(/sk-or-v1-[a-zA-Z0-9]{32,}/);
          if (possibleApiKey && possibleApiKey[0]) {
            console.log("Found potential API key in non-JSON response, returning it");
            return res.json({ 
              key: possibleApiKey[0],
              debug_info: {
                note: "API key extracted from non-JSON response",
                content_type: contentType,
                status: response.status
              }
            });
          }
          
          // Return the error with the raw response for client-side debugging
          return res.status(200).json({ 
            message: `Authentication response received but in unexpected format`,
            debug_info: {
              status: response.status,
              content_type: contentType,
              response_text: textResponse,
              raw_headers: JSON.stringify(Object.fromEntries(response.headers.entries())),
              suggestion: "Check if the OpenRouter OAuth service is expecting different parameters or has changed its API"
            }
          });
        }
        
        if (!response.ok) {
          try {
            const errorData = await response.json();
            const errorMessage = typeof errorData === 'object' && errorData && 'error' in errorData
              ? String(errorData.error)
              : `OpenRouter API error: ${response.status}`;
              
            return res.status(response.status).json({ message: errorMessage });
          } catch (jsonError) {
            return res.status(response.status).json({ 
              message: `OpenRouter API error: ${response.status}` 
            });
          }
        }

        const data = await response.json();
        return res.json(data);
      } catch (apiError: unknown) {
        console.error("API error during OAuth code exchange:", apiError);
        
        console.log("Providing fallback API key due to OAuth error");
        
        // Generate a dummy key that follows OpenRouter's format but is marked as demo
        const demoKey = `sk-or-v1-demo-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
        
        // Return a simulated response with a clear indication this is a demo key
        return res.json({ 
          key: demoKey,
          debug_info: {
            error: apiError instanceof Error ? apiError.message : String(apiError),
            note: "This is a demo key for simulation mode due to OAuth error"
          }
        });
      }
    } catch (error) {
      console.error("Error exchanging code:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Proxy API requests to OpenRouter to keep API key server-side
  app.post("/api/chat", async (req, res) => {
    try {
      const { apiKey, ...requestBody } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "Missing API key" });
      }

      try {
        // Try to make the real API request
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API returned ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        return res.json(data);
      } catch (apiError: unknown) {
        console.warn("Using fallback simulation due to API error:", apiError);
        
        // Check if this is a demo key, which indicates we're in simulation mode
        const isSimulationMode = apiKey.includes('demo');
        
        if (isSimulationMode) {
          console.log("Using simulated response for demo mode");
          
          // For the demo, return a simulated response
          const model = requestBody.model || 'openai/gpt-3.5-turbo';
          const userMessage = requestBody.messages && requestBody.messages.length > 0 ? 
            requestBody.messages[requestBody.messages.length - 1].content : 
            'No user message found';
            
          return res.json({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: `This is a demonstration response to your message: "${userMessage}"\n\nIn a production environment with a valid API key, this would be a real response from the ${model} model.\n\nPlease enter your OpenRouter API key to interact with actual AI models.`
                },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: Math.floor(userMessage.length / 4),
              completion_tokens: 60,
              total_tokens: Math.floor(userMessage.length / 4) + 60
            }
          });
        } else {
          // If not in simulation mode, return the original error
          return res.status(500).json({ 
            message: "Failed to complete chat request", 
            error: apiError instanceof Error ? apiError.message : String(apiError)
          });
        }
      }
    } catch (error) {
      console.error("Error making chat request:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
