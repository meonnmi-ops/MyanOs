/**
 * MyanOS Termux Terminal Service
 * Run this on your Android Termux to connect to MyanOS
 * 
 * Installation on Termux:
 * 1. pkg install nodejs
 * 2. node termux-terminal.js
 * 
 * Or use Cloudflare tunnel:
 * 1. Install cloudflared: pkg install cloudflared
 * 2. Run: cloudflared tunnel --url http://localhost:3001
 */

const http = require('http');
const { exec } = require('child_process');
const url = require('url');

const PORT = 3001;
let currentCwd = process.env.HOME || '/data/data/com.termux/files/home';

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // Health check
  if (req.method === 'GET' && parsedUrl.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'MyanOS Termux Terminal',
      version: '1.0.0',
      port: PORT,
      cwd: currentCwd,
      shell: '/data/data/com.termux/files/usr/bin/bash',
      home: process.env.HOME,
      user: process.env.USER || 'u0_aXXX',
      platform: 'Android/Termux',
      arch: process.arch
    }, null, 2));
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy' }));
    return;
  }

  // Execute command
  if (req.method === 'POST' && parsedUrl.pathname === '/execute') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { command, cwd } = JSON.parse(body);

        if (!command) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Command required' }));
          return;
        }

        console.log(`[Terminal] Executing: ${command}`);

        // Handle cd command
        if (command.trim().startsWith('cd ')) {
          const dir = command.trim().slice(3).trim();
          let newDir = dir.startsWith('/') ? dir : `${currentCwd}/${dir}`;
          
          // Normalize path
          newDir = newDir.split('/').reduce((acc, part) => {
            if (part === '..') acc.pop();
            else if (part && part !== '.') acc.push(part);
            return acc;
          }, []).join('/') || '/';

          try {
            process.chdir(newDir);
            currentCwd = newDir;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ output: '', exitCode: 0 }));
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ output: `cd: ${dir}: ${err.message}`, exitCode: 1 }));
          }
          return;
        }

        // Handle clear
        if (command.trim() === 'clear') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ output: '\x1b[2J\x1b[H', exitCode: 0 }));
          return;
        }

        // Execute command
        exec(command, {
          cwd: cwd || currentCwd,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            LANG: 'en_US.UTF-8',
            HOME: process.env.HOME,
            PATH: process.env.PATH,
          },
          shell: '/data/data/com.termux/files/usr/bin/bash',
          timeout: 30000 // 30 second timeout
        }, (error, stdout, stderr) => {
          const output = stdout + (stderr ? '\n' + stderr : '');
          const exitCode = error ? error.code || 1 : 0;
          
          console.log(`[Terminal] Exit code: ${exitCode}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            output: output || '(no output)',
            exitCode: exitCode
          }));
        });

      } catch (error) {
        console.error('[Terminal] Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message, exitCode: 1 }));
      }
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        MyanOS Termux Terminal Service v1.0                ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  🚀 Server running on port ${PORT}                           ║`);
  console.log(`║  📁 Working directory: ${currentCwd.padEnd(31)}║`);
  console.log(`║  📱 Platform: Android/Termux                              ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  To expose via Cloudflare tunnel:                         ║');
  console.log('║  cloudflared tunnel --url http://localhost:3001           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
});
