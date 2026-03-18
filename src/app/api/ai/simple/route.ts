import { NextRequest, NextResponse } from 'next/server'

// Simple non-streaming chat for testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      message, 
      apiKey, 
      provider = 'default', 
      model = 'glm-4-flash',
      history = [],
      systemPrompt = 'You are a helpful AI assistant. Respond in the same language the user writes in. If user writes in Myanmar (Burmese), respond in Myanmar.',
    } = body

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Use z-ai-web-dev-sdk for default/free provider
    if (provider === 'default' || !apiKey) {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10).map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          { role: 'user', content: message }
        ],
        model: model,
        thinking: { type: 'disabled' }
      })

      const response = completion.choices[0]?.message?.content || ''
      
      return NextResponse.json({ 
        response,
        provider: 'ZAI (Free)',
        model 
      })
    }

    // Use OpenAI-compatible API for other providers
    let apiEndpoint = body.baseUrl

    switch (provider) {
      case 'openai':
        apiEndpoint = apiEndpoint || 'https://api.openai.com/v1'
        break
      case 'anthropic':
        apiEndpoint = apiEndpoint || 'https://api.anthropic.com/v1'
        break
      case 'groq':
        apiEndpoint = apiEndpoint || 'https://api.groq.com/openai/v1'
        break
      case 'deepseek':
        apiEndpoint = apiEndpoint || 'https://api.deepseek.com/v1'
        break
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message }
    ]

    const resp = await fetch(`${apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    })

    const data = await resp.json()
    const content = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ 
      response: content,
      provider,
      model,
      usage: data.usage
    })
  } catch (error: any) {
    console.error('Chat Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to get response',
      details: error.toString()
    }, { status: 500 })
  }
}
