'use client'

import React, { useState } from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  Save, 
  FileDown, 
  Trash2, 
  Copy, 
  Bold, 
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react'

interface NotepadAppProps {
  windowId: string
}

export function NotepadApp({ windowId }: NotepadAppProps) {
  const { notepadContent, notepadFileName, setNotepadContent, setNotepadFileName, language } = useMyanOSStore()
  const [saved, setSaved] = useState(true)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotepadContent(e.target.value)
    setSaved(false)
  }

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem(`notepad_${notepadFileName}`, notepadContent)
    setSaved(true)
  }

  const handleDownload = () => {
    const blob = new Blob([notepadContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = notepadFileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setNotepadContent('')
    setSaved(true)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(notepadContent)
  }

  const insertText = (text: string) => {
    setNotepadContent(notepadContent + text)
    setSaved(false)
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 border-b border-slate-700 flex-wrap gap-1">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={notepadFileName}
            onChange={(e) => setNotepadFileName(e.target.value)}
            className="bg-transparent border-none text-sm text-slate-300 focus:outline-none w-32"
          />
          {!saved && <span className="text-xs text-orange-400">●</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={handleSave}
          >
            <Save className="w-3 h-3 mr-1" />
            {language === 'mm' ? 'သိမ်းမည်' : 'Save'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={handleDownload}
          >
            <FileDown className="w-3 h-3 mr-1" />
            {language === 'mm' ? 'ဒေါင်းလုဒ်' : 'Download'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={handleCopy}
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
            onClick={handleClear}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {language === 'mm' ? 'ရှင်းလင်း' : 'Clear'}
          </Button>
        </div>
      </div>

      {/* Quick Insert */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-900/50 border-b border-slate-700">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-slate-400 hover:text-white"
          onClick={() => insertText('**text**')}
        >
          <Bold className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-slate-400 hover:text-white"
          onClick={() => insertText('*text*')}
        >
          <Italic className="w-3 h-3" />
        </Button>
        <div className="w-px h-4 bg-slate-600 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-slate-400 hover:text-white"
          onClick={() => insertText('# ')}
        >
          H1
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-slate-400 hover:text-white"
          onClick={() => insertText('## ')}
        >
          H2
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-slate-400 hover:text-white"
          onClick={() => insertText('- ')}
        >
          List
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-slate-400 hover:text-white"
          onClick={() => insertText('```\n\n```')}
        >
          Code
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <textarea
          value={notepadContent}
          onChange={handleChange}
          placeholder={language === 'mm' ? 'ဤနေရာတွင် စာရိုက်ပါ...' : 'Start typing here...'}
          className="w-full h-full p-4 bg-slate-900 text-slate-200 font-mono text-sm resize-none focus:outline-none placeholder-slate-500"
          style={{ lineHeight: '1.6' }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>{notepadContent.split(/\s+/).filter(w => w).length} {language === 'mm' ? 'စကားလုံး' : 'words'}</span>
          <span>{notepadContent.length} {language === 'mm' ? 'စာလုံး' : 'characters'}</span>
        </div>
        <span>{notepadFileName}</span>
      </div>
    </div>
  )
}
