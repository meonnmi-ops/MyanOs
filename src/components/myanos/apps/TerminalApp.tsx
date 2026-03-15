'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Terminal as TerminalIcon, Trash2 } from 'lucide-react'

interface TerminalAppProps {
  windowId: string
}

export function TerminalApp({ windowId }: TerminalAppProps) {
  const { 
    terminalHistory, 
    addTerminalLine, 
    clearTerminal, 
    terminalLoading,
    setTerminalLoading,
    terminalConnected,
    setTerminalConnected 
  } = useMyanOSStore()
  
  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [terminalHistory])

  useEffect(() => {
    // Initial welcome message
    if (terminalHistory.length === 0) {
      addTerminalLine('output', `
╔══════════════════════════════════════════════════════════════════╗
║                     MyanOS Terminal v1.0                          ║
║                   တကယ်အလုပ်လုပ်တဲ့ Terminal                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Real command execution via backend service                       ║
║  Type 'help' for available commands                               ║
╚══════════════════════════════════════════════════════════════════╝
`)
    }
  }, [])

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return

    addTerminalLine('input', `$ ${cmd}`)
    setCommandHistory(prev => [...prev, cmd])
    setHistoryIndex(-1)
    setTerminalLoading(true)

    try {
      const response = await fetch('/api/terminal?XTransformPort=3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      })

      const data = await response.json()
      
      if (data.output) {
        addTerminalLine('output', data.output)
      }
      if (data.error) {
        addTerminalLine('output', `Error: ${data.error}`)
      }
    } catch (error) {
      addTerminalLine('output', `Connection error: Terminal service not available`)
      addTerminalLine('output', `Please make sure the terminal backend is running on port 3001`)
    }

    setTerminalLoading(false)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !terminalLoading) {
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
      // Simple tab completion for common commands
      const commands = ['ls', 'cd', 'pwd', 'cat', 'echo', 'help', 'clear', 'whoami', 'date', 'uname']
      const matches = commands.filter(c => c.startsWith(input))
      if (matches.length === 1) {
        setInput(matches[0])
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 font-mono text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-green-400" />
          <span className="text-slate-300 text-xs">bash - MyanOS Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-slate-400 hover:text-white"
            onClick={clearTerminal}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Output */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-1">
          {terminalHistory.map((line, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap break-all ${
                line.type === 'input' 
                  ? 'text-green-400' 
                  : 'text-slate-300'
              }`}
            >
              {line.content}
            </div>
          ))}
          {terminalLoading && (
            <div className="text-yellow-400 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Executing...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 p-2 border-t border-slate-700 bg-slate-900/50">
        <span className="text-green-400">$</span>
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          className="flex-1 bg-transparent border-none text-green-400 placeholder-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono"
          disabled={terminalLoading}
        />
      </div>
    </div>
  )
}
