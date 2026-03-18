'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Save, FileDown, Trash2, Copy } from 'lucide-react'
import { useMyanOSStore } from '@/stores/myanos-store'

interface NotepadAppProps { windowId: string }

export function NotepadApp({ windowId: _windowId }: NotepadAppProps) {
  const { notepadContent, setNotepadContent, notepadFileName, setNotepadFileName, language } = useMyanOSStore()
  const [content, setContent] = useState(notepadContent)
  const [fileName, setFileName] = useState(notepadFileName)

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 border-b border-slate-700">
        <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="bg-transparent border-none text-xs text-slate-300 w-24" />
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" onClick={() => setNotepadContent(content)}><Save className="w-3 h-3 mr-0.5" />{language === 'mm' ? 'သိမ်းမည်' : 'Save'}</Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" onClick={handleDownload}><FileDown className="w-3 h-3 mr-0.5" />{language === 'mm' ? 'ဒေါင်းလုဒ်' : 'Download'}</Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" onClick={() => setContent('')}><Trash2 className="w-3 h-3 mr-0.5" />{language === 'mm' ? 'ရှင်းလင်း' : 'Clear'}</Button>
        </div>
      </div>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={language === 'mm' ? 'ဤနေရာတွင် စာရိုက်ပါ...' : 'Start typing...'} className="flex-1 p-2 bg-slate-900 text-slate-200 text-xs resize-none focus:outline-none placeholder-slate-500" style={{ lineHeight: '1.5' }} />
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 border-t border-slate-700 text-[10px] text-slate-500">
        <span>{content.split(/\s+/).filter(w => w).length} {language === 'mm' ? 'စကားလုံး' : 'words'}</span>
        <span>{content.length} {language === 'mm' ? 'စာလုံး' : 'chars'}</span>
      </div>
    </div>
  )
}
