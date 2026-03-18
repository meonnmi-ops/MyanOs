import { NextRequest, NextResponse } from 'next/server'

// Voice transcription API using z-ai-web-dev-sdk ASR
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ 
        success: false, 
        error: 'No audio file provided' 
      }, { status: 400 })
    }

    // Convert audio to buffer
    const arrayBuffer = await audio.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:audio/wav;base64,${base64}`

    // Use z-ai-web-dev-sdk for ASR
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    
    const result = await zai.asr.transcribe({
      audio: dataUrl
    })

    if (result && result.text) {
      return NextResponse.json({ 
        success: true, 
        text: result.text 
      })
    }

    return NextResponse.json({ 
      success: false, 
      error: 'No transcription result' 
    })
  } catch (error: any) {
    console.error('Voice transcription error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Transcription failed' 
    }, { status: 500 })
  }
}
