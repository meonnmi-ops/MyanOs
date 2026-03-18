/**
 * MyanOS Terminal Service v2.0
 * Real Linux terminal execution
 * Port: 3001
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const app = new Hono()

// Enable CORS for all origins
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// Configuration
const HOME = process.env.HOME || process.cwd()
let currentCwd = HOME
const PORT = 3001

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'online',
    service: 'MyanOS Terminal',
    version: '2.0.0',
    port: PORT,
    cwd: currentCwd,
    shell: '/bin/bash',
    home: HOME,
    user: process.env.USER || 'user',
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    uptime: process.uptime()
  })
})

app.get('/health', (c) => c.json({ status: 'healthy' }))

// Get current working directory
app.get('/cwd', (c) => c.json({ cwd: currentCwd }))

// Execute command - POST /execute or POST /
app.post('/execute', handleExecute)
app.post('/', handleExecute)

async function handleExecute(c: any) {
  try {
    const body = await c.req.json()
    const { command, cwd: requestedCwd } = body

    if (!command || typeof command !== 'string') {
      return c.json({ 
        output: '', 
        error: 'Command required', 
        exitCode: 1 
      })
    }

    const trimmed = command.trim()
    console.log(`[Terminal] Executing: ${trimmed}`)

    // Handle built-in commands
    // cd command
    if (trimmed.startsWith('cd ')) {
      const dir = trimmed.slice(3).trim()
      let newDir = dir
      
      if (!dir || dir === '~') {
        newDir = HOME
      } else if (dir.startsWith('~/')) {
        newDir = HOME + dir.slice(1)
      } else if (!dir.startsWith('/')) {
        newDir = `${currentCwd}/${dir}`
      }
      
      // Normalize path
      newDir = newDir.split('/').reduce((acc: string[], part) => {
        if (part === '..') acc.pop()
        else if (part && part !== '.') acc.push(part)
        return acc
      }, []).join('/') || '/'
      
      try {
        process.chdir(newDir)
        currentCwd = newDir
        return c.json({ output: '', exitCode: 0, cwd: currentCwd })
      } catch (err: any) {
        return c.json({ output: '', error: `cd: ${dir}: ${err.message}`, exitCode: 1 })
      }
    }

    // clear command
    if (trimmed === 'clear') {
      return c.json({ output: '\x1b[2J\x1b[H', exitCode: 0 })
    }

    // exit command
    if (trimmed === 'exit') {
      return c.json({ output: 'Goodbye!', exitCode: 0 })
    }

    // pwd command (fast path)
    if (trimmed === 'pwd') {
      return c.json({ output: currentCwd, exitCode: 0, cwd: currentCwd })
    }

    // whoami command (fast path)
    if (trimmed === 'whoami') {
      return c.json({ output: process.env.USER || 'user', exitCode: 0 })
    }

    // Execute shell command
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      const proc = spawn('/bin/bash', ['-l', '-c', trimmed], {
        cwd: requestedCwd || currentCwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          LANG: 'en_US.UTF-8',
          HOME: HOME,
          USER: process.env.USER || 'user',
          PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
          SHELL: '/bin/bash',
          PWD: requestedCwd || currentCwd,
        },
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        resolve({ stdout, stderr, code: code ?? 0 })
      })

      proc.on('error', (err) => {
        resolve({ stdout: '', stderr: err.message, code: 1 })
      })

      // 60 second timeout
      setTimeout(() => {
        proc.kill('SIGTERM')
        resolve({ stdout, stderr: stderr + '\n⏱️ Command timed out (60s)', code: 124 })
      }, 60000)
    })

    const output = result.stdout + (result.stderr ? '\n' + result.stderr : '')
    
    console.log(`[Terminal] Exit code: ${result.code}`)
    
    return c.json({
      output: output || '',
      error: '',
      exitCode: result.code,
      cwd: currentCwd
    })

  } catch (error: any) {
    console.error('[Terminal] Error:', error)
    return c.json({
      output: '',
      error: error.message || 'Unknown error',
      exitCode: 1
    })
  }
}

// Start server
console.log('')
console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║           MyanOS Terminal Service v2.0                     ║')
console.log('╠════════════════════════════════════════════════════════════╣')
console.log(`║  🚀 Server running on port ${PORT}                           ║`)
console.log(`║  📁 Working directory: ${currentCwd.slice(0, 31).padEnd(31)}║`)
console.log(`║  🐚 Shell: /bin/bash                                      ║`)
console.log(`║  👤 User: ${(process.env.USER || 'user').slice(0, 43).padEnd(43)}║`)
console.log(`║  📱 Platform: ${process.platform.padEnd(44)}║`)
console.log('╚════════════════════════════════════════════════════════════╝')
console.log('')

export default {
  port: PORT,
  fetch: app.fetch
}
