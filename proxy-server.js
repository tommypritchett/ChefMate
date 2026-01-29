const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3002;

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001/api',
  changeOrigin: true,
  pathRewrite: { '^/api': '' },  // Strip /api since target already has it
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Handle React routing - serve index.html for all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 ChefMate proxy server running on http://localhost:${PORT}`);
});
