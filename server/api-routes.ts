import { Request, Response, Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// OpenRouter base URL
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Create a proxy for OpenRouter chat completions
router.post('/chat/completions', async (req: Request, res: Response) => {
  try {
    // Get API key from environment variable
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: {
          message: 'Authentication failed: OPENROUTER_API_KEY environment variable not set',
          type: 'auth_error'
        }
      });
    }
    
    // Headers for OpenRouter API
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': req.get('origin') || 'http://localhost:5000',
      'X-Title': 'NERV Interface'
    };
    
    // Forward the request to OpenRouter
    const openRouterResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body)
    });
    
    // Get response data
    const data = await openRouterResponse.json();
    
    // Return the response
    return res.status(openRouterResponse.status).json(data);
  } catch (error) {
    console.error('Error proxying request to OpenRouter:', error);
    return res.status(500).json({
      error: {
        message: 'Failed to proxy request to OpenRouter',
        type: 'proxy_error'
      }
    });
  }
});

// Export the router
export default router;