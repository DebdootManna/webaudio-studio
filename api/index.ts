/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// This is a simple proxy that forwards requests to the Python FastAPI backend
import { createServer } from 'http';
import { parse } from 'url';
import fetch from 'node-fetch';
import { createProxyServer } from 'http-proxy';

// URL of your FastAPI backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Create a proxy server instance
const proxy = createProxyServer({
  target: BACKEND_URL,
  changeOrigin: true,
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  // @ts-ignore
  res.writeHead(500, {
    'Content-Type': 'text/plain',
  });
  // @ts-ignore
  res.end('Proxy error');
});

// Create the server
const server = createServer((req, res) => {
  const parsedUrl = parse(req.url || '', true);
  const { pathname } = parsedUrl;
  
  // Only proxy API routes
  if (pathname?.startsWith('/api/')) {
    proxy.web(req, res);
  } else {
    // For non-API routes, return 404
    res.writeHead(404, {
      'Content-Type': 'text/plain',
    });
    res.end('Not found');
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`API proxy listening on port ${PORT}`);
});

export default server;