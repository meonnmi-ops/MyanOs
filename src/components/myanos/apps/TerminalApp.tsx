'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Loader2, Terminal as TerminalIcon, Trash2, 
  Settings, ExternalLink, Wifi, WifiOff,
  Copy, Download
} from 'lucide-react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { useToast } from '@/hooks/use-toast'

interface TerminalAppProps {
  windowId: string
}

interface TerminalLine {
  id: string
  type: 'input' | 'output' | 'error' | 'system'
  content: string
  timestamp: Date
}

export function TerminalApp({ windowId: _windowId }: TerminalAppProps) {
  const { language } = useMyanOSStore()
  const { toast } = useToast()
  
  const [lines, setLines] = useState<TerminalLine[]>([
    { 
      id: 'init', 
      type: 'system', 
      content: `
╔══════════════════════════════════════════════════════════════╗
║           MyanOS Terminal v2.0 - Web Terminal                 ║
║              ဝဘ် တာမီနယ် - ချိတ်ဆက်မလိုပါ                    ║
╠══════════════════════════════════════════════════════════════╣
║  ✓ Local commands (no connection needed)                     ║
║  ✓ Connect to Termux on Android via Cloudflare               ║
║  ✓ Custom terminal server support                             ║
║  Type 'help' for available commands                           ║
╚══════════════════════════════════════════════════════════════╝
`, 
      timestamp: new Date() 
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [connected, setConnected] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Initialize from localStorage
  const [endpoint, setEndpoint] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('myanos-terminal-endpoint') || ''
    }
    return ''
  })
  const [savedEndpoint] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('myanos-terminal-endpoint') || ''
    }
    return ''
  })
  const [cwd, setCwd] = useState('~')
  const [userName, setUserName] = useState('user')
  const [machineInfo, setMachineInfo] = useState<any>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(`/api/terminal?endpoint=${encodeURIComponent(savedEndpoint || '')}`)
      const data = await response.json()
      setConnected(data.connected || data.status === 'online')
      if (data.cwd) setCwd(data.cwd)
      if (data.user) setUserName(data.user)
      setMachineInfo(data)
    } catch {
      setConnected(false)
    }
  }, [savedEndpoint])

  useEffect(() => {
    // Initial connection check
    const doCheck = async () => {
      try {
        const response = await fetch(`/api/terminal?endpoint=${encodeURIComponent(savedEndpoint || '')}`)
        const data = await response.json()
        setConnected(data.connected || data.status === 'online')
        if (data.cwd) setCwd(data.cwd)
        if (data.user) setUserName(data.user)
        setMachineInfo(data)
      } catch {
        setConnected(false)
      }
    }
    doCheck()
    const interval = setInterval(doCheck, 15000)
    return () => clearInterval(interval)
  }, [savedEndpoint])

  // Focus input
  useEffect(() => {
    const handleClick = () => inputRef.current?.focus()
    terminalRef.current?.addEventListener('click', handleClick)
    return () => terminalRef.current?.removeEventListener('click', handleClick)
  }, [])

  const addLine = (type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      content,
      timestamp: new Date()
    }])
  }

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return

    addLine('input', `$ ${cmd}`)
    setCommandHistory(prev => [...prev, cmd])
    setHistoryIndex(-1)
    setLoading(true)

    try {
      // Try local commands first
      const localResult = executeLocalCommand(cmd)
      if (localResult !== null) {
        if (localResult) addLine('output', localResult)
        setLoading(false)
        setInput('')
        return
      }

      // Send to terminal service
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
        addLine('output', data.output)
      }
      if (data.error && !data.output) {
        addLine('error', data.error)
      }
      if (data.cwd) setCwd(data.cwd)
      setConnected(response.ok)
    } catch (error: any) {
      addLine('error', `❌ ${error.message || 'Terminal service not responding'}`)
      setConnected(false)
    }

    setLoading(false)
    setInput('')
  }

  // Local commands
  const executeLocalCommand = (cmd: string): string | null => {
    const trimmed = cmd.trim()
    
    if (trimmed === 'help') {
      return `
Available Commands:
═══════════════════════════════════════════════════════════
Local Commands (work without connection):
  help          - Show this help message
  clear         - Clear terminal screen
  version       - Show MyanOS version
  connect       - Connect to terminal server
  status        - Show connection status
  set <url>     - Set terminal endpoint URL
  reset         - Reset terminal settings

When Connected to Terminal Server:
  ls            - List files
  cd <dir>      - Change directory
  pwd           - Print working directory
  cat <file>    - Show file contents
  mkdir <dir>   - Create directory
  rm <file>     - Remove file
  Any Linux command will work!

Settings:
  Settings ⚙️ → Enter terminal URL → Save
  For Termux: Use Cloudflare tunnel URL
═══════════════════════════════════════════════════════════
`
    }

    if (trimmed === 'clear') {
      setLines([])
      return ''
    }

    if (trimmed === 'version' || trimmed === '-v') {
      return `MyanOS Terminal v2.0.0
Built with Next.js 16 + TypeScript
Terminal Service: ${connected ? '✅ Connected' : '❌ Not Connected'}
Endpoint: ${savedEndpoint || 'Local (default)'}`
    }

    if (trimmed === 'status') {
      return `Terminal Status:
  Connected: ${connected ? '✅ Yes' : '❌ No'}
  Endpoint: ${savedEndpoint || 'Local'}
  User: ${userName}
  CWD: ${cwd}
  Platform: ${machineInfo?.platform || 'Unknown'}`
    }

    if (trimmed.startsWith('set ')) {
      const url = trimmed.slice(4).trim()
      if (url) {
        localStorage.setItem('myanos-terminal-endpoint', url)
        setEndpoint(url)
        return `✅ Terminal endpoint set to: ${url}\nRefresh to apply changes.`
      }
      return 'Usage: set <url>'
    }

    if (trimmed === 'reset') {
      localStorage.removeItem('myanos-terminal-endpoint')
      setEndpoint('')
      return '✅ Terminal settings reset. Refresh to apply.'
    }

    if (trimmed === 'connect') {
      checkConnection()
      return 'Checking connection...'
    }

    return null
  }

  const saveEndpoint = () => {
    localStorage.setItem('myanos-terminal-endpoint', endpoint)
    setShowSettings(false)
    addLine('system', `✓ Terminal endpoint saved: ${endpoint || 'Local terminal'}`)
    checkConnection()
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
      const cmds = ['ls', 'cd', 'cat', 'pwd', 'echo', 'mkdir', 'rm', 'clear', 'help', 'status', 'version']
      const matches = cmds.filter(c => c.startsWith(input))
      if (matches.length === 1) setInput(matches[0] + ' ')
      else if (matches.length > 1) addLine('output', matches.join('  '))
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault()
      if (loading) {
        setLoading(false)
        addLine('system', '^C')
      }
    }
  }

  const copyOutput = () => {
    const text = lines.map(l => l.content).join('\n')
    navigator.clipboard.writeText(text)
    toast({ title: language === 'mm' ? 'ကူးပြီးပြီ' : 'Copied' })
  }

  const downloadLog = () => {
    const text = lines.map(l => `[${l.type}] ${l.content}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div 
      ref={terminalRef}
      className="h-full flex flex-col bg-slate-950 font-mono text-xs cursor-text"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-green-400" />
          <span className="text-slate-300">bash</span>
          {connected ? (
            <div className="flex items-center gap-1 text-green-400">
              <Wifi className="w-3 h-3" />
              <span className="text-[10px]">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400">
              <WifiOff className="w-3 h-3" />
              <span className="text-[10px]">Local</span>
            </div>
          )}
          {savedEndpoint && (
            <div className="flex items-center gap-1 text-cyan-400">
              <ExternalLink className="w-3 h-3" />
              <span className="text-[10px]">Remote</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-white" onClick={copyOutput}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-white" onClick={downloadLog}>
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-white" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-white" onClick={() => setLines([])}>
            <Trash2 className="w-3 h-3" />
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
            <Button size="sm" className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-500" onClick={saveEndpoint}>
              Save
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-5 px-1.5 text-[9px]" onClick={() => setEndpoint('')}>
              Local
            </Button>
            <Button variant="outline" size="sm" className="h-5 px-1.5 text-[9px]" onClick={() => setEndpoint('https://density-analysis-places-whole.trycloudflare.com')}>
              Termux (Your)
            </Button>
          </div>
          <div className="text-[9px] text-slate-500">
            💡 For Termux: cloudflared tunnel --url http://localhost:3001
          </div>
        </div>
      )}

      {/* Terminal Output */}
      <ScrollArea className="flex-1 p-2" ref={scrollRef}>
        <div className="space-y-0.5">
          {lines.map((line) => (
            <div 
              key={line.id} 
              className={`whitespace-pre-wrap break-all font-mono ${
                line.type === 'input' ? 'text-green-400' : 
                line.type === 'error' ? 'text-red-400' : 
                line.type === 'system' ? 'text-cyan-400' :
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
        <span className="text-green-400 text-xs">{userName}@myanos</span>
        <span className="text-slate-500">:</span>
        <span className="text-blue-400 text-xs">{cwd}</span>
        <span className="text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Running..." : "Type command..."}
          className="flex-1 bg-transparent border-none text-green-400 placeholder-slate-500 focus:outline-none text-xs"
          disabled={loading}
          autoFocus
        />
      </div>
    </div>
  )
}
