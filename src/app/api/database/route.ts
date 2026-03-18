import { NextRequest, NextResponse } from 'next/server'

// Database API - forwards to mini-service on port 3002
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, host, port, database, user, password, query } = body

    // Try to connect to database mini-service
    try {
      const response = await fetch('http://localhost:3002/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      // If mini-service is not available, provide demo mode
      if (action === 'connect') {
        return NextResponse.json({ 
          success: true, 
          message: 'Demo mode - database service not running' 
        })
      }

      if (action === 'tables') {
        return NextResponse.json({ 
          tables: ['users', 'sessions', 'logs'],
          message: 'Demo tables - start database service for real data'
        })
      }

      if (action === 'query') {
        // Simulate query results for demo
        if (query.toLowerCase().includes('select')) {
          return NextResponse.json({
            columns: ['id', 'name', 'email', 'created_at'],
            results: [
              { id: 1, name: 'Admin User', email: 'admin@myanos.local', created_at: new Date().toISOString() },
              { id: 2, name: 'Demo User', email: 'demo@myanos.local', created_at: new Date().toISOString() },
            ],
            message: 'Demo data - start database service for real data'
          })
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Query executed in demo mode' 
        })
      }

      return NextResponse.json({
        error: 'Database service not running. Start it with: cd mini-services/database && bun run dev'
      })
    }
  } catch (error: any) {
    console.error('Database Error:', error)
    return NextResponse.json(
      { error: error.message || 'Database operation failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    mode: 'demo',
    message: 'Database backend not running. Demo mode active.'
  })
}
