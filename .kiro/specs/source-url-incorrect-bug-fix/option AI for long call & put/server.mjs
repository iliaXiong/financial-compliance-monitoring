#!/usr/bin/env node
/**
 * Options Trading Tool - Web Server
 * 期权交易工具 - Web服务器
 * 
 * Simple HTTP server to serve the frontend and handle API requests
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle API routes (for future backend integration)
  if (req.url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }
  
  // Serve static files
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Get file extension
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  // Read and serve file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

/**
 * Handle API requests
 * This is a placeholder for future backend integration with DialogEngine
 */
function handleApiRequest(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  
  // Parse URL
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Route handling
  if (url.pathname === '/api/session/start' && req.method === 'POST') {
    // Start new session
    const sessionId = 'session-' + Date.now();
    res.end(JSON.stringify({ sessionId, message: 'Session started' }));
    
  } else if (url.pathname === '/api/dialog/process' && req.method === 'POST') {
    // Process dialog input
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { sessionId, input } = JSON.parse(body);
        // TODO: Integrate with DialogEngine here
        // For now, return mock response
        res.end(JSON.stringify({
          message: 'Backend integration pending. Using frontend mock for now.',
          state: 'AWAITING_UNDERLYING',
          options: ['帮助']
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
  }
}

// Start server
server.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 期权交易助手 - Options Trading Assistant');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n✅ Server is running!`);
  console.log(`\n🌐 Open your browser and visit:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n💡 Press Ctrl+C to stop the server\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped\n');
    process.exit(0);
  });
});
