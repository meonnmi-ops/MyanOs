'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, Trash2, Settings, Bot, User, Sparkles, Code, FileText, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface AIAgentAppProps {
  windowId: string
}

const API_KEY_STORAGE_KEY = 'myanos_api_key'

export function AIAgentApp({ windowId }: AIAgentAppProps) {
  const { 
    aiMessages, 
    addAIMessage, 
    clearAIMessages, 
    aiLoading,
    setAiLoading,
    language 
  } = useMyanOSStore()
  
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => {
    // Initialize from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      return localStorage.getItem(API_KEY_STORAGE_KEY) || ''
    }
    return ''
  })
  const [showSettings, setShowSettings] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [aiMessages])

  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return

    if (!apiKey) {
      setShowSettings(true)
      addAIMessage('assistant', language === 'mm' 
        ? '⚠️ API Key ထည့်သွင်းပါ။ Settings ကိုနှိပ်ပြီး API Key ထည့်သွင်းပါ။' 
        : '⚠️ Please enter your API Key. Click Settings to add your API key.')
      return
    }

    const userMessage = input.trim()
    addAIMessage('user', userMessage)
    setInput('')
    setAiLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          apiKey: apiKey,
          history: aiMessages.slice(-10) // Last 10 messages for context
        }),
      })

      const data = await response.json()

      if (data.response) {
        addAIMessage('assistant', data.response)
      } else if (data.error) {
        addAIMessage('assistant', `❌ Error: ${data.error}`)
      }
    } catch (error) {
      addAIMessage('assistant', language === 'mm' 
        ? '❌ ဆက်သွယ်မှု အမှားအယွင့်ဖြစ်နေပါသည်။' 
        : '❌ Connection error. Please try again.')
    }

    setAiLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const saveApiKey = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey)
    setShowSettings(false)
    addAIMessage('assistant', language === 'mm' 
      ? '✅ API Key သိမ်းဆည်းပြီးပါပြီ။' 
      : '✅ API Key saved successfully.')
  }

  const quickPrompts = [
    { icon: Code, text: language === 'mm' ? 'ကုဒ်ရေးပေးပါ' : 'Write code', prompt: language === 'mm' ? 'JavaScript နဲ့ ကုဒ်ရေးပေးပါ: ' : 'Write code in JavaScript: ' },
    { icon: FileText, text: language === 'mm' ? 'ရှင်းပြပါ' : 'Explain', prompt: language === 'mm' ? 'ဒါကို ရှင်းပြပါ: ' : 'Explain this: ' },
    { icon: Zap, text: language === 'mm' ? 'ပြုပြင်ပါ' : 'Fix', prompt: language === 'mm' ? 'ဒါကို ပြုပြင်ပေးပါ: ' : 'Fix this code: ' },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          <span className="text-slate-200 font-medium">
            {language === 'mm' ? 'အေအိုင်အေးဂျင့်' : 'AI Agent'}
          </span>
          <span className="text-xs text-slate-500">z-ai-web-dev-sdk</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={clearAIMessages}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {language === 'mm' ? 'ရှင်းလင်း' : 'Clear'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-3 h-3 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 bg-slate-800/30 border-b border-slate-700">
          <div className="flex gap-2">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API Key..."
              className="flex-1 bg-slate-900 border-slate-600 text-white"
            />
            <Button onClick={saveApiKey} className="bg-purple-600 hover:bg-purple-700">
              {language === 'mm' ? 'သိမ်းမည်' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {language === 'mm' 
              ? 'API Key သည် localStorage တွင်သာ သိမ်းဆည်းသည်။' 
              : 'API Key is stored only in localStorage.'}
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {aiMessages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {language === 'mm' ? 'အေအိုင်အေးဂျင့်ကို ကြိုဆိုပါသည်' : 'Welcome to AI Agent'}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {language === 'mm' 
                ? 'မေးမြန်းလိုသည်များကို ရေးသားပါ...' 
                : 'Ask me anything...'}
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              {quickPrompts.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => setInput(prompt.prompt)}
                >
                  <prompt.icon className="w-3 h-3 mr-1" />
                  {prompt.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {aiMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' 
                  ? 'bg-blue-600' 
                  : 'bg-purple-600'
              }`}>
                {msg.role === 'user' 
                  ? <User className="w-4 h-4 text-white" /> 
                  : <Bot className="w-4 h-4 text-white" />
                }
              </div>
              <div className={`flex-1 max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600/20 border border-blue-500/30' 
                  : 'bg-slate-800/50 border border-slate-700'
              }`}>
                <div className="text-sm text-slate-200 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-slate-700 bg-slate-900/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'mm' ? 'မက်ဆေ့ချ် ရိုက်ထည့်ပါ...' : 'Type your message...'}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={2}
            disabled={aiLoading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={aiLoading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 self-end"
          >
            {aiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
