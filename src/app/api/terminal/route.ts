import { NextRequest, NextResponse } from 'next/server'

// Terminal API - proxies to terminal service on port 3001
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command } = body

    if (!command) {
      return NextResponse.json({ error: 'Command required' }, { status: 400 })
    }

    // Forward to terminal service on port 3001
    const response = await fetch('http://localhost:3001/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Terminal Error:', error)
    return NextResponse.json(
      { error: error.message || 'Terminal service not available' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const response = await fetch('http://localhost:3001/')
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({
      status: 'offline',
      error: 'Terminal service not running. Start it with: cd mini-services/terminal && bun run dev'
    })
  }
}
