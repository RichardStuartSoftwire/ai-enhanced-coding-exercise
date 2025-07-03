const fs = require('fs');
const path = require('path');

const cors = require('cors');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();

app.use(cors());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
  next();
});

// Load mock response data from JSON file
let mockFlashcardResponse;
try {
  const mockDataPath = path.join(__dirname, 'flashcard_mock.json');
  const mockData = fs.readFileSync(mockDataPath, 'utf8');
  mockFlashcardResponse = JSON.parse(mockData);
  console.log('Mock data loaded successfully from flashcard_mock.json');
} catch (error) {
  console.error('Error loading mock data:', error);
  mockFlashcardResponse = { choices: [{ message: { content: { flashcards: [] } } }] };
}

const isMockMode = (req) => req.query.mock === 'true' || req.headers['x-use-mock'] === 'true';

app.use('/api/v1/chat/completions', (req, res, next) => {
  if (isMockMode(req)) {
    console.log('Using MOCK response mode');
    return res.json(mockFlashcardResponse);
  }
  next();
});

const inferenceProxy = createProxyMiddleware({
  target: process.env.INFERENCE_SERVER_URL || 'http://localhost:1234',
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1': '', // Remove /api/v1 prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request to inference server:', req.method, req.url);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Received response from inference server:', proxyRes.statusCode);

    // Handle response data to ensure content is a valid JSON string
    if (req.url.includes('/chat/completions')) {
      const originalBody = [];
      proxyRes.on('data', (chunk) => {
        originalBody.push(chunk);
      });

      proxyRes.on('end', () => {
        try {
          const bodyString = Buffer.concat(originalBody).toString();
          const bodyJson = JSON.parse(bodyString);

          // Check if content is an object and convert it to a string if needed
          if (bodyJson.choices && bodyJson.choices[0] && bodyJson.choices[0].message) {
            const { content } = bodyJson.choices[0].message;

            // If content is an object, stringify it
            if (content && typeof content === 'object') {
              bodyJson.choices[0].message.content = JSON.stringify(content);

              // Replace the response with our modified version
              const modifiedBody = JSON.stringify(bodyJson);
              res.setHeader('content-length', Buffer.byteLength(modifiedBody));
              res.end(modifiedBody);
              console.log('Modified response to ensure content is a valid JSON string');
            }
          }
        } catch (error) {
          console.error('Error processing proxy response:', error);
          // Continue with original response if there's an error
        }
      });
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send(`Proxy Error: ${err.message}`);
  },
});

app.use('/api/v1', inferenceProxy);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mockModeAvailable: true });
});

const PORT = process.env.PROXY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Forwarding requests from http://localhost:${PORT}/api/v1 to ${process.env.INFERENCE_SERVER_URL || 'http://localhost:1234'}`);
  console.log('Mock mode available: add ?mock=true to URL or set X-Use-Mock header to \'true\'');
});
