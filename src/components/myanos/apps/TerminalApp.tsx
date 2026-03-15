'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Terminal as TerminalIcon, Trash2, CheckCircle } from 'lucide-react'

interface TerminalAppProps {
  windowId: string
}

export function TerminalApp({ windowId: _windowId }: TerminalAppProps) {
  const [lines, setLines] = useState<Array<{ type: 'input' | 'output' | 'error'; content: string }>>([
    { type: 'output', content: `
╔══════════════════════════════════════════════════════════════╗
║           MyanOS Terminal v1.0 - Real Linux Shell            ║
║              တကယ့် Linux Terminal                            ║
╠══════════════════════════════════════════════════════════════╣
║  ✓ Execute Linux commands (ls, pwd, cat, etc.)              ║
║  ✓ Run Node.js, Python, npm, pip commands                   ║
║  ✓ Use Tab for autocomplete, ↑/↓ for history                ║
╚══════════════════════════════════════════════════════════════╝
` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const connected = true
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

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
        body: JSON.stringify({ command: cmd }),
      })
      const data = await response.json()
      
      if (data.output) {
        setLines(prev => [...prev, { type: 'output', content: data.output }])
      }
      if (data.error && !data.output) {
        setLines(prev => [...prev, { type: 'error', content: data.error }])
      }
    } catch {
      setLines(prev => [...prev, { type: 'error', content: '❌ Terminal service not responding' }])
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
      const cmds = ['ls', 'cd', 'cat', 'pwd', 'echo', 'mkdir', 'rm', 'cp', 'mv', 'grep', 'find', 'sudo', 'npm', 'node', 'python3', 'pip', 'git', 'clear']
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
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-green-400" />
          <span className="text-slate-300">bash</span>
          {connected && (
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3 h-3" />
              Connected
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-slate-400 hover:text-white" onClick={() => setLines([])}>
          <Trash2 className="w-3 h-3 mr-1" />Clear
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2" ref={scrollRef}>
        <div className="space-y-0.5">
          {lines.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap break-all ${line.type === 'input' ? 'text-green-400' : line.type === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
              {line.content}
            </div>
          ))}
          {loading && <div className="text-yellow-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Executing...</div>}
        </div>
      </ScrollArea>

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
