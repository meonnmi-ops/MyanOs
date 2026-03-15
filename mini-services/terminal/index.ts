/**
 * MyanOS Terminal Service
 * Real command execution backend
 * Port: 3001
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const app = new Hono()

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'online',
    service: 'MyanOS Terminal',
    version: '1.0.0',
    port: 3001
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

    // Execute command with timeout
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      cwd: cwd || '/home/z/my-project',
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        LANG: 'en_US.UTF-8'
      }
    })

    const output = stdout + stderr
    
    return c.json({
      output: output || '(no output)',
      exitCode: 0
    })
  } catch (error: any) {
    console.error('[Terminal] Error:', error.message)
    
    // Return error output
    return c.json({
      output: error.stdout || error.stderr || error.message,
      exitCode: error.code || 1,
      error: error.message
    })
  }
})

// Start server
const PORT = 3001
console.log(`🚀 MyanOS Terminal Service running on port ${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch
}
