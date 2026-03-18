import { NextRequest, NextResponse } from 'next/server'

// Terminal API - supports local and external (Termux) connections
// Endpoints:
// - Local: http://localhost:3001
// - Termux via Cloudflare: https://xxx.trycloudflare.com

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command, endpoint } = body

    if (!command) {
      return NextResponse.json({ error: 'Command required' }, { status: 400 })
    }

    // Determine which terminal endpoint to use
    let terminalUrl = endpoint || process.env.TERMUX_ENDPOINT || 'http://localhost:3001'
    
    // Remove trailing slash
    terminalUrl = terminalUrl.replace(/\/$/, '')
    
    // Determine if it's a Termux endpoint (Cloudflare tunnel)
    const isTermux = terminalUrl.includes('trycloudflare.com') || terminalUrl.includes('termux')
    
    // Set the execute path based on endpoint type
    const executePath = '/execute'  // Both use /execute
    
    console.log(`[Terminal] Connecting to: ${terminalUrl}`)
    console.log(`[Terminal] Type: ${isTermux ? 'Termux/Cloudflare' : 'Local'}`)
    console.log(`[Terminal] Executing: ${command}`)

    // Forward to terminal service
    const response = await fetch(`${terminalUrl}${executePath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
      signal: AbortSignal.timeout(60000), // 60 second timeout for remote
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { output: '', error: `Terminal error: ${response.status} - ${errorText}`, exitCode: 1 },
        { status: 200 } // Return 200 with error in body
      )
    }

    const data = await response.json()
    
    // Normalize response format
    return NextResponse.json({
      output: data.output || '',
      error: data.error || '',
      exitCode: data.exitCode ?? data.code ?? 0
    })
    
  } catch (error: any) {
    console.error('Terminal Error:', error)
    
    // Provide helpful error messages
    let errorMessage = error.message || 'Terminal service not available'
    
    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      errorMessage = '⏱️ Connection timeout - Check if terminal service is running'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '🔌 Terminal service not running. Start: cd mini-services/terminal && bun run dev'
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = '🌐 Could not resolve hostname - Check your internet connection'
    } else if (error.code === 'ERR_INVALID_URL') {
      errorMessage = '🔗 Invalid terminal endpoint URL'
    }
    
    return NextResponse.json({
      output: '',
      error: errorMessage,
      exitCode: 1
    })
  }
}

// Health check - returns terminal service status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || process.env.TERMUX_ENDPOINT || 'http://localhost:3001'
  
  try {
    const cleanEndpoint = endpoint.replace(/\/$/, '')
    
    const response = await fetch(cleanEndpoint, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    const data = await response.json()
    
    return NextResponse.json({
      ...data,
      connected: true,
      endpoint: cleanEndpoint
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'offline',
      connected: false,
      error: error.message,
      hint: 'Start terminal service: cd mini-services/terminal && bun run dev',
      endpoint: endpoint
    })
  }
}
