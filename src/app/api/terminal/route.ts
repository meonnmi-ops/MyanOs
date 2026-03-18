import { NextRequest, NextResponse } from 'next/server'

// Terminal API - supports local and external (Termux) connections
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command, endpoint, cwd } = body

    if (!command) {
      return NextResponse.json({ error: 'Command required' }, { status: 400 })
    }

    // If no endpoint, use local terminal service
    const terminalUrl = endpoint || 'http://localhost:3001'
    const cleanUrl = terminalUrl.replace(/\/$/, '')
    
    const isRemote = endpoint && (endpoint.includes('trycloudflare.com') || !endpoint.includes('localhost'))
    
    console.log(`[Terminal] ${isRemote ? 'Remote' : 'Local'}: ${command}`)
    console.log(`[Terminal] Endpoint: ${cleanUrl}`)

    // Forward to terminal service
    const response = await fetch(`${cleanUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, cwd }),
      signal: AbortSignal.timeout(isRemote ? 60000 : 30000), // Longer timeout for remote
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        output: '', 
        error: `Terminal error (${response.status}): ${errorText.slice(0, 200)}`, 
        exitCode: 1 
      })
    }

    const data = await response.json()
    
    return NextResponse.json({
      output: data.output || '',
      error: data.error || '',
      exitCode: data.exitCode ?? data.code ?? 0,
      cwd: data.cwd
    })
    
  } catch (error: any) {
    console.error('Terminal Error:', error)
    
    let errorMessage = error.message || 'Terminal service not available'
    
    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout - Check if terminal service is running'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Terminal service not running. Start: cd mini-services/terminal && bun run dev'
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Could not resolve hostname - Check your internet connection'
    } else if (error.code === 'ERR_INVALID_URL') {
      errorMessage = 'Invalid terminal endpoint URL'
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
  const endpoint = searchParams.get('endpoint') || 'http://localhost:3001'
  
  const cleanEndpoint = endpoint.replace(/\/$/, '')
  const isRemote = endpoint.includes('trycloudflare.com') || !endpoint.includes('localhost')
  
  try {
    const response = await fetch(cleanEndpoint, {
      method: 'GET',
      signal: AbortSignal.timeout(isRemote ? 10000 : 5000),
    })
    const data = await response.json()
    
    return NextResponse.json({
      ...data,
      connected: true,
      endpoint: cleanEndpoint,
      isRemote
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'offline',
      connected: false,
      error: error.message,
      hint: 'Start terminal service: cd mini-services/terminal && bun run dev',
      endpoint: cleanEndpoint,
      isRemote
    })
  }
}
