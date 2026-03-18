'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Loader2, Terminal as TerminalIcon, Trash2, CheckCircle, XCircle, 
  Settings, Wifi, WifiOff, ExternalLink 
} from 'lucide-react'

interface TerminalAppProps {
  windowId: string
}

// Terminal endpoints
const ENDPOINTS = {
  local: 'http://localhost:3001',
  termux: '', // User configurable
}

export function TerminalApp({ windowId: _windowId }: TerminalAppProps) {
  const [lines, setLines] = useState<Array<{ type: 'input' | 'output' | 'error'; content: string }>>([
    { type: 'output', content: `
╔══════════════════════════════════════════════════════════════╗
║           MyanOS Terminal v1.0 - Real Linux Shell            ║
║              တကယ့် Linux Terminal                            ║
╠══════════════════════════════════════════════════════════════╣
║  ✓ Execute Linux commands (ls, pwd, cat, etc.)              ║
║  ✓ Connect to Termux on Android via Cloudflare tunnel       ║
║  ✓ Run Node.js, Python, npm, pip commands                   ║
║  Type 'help' for available commands                         ║
╚══════════════════════════════════════════════════════════════╝
` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [connected, setConnected] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [endpoint, setEndpoint] = useState('')
  const [savedEndpoint, setSavedEndpoint] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load saved endpoint from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('myanos-terminal-endpoint')
    if (saved) {
      setSavedEndpoint(saved)
      setEndpoint(saved)
    }
  }, [])

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const url = savedEndpoint || '/api/terminal'
        const response = await fetch(`/api/terminal?endpoint=${encodeURIComponent(savedEndpoint || '')}`)
        const data = await response.json()
        setConnected(data.connected || data.status === 'online')
      } catch {
        setConnected(false)
      }
    }
    
    checkConnection()
    const interval = setInterval(checkConnection, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [savedEndpoint])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const saveEndpoint = () => {
    localStorage.setItem('myanos-terminal-endpoint', endpoint)
    setSavedEndpoint(endpoint)
    setShowSettings(false)
    setLines(prev => [...prev, { 
      type: 'output', 
      content: `✓ Terminal endpoint saved: ${endpoint || 'Local terminal'}` 
    }])
  }

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return

    setLines(prev => [...prev, { type: 'input', content: `$ ${cmd}` }])
    setCommandHistory(prev => [...prev, cmd])
    setHistoryIndex(-1)
    setLoading(true)

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: cmd,
          endpoint: savedEndpoint || undefined
        }),
      })
      const data = await response.json()
      
      if (data.output) {
        setLines(prev => [...prev, { type: 'output', content: data.output }])
      }
      if (data.error && !data.output) {
        setLines(prev => [...prev, { type: 'error', content: data.error }])
      }
      setConnected(response.ok)
    } catch (error: any) {
      setLines(prev => [...prev, { type: 'error', content: `❌ ${error.message || 'Terminal service not responding'}` }])
      setConnected(false)
    }

    setLoading(false)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      executeCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const cmds = ['ls', 'cd', 'cat', 'pwd', 'echo', 'mkdir', 'rm', 'cp', 'mv', 'grep', 'find', 'sudo', 'npm', 'node', 'python3', 'pip', 'git', 'clear', 'neofetch', 'htop']
      const matches = cmds.filter(c => c.startsWith(input))
      if (matches.length === 1) setInput(matches[0] + ' ')
      else if (matches.length > 1) setLines(prev => [...prev, { type: 'output', content: matches.join('  ') }])
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-green-400" />
          <span className="text-slate-300">bash</span>
          {connected ? (
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span className="text-[10px]">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3 h-3" />
              <span className="text-[10px]">Offline</span>
            </div>
          )}
          {savedEndpoint && (
            <div className="flex items-center gap-1 text-cyan-400">
              <ExternalLink className="w-3 h-3" />
              <span className="text-[10px]">Termux</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 px-1.5 text-xs text-slate-400 hover:text-white" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 px-1.5 text-xs text-slate-400 hover:text-white" 
            onClick={() => setLines([])}
          >
            <Trash2 className="w-3 h-3 mr-1" />Clear
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-2 bg-slate-800 border-b border-slate-700 space-y-2">
          <div className="text-[10px] text-slate-400 mb-1">
            🔗 Terminal Endpoint Configuration
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://your-tunnel.trycloudflare.com or leave empty for local"
              className="h-6 text-[10px] bg-slate-900 border-slate-600 text-white flex-1"
            />
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-500"
              onClick={saveEndpoint}
            >
              Save
            </Button>
          </div>
          <div className="text-[9px] text-slate-500">
            💡 For Termux: Use Cloudflare tunnel URL (e.g., https://xxx.trycloudflare.com)
          </div>
        </div>
      )}

      {/* Terminal Output */}
      <ScrollArea className="flex-1 p-2" ref={scrollRef}>
        <div className="space-y-0.5">
          {lines.map((line, i) => (
            <div 
              key={i} 
              className={`whitespace-pre-wrap break-all font-mono ${
                line.type === 'input' ? 'text-green-400' : 
                line.type === 'error' ? 'text-red-400' : 
                'text-slate-300'
              }`}
            >
              {line.content}
            </div>
          ))}
          {loading && (
            <div className="text-yellow-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />Executing...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-1.5 p-1.5 border-t border-slate-700 bg-slate-900/50">
        <span className="text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Running..." : "Type command..."}
          className="flex-1 bg-transparent border-none text-green-400 placeholder-slate-500 focus:outline-none"
          disabled={loading}
          autoFocus
        />
      </div>
    </div>
  )
}
