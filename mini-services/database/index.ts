/**
 * MyanOS Database Service
 * PostgreSQL connection backend
 * Port: 3002
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// Store connections (in production, use connection pool)
const connections = new Map<string, any>()

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'online',
    service: 'MyanOS Database',
    version: '1.0.0',
    port: 3002
  })
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy' })
})

// API endpoint
app.post('/api', async (c) => {
  try {
    const body = await c.req.json()
    const { action, host, port, database, user, password, query } = body

    const connectionKey = `${host}:${port}:${database}`

    switch (action) {
      case 'connect': {
        // Test connection
        try {
          const { Client } = await import('pg')
          const client = new Client({
            host: host || 'localhost',
            port: parseInt(port || '5432'),
            database: database || 'myanos',
            user: user || 'myanos',
            password: password || 'myanos123',
          })
          
          await client.connect()
          await client.end()
          
          return c.json({ success: true, message: 'Connection successful' })
        } catch (err: any) {
          return c.json({ 
            success: false, 
            error: `Connection failed: ${err.message}` 
          })
        }
      }

      case 'tables': {
        try {
          const { Client } = await import('pg')
          const client = new Client({
            host: host || 'localhost',
            port: parseInt(port || '5432'),
            database: database || 'myanos',
            user: user || 'myanos',
            password: password || 'myanos123',
          })
          
          await client.connect()
          
          const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
          `)
          
          await client.end()
          
          return c.json({ 
            tables: result.rows.map((r: any) => r.table_name) 
          })
        } catch (err: any) {
          return c.json({ error: err.message })
        }
      }

      case 'query': {
        if (!query) {
          return c.json({ error: 'Query required' }, 400)
        }

        try {
          const { Client } = await import('pg')
          const client = new Client({
            host: host || 'localhost',
            port: parseInt(port || '5432'),
            database: database || 'myanos',
            user: user || 'myanos',
            password: password || 'myanos123',
          })
          
          await client.connect()
          
          const result = await client.query(query)
          
          await client.end()
          
          return c.json({
            columns: result.fields?.map((f: any) => f.name) || [],
            results: result.rows || [],
            rowCount: result.rowCount || 0
          })
        } catch (err: any) {
          return c.json({ error: err.message })
        }
      }

      default:
        return c.json({ error: 'Unknown action' }, 400)
    }
  } catch (error: any) {
    console.error('[Database] Error:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Start server
const PORT = 3002
console.log(`🗄️ MyanOS Database Service running on port ${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch
}
