'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { useMyanOSStore } from '@/stores/myanos-store'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  MessageSquare, Plus, Trash2, Send, Sparkles, Bot, User, Key, 
  Clock, Zap, CheckCircle2, Settings2, Sliders, Copy, Check, 
  Paperclip, RotateCcw, Code, Image as ImageIcon, Globe, Mic, 
  MicOff, X, RefreshCw, Bookmark, Pin, PinOff, Search
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  type?: string
  createdAt: string
}

interface ChatSession {
  id: string
  title: string
  pinned?: boolean
  systemPrompt?: string
  temperature?: number
  messages: Message[]
  createdAt: string
}

interface AIAgentAppProps {
  windowId: string
}

const API_PROVIDERS = [
  { id: 'default', name: 'ZAI (Free)', models: ['glm-4-flash', 'glm-4'] },
  { id: 'groq', name: 'Groq (Fast)', models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet', 'claude-3-opus'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'custom', name: 'Custom', models: [] },
]

const DEFAULT_TEMPLATES = [
  { id: '1', name: 'Project Builder', icon: '🚀', systemPrompt: 'You are an expert Full-Stack Developer. Build complete projects with clean, production-ready code.', temperature: 0.7 },
  { id: '2', name: 'Coder', icon: '💻', systemPrompt: 'You are an expert programmer. Write clean, efficient, well-documented code.', temperature: 0.3 },
  { id: '3', name: 'Writer', icon: '✍️', systemPrompt: 'You are a creative writing expert. Craft engaging, well-structured content.', temperature: 0.9 },
  { id: '4', name: 'Myanmar Tutor', icon: '🇲🇲', systemPrompt: 'You are a Myanmar language tutor. Teach Myanmar language clearly with examples. If user writes in Myanmar, respond in Myanmar.', temperature: 0.6 },
]

function CodeBlock({ code, language, isDark }: { code: string; language: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-slate-600">
      <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5 text-xs">
        <span className="font-mono text-slate-400">{language || 'code'}</span>
        <Button variant="ghost" size="sm" className="h-5 px-1.5" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <SyntaxHighlighter 
        language={language || 'text'} 
        style={isDark ? oneDark : oneLight} 
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.75rem', background: '#0f172a' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          if (!match) return <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300" {...props}>{children}</code>
          return <CodeBlock code={String(children).replace(/\n$/, '')} language={match[1]} isDark={true} />
        },
        pre: ({ children }) => <>{children}</>,
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        a: ({ href, children }) => <a href={href} className="text-cyan-400 underline hover:text-cyan-300" target="_blank" rel="noopener noreferrer">{children}</a>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mb-1">{children}</h3>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-500 pl-3 italic text-slate-400">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export function AIAgentApp({ windowId: _windowId }: AIAgentAppProps) {
  const { language, aiMessages, addAIMessage, clearAIMessages } = useMyanOSStore()
  const { toast } = useToast()
  
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('default')
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('glm-4-flash')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant. Respond in the same language the user writes in. If user writes in Myanmar, respond in Myanmar.')
  const [temperature, setTemperature] = useState(0.7)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('myanos-ai-sessions')
    if (saved) {
      try {
        setSessions(JSON.parse(saved))
      } catch {}
    }
    
    const savedProvider = localStorage.getItem('myanos-ai-provider')
    const savedApiKey = localStorage.getItem('myanos-ai-key')
    const savedModel = localStorage.getItem('myanos-ai-model')
    
    if (savedProvider) setSelectedProvider(savedProvider)
    if (savedApiKey) setApiKey(savedApiKey)
    if (savedModel) setSelectedModel(savedModel)
  }, [])

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('myanos-ai-sessions', JSON.stringify(sessions))
  }, [sessions])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const createNewSession = (template?: typeof DEFAULT_TEMPLATES[0]) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: language === 'mm' ? 'စကားဝိုင်းအသစ်' : 'New Chat',
      systemPrompt: template?.systemPrompt || systemPrompt,
      temperature: template?.temperature ?? temperature,
      messages: [],
      createdAt: new Date().toISOString(),
    }
    setSessions([newSession, ...sessions])
    setCurrentSession(newSession)
    setMessages([])
    setTemplatesOpen(false)
  }

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session)
    setMessages(session.messages)
  }

  const deleteSession = (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId))
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      setMessages([])
    }
    toast({ title: language === 'mm' ? 'ဖျက်ပြီးပြီ' : 'Deleted' })
  }

  const togglePin = (sessionId: string) => {
    setSessions(sessions.map(s => 
      s.id === sessionId ? { ...s, pinned: !s.pinned } : s
    ))
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      type: uploadedImages.length ? 'vision' : 'text',
      createdAt: new Date().toISOString(),
    }
    
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputMessage('')
    setUploadedImages([])
    setIsLoading(true)

    // Update session title if first message
    if (newMessages.length === 1 && currentSession) {
      const title = inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '')
      setSessions(sessions.map(s => s.id === currentSession.id ? { ...s, title } : s))
    }

    try {
      const savedApiKey = localStorage.getItem(`apikey_${selectedProvider}`)
      const actualApiKey = selectedProvider === 'default' ? '' : (savedApiKey || apiKey)

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          apiKey: actualApiKey,
          provider: selectedProvider,
          model: selectedModel,
          history: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          systemPrompt: currentSession?.systemPrompt || systemPrompt,
          temperature: currentSession?.temperature ?? temperature,
          images: uploadedImages,
        }),
      })

      const data = await response.json()

      if (data.response) {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: data.response,
          createdAt: new Date().toISOString(),
        }
        const finalMessages = [...newMessages, assistantMessage]
        setMessages(finalMessages)
        
        // Update session
        if (currentSession) {
          setSessions(sessions.map(s => 
            s.id === currentSession.id ? { ...s, messages: finalMessages } : s
          ))
        }
      } else {
        toast({ title: data.error || 'Error', variant: 'destructive' })
        setMessages(newMessages.slice(0, -1))
      }
    } catch (error: any) {
      toast({ title: error.message || 'Error', variant: 'destructive' })
      setMessages(newMessages.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const regenerateResponse = async () => {
    if (messages.length < 2 || isLoading) return
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setMessages(messages.slice(0, -1))
    setInputMessage(lastUser.content)
    setTimeout(() => sendMessage(), 100)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setUploadedImages(prev => [...prev, base64])
      }
      reader.readAsDataURL(file)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const fd = new FormData()
        fd.append('audio', blob, 'rec.wav')
        try {
          const response = await fetch('/api/voice', { method: 'POST', body: fd })
          const data = await response.json()
          if (data.text) setInputMessage(data.text)
        } catch {}
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setIsRecording(true)
    } catch {
      toast({ title: language === 'mm' ? 'မိုက်ခရိုဖုန်းခွင့်ပြုပါ' : 'Mic permission denied', variant: 'destructive' })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const saveSettings = () => {
    localStorage.setItem('myanos-ai-provider', selectedProvider)
    localStorage.setItem('myanos-ai-key', apiKey)
    localStorage.setItem('myanos-ai-model', selectedModel)
    if (apiKey) localStorage.setItem(`apikey_${selectedProvider}`, apiKey)
    setSettingsOpen(false)
    toast({ title: language === 'mm' ? 'သိမ်းပြီးပြီ' : 'Saved' })
  }

  const currentProvider = API_PROVIDERS.find(p => p.id === selectedProvider)

  return (
    <div className="h-full flex bg-slate-950">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-0'} transition-all duration-300 border-r border-slate-700 bg-slate-900 overflow-hidden flex-shrink-0`}>
        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">AI Agent</span>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => createNewSession()}>
              <Plus className="h-3 w-3 mr-1" />
              {language === 'mm' ? 'အသစ်' : 'New'}
            </Button>
            <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                  <Bookmark className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-white">{language === 'mm' ? 'တမ်းပလိတ်များ' : 'Templates'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2 py-3">
                  {DEFAULT_TEMPLATES.map(t => (
                    <Card 
                      key={t.id} 
                      className="bg-slate-800 border-slate-600 cursor-pointer hover:bg-slate-700"
                      onClick={() => createNewSession(t)}
                    >
                      <CardContent className="p-3">
                        <div className="text-xl mb-1">{t.icon}</div>
                        <p className="text-xs font-medium">{t.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">{language === 'mm' ? 'စကားဝိုင်းမရှိသေးပါ' : 'No chats yet'}</p>
              </div>
            ) : (
              sessions.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(s => (
                <div
                  key={s.id}
                  onClick={() => selectSession(s)}
                  className={`p-2 rounded-lg cursor-pointer group transition-all ${
                    currentSession?.id === s.id 
                      ? 'bg-cyan-600 text-white' 
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {s.pinned && <Pin className="h-2.5 w-2.5 flex-shrink-0" />}
                      <MessageSquare className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate text-xs">{s.title}</span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); togglePin(s.id) }}
                      >
                        {s.pinned ? <PinOff className="h-2.5 w-2.5" /> : <Pin className="h-2.5 w-2.5" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-slate-700">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-start">
                <Key className="h-3 w-3 mr-1.5" />
                API {apiKey && <CheckCircle2 className="h-3 w-3 ml-auto text-green-400" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  API Settings
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Provider</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger className="h-8 bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {API_PROVIDERS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedProvider !== 'default' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400">API Key</Label>
                      <Input 
                        type="password" 
                        placeholder="sk-..." 
                        value={apiKey} 
                        onChange={e => setApiKey(e.target.value)}
                        className="h-8 bg-slate-800 border-slate-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400">Model</Label>
                      {currentProvider?.models.length ? (
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger className="h-8 bg-slate-800 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            {currentProvider.models.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input 
                          value={selectedModel} 
                          onChange={e => setSelectedModel(e.target.value)}
                          className="h-8 bg-slate-800 border-slate-600"
                        />
                      )}
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={saveSettings}>Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-9 border-b border-slate-700 flex items-center px-3 gap-2 bg-slate-900/50">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Bot className="h-4 w-4 text-cyan-400" />
          <span className="font-medium text-sm truncate flex-1">
            {currentSession?.title || (language === 'mm' ? 'အေအိုင်အေးဂျင့်' : 'AI Agent')}
          </span>
          <Badge variant="secondary" className="text-[10px] h-5">
            {currentProvider?.name || 'ZAI'}
          </Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Card className="w-full max-w-sm bg-slate-900 border-slate-700">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-3 p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20">
                    <Sparkles className="h-8 w-8 text-cyan-400" />
                  </div>
                  <CardTitle className="text-lg">AI Agent</CardTitle>
                  <CardDescription className="text-xs">
                    {language === 'mm' ? 'အေအိုင်အေးဂျင့် - မြန်မာဘာသာပါ' : 'Full-featured AI Assistant'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-3">
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <Badge variant="outline" className="text-[10px]"><Code className="h-2.5 w-2.5 mr-1" />Code</Badge>
                    <Badge variant="outline" className="text-[10px]"><ImageIcon className="h-2.5 w-2.5 mr-1" />Vision</Badge>
                    <Badge variant="outline" className="text-[10px]"><Globe className="h-2.5 w-2.5 mr-1" />Multi-lang</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {['Write code', 'Explain AI', 'Debug', 'Create app'].map(p => (
                      <Button 
                        key={p} 
                        variant="outline" 
                        size="sm" 
                        className="h-6 text-[10px]" 
                        onClick={() => setInputMessage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3 pb-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className={m.role === 'user' ? 'bg-cyan-600' : 'bg-slate-700'}>
                      {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`rounded-xl px-3 py-2 max-w-[85%] text-sm ${
                    m.role === 'user' 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-slate-800 border border-slate-700'
                  }`}>
                    {m.role === 'assistant' ? (
                      <MarkdownContent content={m.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-slate-700">
                      <Bot className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1 text-cyan-400">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span className="text-xs">{language === 'mm' ? 'တွေးနေသည်...' : 'Thinking...'}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-slate-700 p-2 bg-slate-900/50">
          <div className="max-w-2xl mx-auto">
            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {uploadedImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="Upload" className="h-12 w-12 object-cover rounded border border-slate-600" />
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute -top-1 -right-1 h-4 w-4 p-0" 
                      onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="flex gap-1.5">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className={`h-8 w-8 p-0 ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </Button>
              <Input
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder={language === 'mm' ? 'စာရိုက်ပါ...' : 'Type message...'}
                disabled={isLoading}
                className="flex-1 h-8 bg-slate-800 border-slate-600"
              />
              {messages.length >= 2 && !isLoading && (
                <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={regenerateResponse}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button type="submit" size="sm" className="h-8 bg-gradient-to-r from-cyan-600 to-emerald-600" disabled={isLoading || !inputMessage.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {isRecording ? '🔴 Recording...' : `${currentProvider?.name || 'ZAI'} · Temp: ${temperature.toFixed(1)}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
