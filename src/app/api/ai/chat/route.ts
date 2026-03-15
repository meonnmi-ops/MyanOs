import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, apiKey, history = [] } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    // Use z-ai-web-dev-sdk for AI chat
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    
    const zai = await ZAI.create()
    
    // Build messages array
    const messages = [
      {
        role: 'assistant' as const,
        content: 'You are a helpful AI assistant. You can help with coding, writing, analysis, and general questions. Respond in a helpful and friendly manner. If the user writes in Myanmar (Burmese), respond in Myanmar.'
      },
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' }
    })

    const response = completion.choices[0]?.message?.content

    return NextResponse.json({ response })
  } catch (error: any) {
    console.error('AI Chat Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}
