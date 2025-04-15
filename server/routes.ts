import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";

export async function registerRoutes(app: Express): Promise<Server> {
  // Exchange code for OpenRouter API key
  app.post("/api/exchange-code", async (req, res) => {
    try {
      const { code, codeVerifier, codeMethod } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Missing authorization code" });
      }

      const body: Record<string, string> = { code };
      
      // Add code verifier and challenge method if provided
      if (codeVerifier) body.code_verifier = codeVerifier;
      if (codeMethod) body.code_challenge_method = codeMethod;

      // Exchange the code for an API key with OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", errorText);
        return res.status(response.status).json({ 
          message: "Failed to exchange code for API key",
          error: errorText
        });
      }

      const data = await response.json();
      return res.json(data);
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

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", errorText);
        return res.status(response.status).json({ 
          message: "Failed to complete chat request",
          error: errorText
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error("Error making chat request:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
