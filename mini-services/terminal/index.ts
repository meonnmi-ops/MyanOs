/**
 * MyanOS Real Terminal Service
 * Executes actual Linux commands on your system
 * Port: 3001
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { spawn, execSync } from 'child_process'

const app = new Hono()

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// Store current working directory - use HOME or fallback
const HOME = process.env.HOME || '/home/user'
let currentCwd = HOME

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'online',
    service: 'MyanOS Terminal',
    version: '1.0.0',
    port: 3001,
    cwd: currentCwd,
    shell: '/bin/bash',
    home: HOME,
    user: process.env.USER || 'unknown',
    path: process.env.PATH?.split(':').slice(0, 5) || []
  })
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy' })
})

// Execute command
app.post('/execute', async (c) => {
  try {
    const body = await c.req.json()
    const { command, cwd } = body

    if (!command) {
      return c.json({ error: 'Command required' }, 400)
    }

    console.log(`[Terminal] Executing: ${command}`)

    // Handle cd command specially
    if (command.trim().startsWith('cd ')) {
      const dir = command.trim().slice(3).trim()
      let newDir = dir
      
      // Handle relative paths
      if (!dir.startsWith('/')) {
        newDir = `${currentCwd}/${dir}`.replace(/\/+/g, '/')
      }
      
      // Handle .. and .
      newDir = newDir.split('/').reduce((acc: string[], part) => {
        if (part === '..') acc.pop()
        else if (part && part !== '.') acc.push(part)
        return acc
      }, ['/']).join('/').replace('//', '/')
      
      try {
        process.chdir(newDir)
        currentCwd = newDir
        return c.json({ output: '', exitCode: 0 })
      } catch (err: any) {
        return c.json({ output: `cd: ${dir}: ${err.message}`, exitCode: 1 })
      }
    }

    // Handle clear command
    if (command.trim() === 'clear') {
      return c.json({ output: '\x1b[2J\x1b[H', exitCode: 0 })
    }

    // Handle exit command
    if (command.trim() === 'exit') {
      return c.json({ output: 'Goodbye!', exitCode: 0 })
    }

    // Execute command with bash
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      const proc = spawn('/bin/bash', ['-l', '-c', command], {
        cwd: cwd || currentCwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          LANG: 'en_US.UTF-8',
          HOME: HOME,
          USER: process.env.USER || 'user',
          PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin',
          SHELL: '/bin/bash',
          PWD: cwd || currentCwd,
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
        console.log(`[Terminal] Exit code: ${code}`)
        resolve({ stdout, stderr, code: code || 0 })
      })

      proc.on('error', (err) => {
        console.error(`[Terminal] Spawn error:`, err)
        resolve({ stdout: '', stderr: `Failed to execute: ${err.message}`, code: 1 })
      })
      
      // Timeout for long-running commands
      setTimeout(() => {
        proc.kill()
        resolve({ stdout, stderr: stderr + '\nCommand timed out (30s)', code: 124 })
      }, 30000)
    })

    const output = result.stdout + (result.stderr ? '\n' + result.stderr : '')
    
    return c.json({
      output: output || '(no output)',
      exitCode: result.code
    })
  } catch (error: any) {
    console.error('[Terminal] Error:', error)
    return c.json({
      output: `Error: ${error.message}`,
      error: error.message,
      exitCode: 1
    })
  }
})

// Get current directory
app.get('/cwd', (c) => {
  return c.json({ cwd: currentCwd })
})

// Start server
const PORT = 3001
console.log(`🚀 MyanOS Terminal Service running on port ${PORT}`)
console.log(`📁 Working directory: ${currentCwd}`)
console.log(`🐚 Shell: /bin/bash`)
console.log(`👤 User: ${process.env.USER || 'unknown'}`)

export default {
  port: PORT,
  fetch: app.fetch
}
