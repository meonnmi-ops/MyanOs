'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, Trash2, Settings, Bot, User, Sparkles, Code, FileText, Zap, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useMyanOSStore } from '@/stores/myanos-store'

interface AIAgentAppProps {
  windowId: string
}

const API_KEY_STORAGE_KEY = 'myanos_api_key'

export function AIAgentApp({ windowId: _windowId }: AIAgentAppProps) {
  const { language, aiMessages, addAIMessage, clearAIMessages, aiLoading, setAiLoading } = useMyanOSStore()
  
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => {
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
        ? '⚠️ API Key လိုအပ်ပါသည်။ Settings တွင် ထည့်ပါ။' 
        : '⚠️ Please enter your API Key in Settings.')
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
        body: JSON.stringify({ message: userMessage, apiKey }),
      })
      const data = await response.json()

      if (data.response) {
        addAIMessage('assistant', data.response)
      } else if (data.error) {
        addAIMessage('assistant', `❌ Error: ${data.error}`)
      }
    } catch {
      addAIMessage('assistant', language === 'mm' 
        ? '❌ ဆက်သွယ်မှု အမှားအယွင့်' 
        : '❌ Connection error')
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
    addAIMessage('assistant', language === 'mm' ? '✅ API Key သိမ်းဆည်းပြီးပါပြီ' : '✅ API Key saved')
  }

  const quickPrompts = [
    { icon: Code, text: language === 'mm' ? 'ကုဒ်ရေးပါ' : 'Write code', prompt: language === 'mm' ? 'JavaScript နဲ့ ကုဒ်ရေးပေးပါ: ' : 'Write JavaScript code: ' },
    { icon: FileText, text: language === 'mm' ? 'ရှင်းပြပါ' : 'Explain', prompt: language === 'mm' ? 'ဒါကို ရှင်းပြပါ: ' : 'Explain this: ' },
    { icon: Zap, text: language === 'mm' ? 'ပြုပြင်ပါ' : 'Fix', prompt: language === 'mm' ? 'ဒါကို ပြုပြင်ပေးပါ: ' : 'Fix this: ' },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span className="text-slate-200 text-xs font-medium">{language === 'mm' ? 'အေအိုင်အေးဂျင့်' : 'AI Agent'}</span>
          <span className="text-[10px] text-slate-500">z-ai-web-dev-sdk</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" onClick={clearAIMessages}>
            <Trash2 className="w-3 h-3 mr-0.5" />{language === 'mm' ? 'ရှင်းလင်း' : 'Clear'}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-3 h-3 mr-0.5" />Settings
          </Button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="p-2 bg-slate-800/30 border-b border-slate-700">
          <div className="flex gap-1.5">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key"
              className="flex-1 h-7 bg-slate-900 border-slate-600 text-white text-xs"
            />
            <Button onClick={saveApiKey} className="h-7 bg-purple-600 hover:bg-purple-700 text-xs">{language === 'mm' ? 'သိမ်းမည်' : 'Save'}</Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {aiMessages.length === 0 && (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-white mb-1">{language === 'mm' ? 'အေအိုင်အေးဂျင့်ကို ကြိုဆိုပါသည်' : 'Welcome to AI Agent'}</h3>
            <p className="text-slate-400 text-xs mb-3">{language === 'mm' ? 'မေးမြန်းလိုသည်များကို ရေးသားပါ...' : 'Ask me anything...'}</p>
            <div className="flex justify-center gap-1.5 flex-wrap">
              {quickPrompts.map((prompt, i) => (
                <Button key={i} variant="outline" size="sm" className="h-6 text-[10px] bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => setInput(prompt.prompt)}>
                  <prompt.icon className="w-3 h-3 mr-0.5" />{prompt.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {aiMessages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                {msg.role === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
              </div>
              <div className={`flex-1 max-w-[85%] rounded-lg p-2 text-xs ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-800/50 border border-slate-700'}`}>
                <div className="text-slate-200 prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center"><Bot className="w-3 h-3 text-white" /></div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2"><Loader2 className="w-3 h-3 animate-spin text-purple-400" /></div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-2 border-t border-slate-700 bg-slate-900/50">
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'mm' ? 'မက်ဆေ့ချ် ရိုက်ထည့်ပါ...' : 'Type your message...'}
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-xs resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
            rows={2}
            disabled={aiLoading}
          />
          <Button onClick={sendMessage} disabled={aiLoading || !input.trim()} className="bg-purple-600 hover:bg-purple-700 self-end h-7">
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
