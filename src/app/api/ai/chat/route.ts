import { NextRequest, NextResponse } from 'next/server'

// AI Chat API - Supports multiple providers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      message, 
      apiKey, 
      provider = 'default', 
      model = 'glm-4-flash',
      baseUrl,
      history = [],
      systemPrompt = 'You are a helpful AI assistant.',
      temperature = 0.7,
      maxTokens = 4096,
      images = [],
    } = body

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-20),
    ]
    
    // Add user message with images if provided
    if (images.length > 0) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          ...images.map((img: string) => ({
            type: 'image_url',
            image_url: { url: img }
          }))
        ]
      })
    } else {
      messages.push({ role: 'user', content: message })
    }

    // Set up streaming response
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Start streaming in background
    ;(async () => {
      try {
        // Use z-ai-web-dev-sdk for default provider
        if (provider === 'default' || !apiKey) {
          const ZAI = (await import('z-ai-web-dev-sdk')).default
          const zai = await ZAI.create()
          
          const completion = await zai.chat.completions.create({
            messages: messages.map(m => ({
              role: m.role as 'system' | 'user' | 'assistant',
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            })),
            model: model,
            temperature: temperature,
            max_tokens: maxTokens,
            stream: true,
          })

          let fullContent = ''
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`))
            }
          }

          await writer.write(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done', 
            message: { 
              id: `msg-${Date.now()}`, 
              role: 'assistant', 
              content: fullContent,
              createdAt: new Date().toISOString()
            }
          })}\n\n`))
        } else {
          // Use OpenAI-compatible API for other providers
          let apiEndpoint = baseUrl
          let actualModel = model

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
            case 'google':
              apiEndpoint = apiEndpoint || 'https://generativelanguage.googleapis.com/v1beta'
              actualModel = model || 'gemini-pro'
              break
          }

          const response = await fetch(`${apiEndpoint}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: actualModel,
              messages,
              temperature,
              max_tokens: maxTokens,
              stream: true,
            }),
          })

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error('No reader')

          const decoder = new TextDecoder()
          let fullContent = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
            
            for (const line of lines) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  fullContent += content
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`))
                }
              } catch {}
            }
          }

          await writer.write(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done', 
            message: { 
              id: `msg-${Date.now()}`, 
              role: 'assistant', 
              content: fullContent,
              createdAt: new Date().toISOString()
            }
          })}\n\n`))
        }
      } catch (error: any) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          error: error.message || 'Failed to get response' 
        })}\n\n`))
      } finally {
        await writer.close()
      }
    })()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('AI Chat Error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
